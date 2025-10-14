import { json, type RequestHandler } from '@sveltejs/kit'
import { getDatabase } from '$lib/mongodb'
import { getRedisClient } from '$lib/redis'
import { logger } from '$lib/logger'

// GET /api/test-connections - Test MongoDB and Redis connections
export const GET: RequestHandler = async ({ locals }) => {
  const requestId = locals.requestId || 'test-connections'
  
  const results = {
    mongodb: { status: 'unknown', message: '', error: null },
    redis: { status: 'unknown', message: '', error: null },
    ai_inference_collection: { status: 'unknown', message: '', count: 0, error: null }
  }
  
  // Test MongoDB connection
  try {
    const db = await getDatabase()
    if (db) {
      await db.admin().ping()
      results.mongodb = {
        status: 'connected',
        message: 'MongoDB connection successful',
        error: null
      }
      
      // Test AI inference collection access
      try {
        const collection = db.collection('ai_inference_engine_execution_logs')
        const count = await collection.countDocuments({})
        results.ai_inference_collection = {
          status: 'accessible',
          message: `AI inference collection accessible with ${count} documents`,
          count,
          error: null
        }
      } catch (collectionError) {
        results.ai_inference_collection = {
          status: 'error',
          message: 'Failed to access AI inference collection',
          count: 0,
          error: collectionError instanceof Error ? collectionError.message : 'Unknown error'
        }
      }
    } else {
      results.mongodb = {
        status: 'error',
        message: 'Failed to get database instance',
        error: 'Database instance is null'
      }
    }
  } catch (error) {
    results.mongodb = {
      status: 'error',
      message: 'MongoDB connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Test Redis connection
  try {
    const redisClient = await getRedisClient()
    
    // Try to get a test key
    const testValue = await redisClient.get('test-connection-key')
    
    // Try to set and get a test value
    await redisClient.set('admin-test-key', 'test-value', 60) // 60 seconds expiry
    const retrievedValue = await redisClient.get('admin-test-key')
    
    if (retrievedValue === 'test-value') {
      results.redis = {
        status: 'connected',
        message: 'Redis connection successful - can read and write',
        error: null
      }
    } else {
      results.redis = {
        status: 'partial',
        message: 'Redis connected but read/write test failed',
        error: 'Retrieved value does not match set value'
      }
    }
  } catch (error) {
    results.redis = {
      status: 'error',
      message: 'Redis connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Determine overall status
  const overallStatus = 
    results.mongodb.status === 'connected' && 
    results.redis.status === 'connected' && 
    results.ai_inference_collection.status === 'accessible'
      ? 'healthy'
      : 'degraded'
  
  logger.info({
    requestId,
    results,
    overallStatus,
    type: 'connection_test'
  }, 'Connection test completed')
  
  return json({
    status: 'success',
    data: {
      overall_status: overallStatus,
      timestamp: new Date().toISOString(),
      connections: results
    }
  })
}
