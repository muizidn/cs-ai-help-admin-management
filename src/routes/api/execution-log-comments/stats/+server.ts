import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { executionLogCommentService } from '$lib/services/execution-log-comments'
import { logger } from '$lib/logger'

export const GET: RequestHandler = async () => {
  try {
    logger.info('GET /api/execution-log-comments/stats')

    const result = await executionLogCommentService.getCommentStats()

    if (result.status === 'success') {
      return json(result)
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error },
      'Error in GET /api/execution-log-comments/stats'
    )
    return json(
      {
        status: 'error',
        message: 'Internal server error',
        errors: ['Internal server error'],
      },
      { status: 500 }
    )
  }
}
