import pino from "pino"
import { dev } from "$app/environment"

// Create logger instance with different configurations for dev/prod
export const logger = pino({
  level: dev ? "debug" : "info",
  transport: dev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: dev ? "development" : "production",
    service: "admin-management",
  },
})

// Helper function to create child loggers with context
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context)
}

// Helper function to log API requests
export function logApiRequest(
  method: string,
  url: string,
  statusCode?: number,
  duration?: number,
  error?: any,
) {
  const logData = {
    method,
    url,
    statusCode,
    duration,
    type: "api_request",
  }

  if (error) {
    logger.error(
      { ...logData, error: error.message || error },
      `API ${method} ${url} failed`,
    )
  } else if (statusCode && statusCode >= 400) {
    logger.warn(logData, `API ${method} ${url} returned ${statusCode}`)
  } else {
    logger.info(logData, `API ${method} ${url} completed`)
  }
}

// Helper function to log database operations
export function logDbOperation(
  operation: string,
  collection: string,
  duration?: number,
  error?: any,
) {
  const logData = {
    operation,
    collection,
    duration,
    type: "db_operation",
  }

  if (error) {
    logger.error(
      { ...logData, error: error.message || error },
      `DB ${operation} on ${collection} failed`,
    )
  } else {
    logger.debug(logData, `DB ${operation} on ${collection} completed`)
  }
}

// Helper function to log application events
export function logAppEvent(event: string, data?: Record<string, any>) {
  logger.info({ event, ...data, type: "app_event" }, `App event: ${event}`)
}

// Helper function to log build/rebuild events
export function logBuildEvent(
  event: "build_start" | "build_complete" | "rebuild_triggered",
  data?: Record<string, any>,
) {
  logger.info({ event, ...data, type: "build_event" }, `Build event: ${event}`)
}
