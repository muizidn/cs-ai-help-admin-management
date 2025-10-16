import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { genericCommentService } from '$lib/services/generic-comments'
import type { UpdateGenericCommentRequest } from '$lib/types/generic-comments'
import { logger } from '$lib/logger'

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params
    const data: UpdateGenericCommentRequest = await request.json()

    // Validate review status if provided
    if (data.reviewStatus) {
      const validStatuses = ['NEEDS_REVIEW', 'REVIEWED_GOOD', 'REVIEWED_ISSUES', 'REVIEWED_CRITICAL']
      if (!validStatuses.includes(data.reviewStatus)) {
        return json({
          status: 'error',
          message: 'Invalid review status',
          errors: [`reviewStatus must be one of: ${validStatuses.join(', ')}`]
        }, { status: 400 })
      }
    }

    const comment = await genericCommentService.updateComment(id, data)

    if (!comment) {
      return json({
        status: 'error',
        message: 'Comment not found',
        errors: ['Comment with the specified ID does not exist or is inactive']
      }, { status: 404 })
    }

    return json({
      status: 'success',
      data: comment,
      message: 'Comment updated successfully'
    })
  } catch (error) {
    logger.error('Error in PUT /api/generic-comments/[id]:', error)
    return json({
      status: 'error',
      message: 'Failed to update comment',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 })
  }
}

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params
    const success = await genericCommentService.deleteComment(id)

    if (!success) {
      return json({
        status: 'error',
        message: 'Comment not found',
        errors: ['Comment with the specified ID does not exist or is already deleted']
      }, { status: 404 })
    }

    return json({
      status: 'success',
      message: 'Comment deleted successfully'
    })
  } catch (error) {
    logger.error('Error in DELETE /api/generic-comments/[id]:', error)
    return json({
      status: 'error',
      message: 'Failed to delete comment',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 })
  }
}
