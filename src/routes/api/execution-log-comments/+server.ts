import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { executionLogCommentService } from '$lib/services/execution-log-comments'
import { logger } from '$lib/logger'
import type { 
  CreateExecutionLogCommentRequest, 
  ExecutionLogCommentQuery 
} from '$lib/types/execution-log-comments'

export const GET: RequestHandler = async ({ url }) => {
  try {
    const searchParams = url.searchParams
    
    const query: ExecutionLogCommentQuery = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      executionLogId: searchParams.get('executionLogId') || undefined,
      executionId: searchParams.get('executionId') || undefined,
      reviewStatus: (searchParams.get('reviewStatus') as any) || 'all',
      createdBy: searchParams.get('createdBy') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'createdAt',
      sort_order: (searchParams.get('sort_order') as any) || 'desc',
    }

    logger.info({ query }, 'GET /api/execution-log-comments')

    const result = await executionLogCommentService.getComments(query)

    if (result.status === 'success') {
      return json(result)
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error },
      'Error in GET /api/execution-log-comments'
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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.executionLogId || !body.executionId || !body.comment || !body.reviewStatus) {
      return json(
        {
          status: 'error',
          message: 'Missing required fields',
          errors: ['executionLogId, executionId, comment, and reviewStatus are required'],
        },
        { status: 400 }
      )
    }

    // Validate reviewStatus
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

    const createRequest: CreateExecutionLogCommentRequest = {
      executionLogId: body.executionLogId,
      executionId: body.executionId,
      comment: body.comment,
      reviewStatus: body.reviewStatus,
    }

    // For now, use a default user. In a real app, this would come from authentication
    const createdBy = body.createdBy || 'admin'

    logger.info({ createRequest, createdBy }, 'POST /api/execution-log-comments')

    const result = await executionLogCommentService.createComment(createRequest, createdBy)

    if (result.status === 'success') {
      return json(result, { status: 201 })
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error },
      'Error in POST /api/execution-log-comments'
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
