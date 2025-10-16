import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { executionLogCommentService } from '$lib/services/execution-log-comments'
import { logger } from '$lib/logger'

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { executionId } = params

    if (!executionId) {
      return json(
        {
          status: 'error',
          message: 'Execution ID is required',
          errors: ['Execution ID is required'],
        },
        { status: 400 }
      )
    }

    logger.info({ executionId }, 'GET /api/execution-log-comments/by-execution/[executionId]')

    const result = await executionLogCommentService.getCommentsByExecutionId(executionId)

    if (result.status === 'success') {
      return json(result)
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error, executionId: params.executionId },
      'Error in GET /api/execution-log-comments/by-execution/[executionId]'
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
