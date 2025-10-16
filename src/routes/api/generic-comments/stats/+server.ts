import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { genericCommentService } from '$lib/services/generic-comments'
import { logger } from '$lib/logger'

export const GET: RequestHandler = async () => {
  try {
    const stats = await genericCommentService.getCommentStats()

    return json({
      status: 'success',
      data: stats
    })
  } catch (error) {
    logger.error('Error in GET /api/generic-comments/stats:', error)
    return json({
      status: 'error',
      message: 'Failed to fetch comment statistics',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 })
  }
}
