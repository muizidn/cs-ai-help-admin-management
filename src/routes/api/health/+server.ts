import { json, type RequestHandler } from '@sveltejs/kit'
import { getDatabase } from '$lib/mongodb'
import { logger } from '$lib/logger'

export const GET: RequestHandler = async ({ locals }) => {
  const requestId = locals.requestId || 'health-check'

  try {
    // Check database connection
    const db = await getDatabase()
    if (!db) {
      throw new Error('Database connection failed')
    }
    await db.admin().ping()

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || 'unknown',
      services: {
        database: 'healthy',
        application: 'healthy'
      },
      uptime: process.uptime(),
      requestId
    }

    logger.info({
      requestId,
      type: 'health_check',
      status: 'success'
    }, 'Health check passed')

    return json(healthStatus, { status: 200 })

  } catch (error) {
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || 'unknown',
      services: {
        database: 'unhealthy',
        application: 'healthy'
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
      requestId
    }

    logger.error({
      requestId,
      type: 'health_check',
      status: 'failed',
      error: error instanceof Error ? error.message : String(error)
    }, 'Health check failed')

    return json(errorStatus, { status: 503 })
  }
}
