import { json, type RequestHandler } from '@sveltejs/kit'
import { getExecutionLogService } from '$lib/services/execution-logs'
import { logger } from '$lib/logger'
import type { ExecutionLogQuery } from '$lib/types/execution-logs'

// GET /api/ai-execution-log - List execution logs with filtering and pagination
export const GET: RequestHandler = async ({ url, locals }) => {
  const requestId = locals.requestId || 'ai-execution-log-list'
  
  try {
    const service = await getExecutionLogService()
    
    // Parse query parameters
    const query: ExecutionLogQuery = {}
    
    const page = url.searchParams.get('page')
    if (page) query.page = parseInt(page, 10)
    
    const limit = url.searchParams.get('limit')
    if (limit) query.limit = parseInt(limit, 10)
    
    const search = url.searchParams.get('search')
    if (search) query.search = search
    
    const status = url.searchParams.get('status')
    if (status && ['running', 'completed', 'failed'].includes(status)) {
      query.status = status as 'running' | 'completed' | 'failed'
    }
    
    const context = url.searchParams.get('context')
    if (context) query.context = context
    
    const conversationId = url.searchParams.get('conversation_id')
    if (conversationId) query.conversation_id = conversationId
    
    const businessId = url.searchParams.get('business_id')
    if (businessId) query.business_id = businessId
    
    const startDate = url.searchParams.get('start_date')
    if (startDate) query.start_date = startDate
    
    const endDate = url.searchParams.get('end_date')
    if (endDate) query.end_date = endDate
    
    const sortBy = url.searchParams.get('sort_by')
    if (sortBy && ['start_time', 'end_time', 'total_duration_ms', 'created_at'].includes(sortBy)) {
      query.sort_by = sortBy as any
    }
    
    const sortOrder = url.searchParams.get('sort_order')
    if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
      query.sort_order = sortOrder as 'asc' | 'desc'
    }
    
    logger.info({
      requestId,
      query,
      type: 'ai_execution_log_list_request'
    }, 'Getting execution logs')
    
    const result = await service.getExecutionLogs(query)
    
    if (result.status === 'success') {
      logger.info({
        requestId,
        total: result.data?.total,
        page: result.data?.page,
        type: 'ai_execution_log_list_success'
      }, 'Execution logs retrieved successfully')
      
      return json(result)
    } else {
      logger.error({
        requestId,
        errors: result.errors,
        type: 'ai_execution_log_list_error'
      }, 'Failed to get execution logs')
      
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error({
      requestId,
      error: error instanceof Error ? error.message : error,
      type: 'ai_execution_log_list_exception'
    }, 'Exception in GET /api/ai-execution-log')
    
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
