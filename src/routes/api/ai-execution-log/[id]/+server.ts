import { json, type RequestHandler } from '@sveltejs/kit'
import { getExecutionLogService } from '$lib/services/execution-logs'
import { logger } from '$lib/logger'

// GET /api/ai-execution-log/[id] - Get execution log details by ID
export const GET: RequestHandler = async ({ params, locals }) => {
  const requestId = locals.requestId || 'ai-execution-log-detail'
  const { id } = params
  
  if (!id) {
    return json(
      {
        status: 'error',
        message: 'Execution log ID is required',
        errors: ['Execution log ID is required']
      },
      { status: 400 }
    )
  }
  
  try {
    const service = await getExecutionLogService()
    
    logger.info({
      requestId,
      executionLogId: id,
      type: 'ai_execution_log_detail_request'
    }, 'Getting execution log details')
    
    const result = await service.getExecutionLogById(id)
    
    if (result.status === 'success') {
      logger.info({
        requestId,
        executionLogId: id,
        stepsCount: result.data?.steps.length,
        type: 'ai_execution_log_detail_success'
      }, 'Execution log details retrieved successfully')
      
      return json(result)
    } else {
      logger.error({
        requestId,
        executionLogId: id,
        errors: result.errors,
        type: 'ai_execution_log_detail_error'
      }, 'Failed to get execution log details')
      
      return json(result, { status: result.message === 'Execution log not found' ? 404 : 400 })
    }
  } catch (error) {
    logger.error({
      requestId,
      executionLogId: id,
      error: error instanceof Error ? error.message : error,
      type: 'ai_execution_log_detail_exception'
    }, 'Exception in GET /api/ai-execution-log/[id]')
    
    return json(
      {
        status: 'error',
        message: 'Internal server error',
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}
