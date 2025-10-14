import { json, type RequestHandler } from '@sveltejs/kit'
import { getExecutionLogService } from '$lib/services/execution-logs'
import { logger } from '$lib/logger'
import type { ExecutionLogQuery } from '$lib/types/execution-logs'

// GET /api/ai-execution-log/stats - Get execution log statistics
export const GET: RequestHandler = async ({ url, locals }) => {
  const requestId = locals.requestId || 'ai-execution-log-stats'
  
  try {
    const service = await getExecutionLogService()
    
    // Parse filter parameters
    const filter: Partial<ExecutionLogQuery> = {}
    
    const businessId = url.searchParams.get('business_id')
    if (businessId) filter.business_id = businessId
    
    const context = url.searchParams.get('context')
    if (context) filter.context = context
    
    const startDate = url.searchParams.get('start_date')
    if (startDate) filter.start_date = startDate
    
    const endDate = url.searchParams.get('end_date')
    if (endDate) filter.end_date = endDate
    
    logger.info({
      requestId,
      filter,
      type: 'ai_execution_log_stats_request'
    }, 'Getting execution log statistics')
    
    const result = await service.getExecutionLogStats(filter)
    
    if (result.status === 'success') {
      logger.info({
        requestId,
        stats: result.data,
        type: 'ai_execution_log_stats_success'
      }, 'Execution log statistics retrieved successfully')
      
      return json(result)
    } else {
      logger.error({
        requestId,
        errors: result.errors,
        type: 'ai_execution_log_stats_error'
      }, 'Failed to get execution log statistics')
      
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error({
      requestId,
      error: error instanceof Error ? error.message : error,
      type: 'ai_execution_log_stats_exception'
    }, 'Exception in GET /api/ai-execution-log/stats')
    
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
