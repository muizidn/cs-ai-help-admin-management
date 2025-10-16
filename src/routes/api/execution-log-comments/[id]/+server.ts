import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { executionLogCommentService } from '$lib/services/execution-log-comments'
import { logger } from '$lib/logger'
import type { UpdateExecutionLogCommentRequest } from '$lib/types/execution-log-comments'

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params
    const body = await request.json()

    if (!id) {
      return json(
        {
          status: 'error',
          message: 'Comment ID is required',
          errors: ['Comment ID is required'],
        },
        { status: 400 }
      )
    }

    // Validate reviewStatus if provided
    if (body.reviewStatus) {
      const validStatuses = ['NEEDS_REVIEW', 'REVIEWED_GOOD', 'REVIEWED_ISSUES', 'REVIEWED_CRITICAL']
      if (!validStatuses.includes(body.reviewStatus)) {
        return json(
          {
            status: 'error',
            message: 'Invalid review status',
            errors: ['reviewStatus must be one of: ' + validStatuses.join(', ')],
          },
          { status: 400 }
        )
      }
    }

    const updateRequest: UpdateExecutionLogCommentRequest = {
      id,
      comment: body.comment,
      reviewStatus: body.reviewStatus,
    }

    // For now, use a default user. In a real app, this would come from authentication
    const updatedBy = body.updatedBy || 'admin'

    logger.info({ updateRequest, updatedBy }, 'PUT /api/execution-log-comments/[id]')

    const result = await executionLogCommentService.updateComment(updateRequest, updatedBy)

    if (result.status === 'success') {
      return json(result)
    } else {
      return json(result, { status: result.message === 'Comment not found' ? 404 : 400 })
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error, id: params.id },
      'Error in PUT /api/execution-log-comments/[id]'
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

export const DELETE: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params

    if (!id) {
      return json(
        {
          status: 'error',
          message: 'Comment ID is required',
          errors: ['Comment ID is required'],
        },
        { status: 400 }
      )
    }

    // Get deletedBy from request body or use default
    let deletedBy = 'admin'
    try {
      const body = await request.json()
      deletedBy = body.deletedBy || 'admin'
    } catch {
      // If no body or invalid JSON, use default
    }

    logger.info({ id, deletedBy }, 'DELETE /api/execution-log-comments/[id]')

    const result = await executionLogCommentService.deleteComment(id, deletedBy)

    if (result.status === 'success') {
      return json(result)
    } else {
      return json(result, { status: result.message === 'Comment not found' ? 404 : 400 })
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error, id: params.id },
      'Error in DELETE /api/execution-log-comments/[id]'
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
