import { json, type RequestHandler } from '@sveltejs/kit'
import { getExecutionLogService } from '$lib/services/execution-logs'
import { logger } from '$lib/logger'
import type { SystemPromptUpdate } from '$lib/types/execution-logs'

// GET /api/system-prompts-redis - Get system prompts from Redis
export const GET: RequestHandler = async ({ locals }) => {
  const requestId = locals.requestId || 'system-prompts-redis-get'
  
  try {
    const service = await getExecutionLogService()
    
    logger.info({
      requestId,
      type: 'system_prompts_redis_request'
    }, 'Getting system prompts from Redis')
    
    const result = await service.getSystemPrompts()
    
    if (result.status === 'success') {
      logger.info({
        requestId,
        count: result.data?.length,
        type: 'system_prompts_redis_success'
      }, 'System prompts retrieved successfully')
      
      return json(result)
    } else {
      logger.error({
        requestId,
        errors: result.errors,
        type: 'system_prompts_redis_error'
      }, 'Failed to get system prompts')
      
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error({
      requestId,
      error: error instanceof Error ? error.message : error,
      type: 'system_prompts_redis_exception'
    }, 'Exception in GET /api/system-prompts-redis')
    
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

// PUT /api/system-prompts-redis - Update system prompt in Redis
export const PUT: RequestHandler = async ({ request, locals }) => {
  const requestId = locals.requestId || 'system-prompts-redis-update'
  
  try {
    const service = await getExecutionLogService()
    const update: SystemPromptUpdate = await request.json()
    
    // Validate required fields
    if (!update.key || !update.content || !update.type) {
      return json(
        {
          status: 'error',
          message: 'Missing required fields: key, content, type',
          errors: ['Missing required fields: key, content, type']
        },
        { status: 400 }
      )
    }
    
    // Validate type-specific requirements
    if ((update.type === 'technical' || update.type === 'admin-behavior') && !update.locale) {
      return json(
        {
          status: 'error',
          message: 'Locale is required for technical and admin-behavior prompts',
          errors: ['Locale is required for technical and admin-behavior prompts']
        },
        { status: 400 }
      )
    }
    
    if (update.type === 'business-behavior' && !update.business_id) {
      return json(
        {
          status: 'error',
          message: 'Business ID is required for business-behavior prompts',
          errors: ['Business ID is required for business-behavior prompts']
        },
        { status: 400 }
      )
    }
    
    logger.info({
      requestId,
      key: update.key,
      type: update.type,
      contentLength: update.content.length,
      type: 'system_prompts_redis_update_request'
    }, 'Updating system prompt in Redis')
    
    const result = await service.updateSystemPrompt(update)
    
    if (result.status === 'success') {
      logger.info({
        requestId,
        key: update.key,
        type: 'system_prompts_redis_update_success'
      }, 'System prompt updated successfully')
      
      return json(result)
    } else {
      logger.error({
        requestId,
        key: update.key,
        errors: result.errors,
        type: 'system_prompts_redis_update_error'
      }, 'Failed to update system prompt')
      
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error({
      requestId,
      error: error instanceof Error ? error.message : error,
      type: 'system_prompts_redis_update_exception'
    }, 'Exception in PUT /api/system-prompts-redis')
    
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
