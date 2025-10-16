import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { genericCommentService } from '$lib/services/generic-comments'
import type { CreateGenericCommentRequest, GenericCommentQuery } from '$lib/types/generic-comments'
import { logger } from '$lib/logger'

export const GET: RequestHandler = async ({ url }) => {
  try {
    const query: GenericCommentQuery = {
      entityType: url.searchParams.get('entityType') || undefined,
      entityId: url.searchParams.get('entityId') || undefined,
      entityLogId: url.searchParams.get('entityLogId') || undefined,
      reviewStatus: url.searchParams.get('reviewStatus') as any || undefined,
      createdBy: url.searchParams.get('createdBy') || undefined,
      search: url.searchParams.get('search') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20')
    }

    const result = await genericCommentService.getComments(query)

    return json({
      status: 'success',
      data: result.items,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total: result.total,
        totalPages: Math.ceil(result.total / (query.limit || 20))
      }
    })
  } catch (error) {
    logger.error('Error in GET /api/generic-comments:', error)
    return json({
      status: 'error',
      message: 'Failed to fetch comments',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 })
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: CreateGenericCommentRequest = await request.json()

    // Validate required fields
    if (!data.entityType || !data.entityId || !data.comment) {
      return json({
        status: 'error',
        message: 'Missing required fields',
        errors: ['entityType, entityId, and comment are required']
      }, { status: 400 })
    }

    // Validate entity type
    if (!['execution-log', 'ai-response-feedback'].includes(data.entityType)) {
      return json({
        status: 'error',
        message: 'Invalid entity type',
        errors: ['entityType must be either "execution-log" or "ai-response-feedback"']
      }, { status: 400 })
    }

    // Validate review status
    const validStatuses = ['NEEDS_REVIEW', 'REVIEWED_GOOD', 'REVIEWED_ISSUES', 'REVIEWED_CRITICAL']
    if (data.reviewStatus && !validStatuses.includes(data.reviewStatus)) {
      return json({
        status: 'error',
        message: 'Invalid review status',
        errors: [`reviewStatus must be one of: ${validStatuses.join(', ')}`]
      }, { status: 400 })
    }

    const comment = await genericCommentService.createComment({
      ...data,
      reviewStatus: data.reviewStatus || 'NEEDS_REVIEW'
    })

    return json({
      status: 'success',
      data: comment,
      message: 'Comment created successfully'
    })
  } catch (error) {
    logger.error('Error in POST /api/generic-comments:', error)
    return json({
      status: 'error',
      message: 'Failed to create comment',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 })
  }
}
