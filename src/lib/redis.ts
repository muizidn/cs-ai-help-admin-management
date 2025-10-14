import { createClient, type RedisClientType } from 'redis'
import { getServerEnv } from './env'

class RedisClient {
  private client: RedisClientType | null = null
  private isConnected = false

  async connect(): Promise<void> {
    if (this.client && this.isConnected) {
      return // Already connected
    }

    const env = getServerEnv()
    
    try {
      // Try local Redis first if REDIS_URL is set
      if (env.REDIS_URL) {
        this.client = createClient({
          url: env.REDIS_URL
        })
        
        await this.client.connect()
        this.isConnected = true
        console.log(`✅ Connected to local Redis: ${env.REDIS_URL}`)
        return
      }

      // Fallback to Upstash if local Redis isn't configured
      if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
        // For Upstash, we'll use HTTP requests instead of Redis client
        // since the admin interface doesn't need real-time performance
        console.log(`✅ Using Upstash Redis REST API: ${env.UPSTASH_REDIS_REST_URL}`)
        this.isConnected = true
        return
      }

      throw new Error(
        'No Redis configuration found. Set REDIS_URL for local Redis or ' +
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for Upstash Redis.'
      )
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
      this.client = null
      this.isConnected = false
      console.log('✅ Redis disconnected')
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect()
    }
  }

  private async makeUpstashRequest(command: string[]): Promise<any> {
    const env = getServerEnv()
    
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis configuration not found')
    }

    const response = await fetch(env.UPSTASH_REDIS_REST_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    })

    if (!response.ok) {
      throw new Error(`Upstash request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.result
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnection()
    
    const env = getServerEnv()
    
    if (this.client && env.REDIS_URL) {
      // Use local Redis client
      return await this.client.get(key)
    } else if (env.UPSTASH_REDIS_REST_URL) {
      // Use Upstash REST API
      return await this.makeUpstashRequest(['GET', key])
    }
    
    throw new Error('No Redis connection available')
  }

  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    await this.ensureConnection()
    
    const env = getServerEnv()
    
    if (this.client && env.REDIS_URL) {
      // Use local Redis client
      if (expireSeconds) {
        await this.client.setEx(key, expireSeconds, value)
      } else {
        await this.client.set(key, value)
      }
    } else if (env.UPSTASH_REDIS_REST_URL) {
      // Use Upstash REST API
      if (expireSeconds) {
        await this.makeUpstashRequest(['SET', key, value, 'EX', expireSeconds.toString()])
      } else {
        await this.makeUpstashRequest(['SET', key, value])
      }
    } else {
      throw new Error('No Redis connection available')
    }
  }

  async delete(key: string): Promise<number> {
    await this.ensureConnection()
    
    const env = getServerEnv()
    
    if (this.client && env.REDIS_URL) {
      // Use local Redis client
      return await this.client.del(key)
    } else if (env.UPSTASH_REDIS_REST_URL) {
      // Use Upstash REST API
      return await this.makeUpstashRequest(['DEL', key])
    }
    
    throw new Error('No Redis connection available')
  }

  // AI-specific methods matching the ai-inference Redis client
  async getTechnicalSystemPrompt(locale: string = 'en'): Promise<string | null> {
    const key = `technical-system-prompt:default:${locale}`
    return await this.get(key)
  }

  async setTechnicalSystemPrompt(prompt: string, locale: string = 'en'): Promise<void> {
    const key = `technical-system-prompt:default:${locale}`
    await this.set(key, prompt)
  }

  async getAdminBehaviorSystemPrompt(locale: string = 'en'): Promise<string | null> {
    const key = `admin-behavior-system-prompt:default:${locale}`
    return await this.get(key)
  }

  async setAdminBehaviorSystemPrompt(prompt: string, locale: string = 'en'): Promise<void> {
    const key = `admin-behavior-system-prompt:default:${locale}`
    await this.set(key, prompt)
  }

  async getBusinessBehaviorSystemPrompt(businessId: string): Promise<string | null> {
    const key = `business-behavior-system-prompt:${businessId}`
    return await this.get(key)
  }

  async setBusinessBehaviorSystemPrompt(businessId: string, prompt: string, expireSeconds?: number): Promise<void> {
    const key = `business-behavior-system-prompt:${businessId}`
    await this.set(key, prompt, expireSeconds)
  }

  async deleteBusinessBehaviorSystemPrompt(businessId: string): Promise<boolean> {
    const key = `business-behavior-system-prompt:${businessId}`
    const result = await this.delete(key)
    return result > 0
  }
}

// Singleton instance
export const redisClient = new RedisClient()

export async function getRedisClient(): Promise<RedisClient> {
  await redisClient.connect()
  return redisClient
}
