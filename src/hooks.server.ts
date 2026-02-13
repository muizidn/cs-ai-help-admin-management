import type { Handle, HandleServerError } from '@sveltejs/kit'
import { logger, logApiRequest, logAppEvent } from '$lib/logger'
import { sequence } from '@sveltejs/kit/hooks'
import { redirect } from '@sveltejs/kit'

// Hook to check authentication
const authHook: Handle = async ({ event, resolve }) => {
  const { url, cookies } = event
  const isLoginPage = url.pathname === '/login'
  const isApiRoute = url.pathname.startsWith('/api')
  const sessionCookie = cookies.get('admin_session')

  // Allow access to login page
  if (isLoginPage) {
    // If already logged in, redirect to home (handled in +page.server.ts load function too, but good as backup)
    if (sessionCookie) {
      throw redirect(303, '/')
    }
    return resolve(event)
  }

  // Protect all other routes
  if (!sessionCookie) {
    // For API routes, return 401
    if (isApiRoute) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // For page routes, redirect to login
    throw redirect(303, '/login')
  }

  return resolve(event)
}

// Hook to log all API requests
const loggingHook: Handle = async ({ event, resolve }) => {
  const start = Date.now()
  const { method, url } = event.request
  const pathname = event.url.pathname

  // Create request ID for tracing
  const requestId = crypto.randomUUID()

  // Add request ID to event locals for use in API routes
  event.locals.requestId = requestId

  // Log incoming request
  logger.info({
    requestId,
    method,
    pathname,
    userAgent: event.request.headers.get('user-agent'),
    type: 'request_start'
  }, `${method} ${pathname} - Request started`)

  try {
    // Resolve the request
    const response = await resolve(event)
    const duration = Date.now() - start

    // Log API requests (routes starting with /api/)
    if (pathname.startsWith('/api/')) {
      // Don't log if it's just a 401 from authHook (already handled or not needed to log as success)
      if (response.status !== 401) {
        logApiRequest(method, pathname, response.status, duration)
      }
    }

    // Log general request completion
    logger.info({
      requestId,
      method,
      pathname,
      statusCode: response.status,
      duration,
      type: 'request_complete'
    }, `${method} ${pathname} - ${response.status} (${duration}ms)`)

    return response
  } catch (error) {
    const duration = Date.now() - start

    // Log API request errors
    if (pathname.startsWith('/api/')) {
      logApiRequest(method, pathname, 500, duration, error)
    }

    // Log general request errors
    logger.error({
      requestId,
      method,
      pathname,
      duration,
      error: error instanceof Error ? error.message : String(error),
      type: 'request_error'
    }, `${method} ${pathname} - Request failed (${duration}ms)`)

    throw error
  }
}

// Hook to log application startup
const startupHook: Handle = async ({ event, resolve }) => {
  // Log app startup (only once)
  if (!global.__app_started) {
    logAppEvent('application_startup', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
    global.__app_started = true
  }

  return resolve(event)
}

// Error handling hook
export const handleError: HandleServerError = ({ error, event }) => {
  const requestId = event.locals?.requestId || 'unknown'

  // Don't log 404s or redirects as errors
  if (error instanceof Error && (error.message.includes('Not found') || error.message.includes('Redirect'))) {
    return;
  }

  logger.error({
    requestId,
    method: event.request.method,
    pathname: event.url.pathname,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : String(error),
    type: 'unhandled_error'
  }, 'Unhandled server error')

  // Return a generic error message to the client
  return {
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  }
}

// Combine all hooks - Auth first, then others
export const handle = sequence(startupHook, authHook, loggingHook)

// Extend global type for startup tracking
declare global {
  var __app_started: boolean | undefined
}
