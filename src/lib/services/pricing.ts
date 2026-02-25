import { getDatabase } from "$lib/mongodb"
import { logger } from "$lib/logger"
import { redisClient } from "$lib/redis"
import type {
    PricingConfig,
    PricingUpdateInput
} from "$lib/types/pricing"
import type { ApiResponse } from "$lib/types/transactions"

export class PricingService {
    private readonly REDIS_KEY = "system-settings:pricing"

    private async getCollection() {
        const db = await getDatabase()
        return db.collection("system_settings")
    }

    // Default configuration if none exists
    private getDefaultConfig(): PricingConfig {
        return {
            proPlan: {
                originalPrice: 499000,
                currentPrice: 299000
            },
            credits: {
                pricePerCredit: 1000,
                originalPricePerCredit: 1500
            },
            usageCosts: {
                inference: 1,
                simulation: 1,
                kbParsing: 1
            },
            updatedAt: new Date(),
            updatedBy: "system"
        }
    }

    async getPricingConfig(): Promise<ApiResponse<PricingConfig>> {
        try {
            // 1. Try Redis first
            try {
                const cached = await redisClient.get(this.REDIS_KEY)
                if (cached) {
                    return {
                        success: true,
                        data: JSON.parse(cached) as PricingConfig
                    }
                }
            } catch (redisError) {
                logger.warn("Redis error fetching pricing config:", redisError as any)
            }

            // 2. Fallback to MongoDB
            const collection = await this.getCollection()
            const doc = await collection.findOne({ type: "pricing" })

            let config: PricingConfig
            if (!doc) {
                config = this.getDefaultConfig()
            } else {
                const { _id, type, ...rest } = doc
                config = rest as PricingConfig
            }

            // 3. Update Redis cache for next time
            try {
                await redisClient.set(this.REDIS_KEY, JSON.stringify(config))
            } catch (redisError) {
                logger.warn("Redis error saving pricing config:", redisError as any)
            }

            return {
                success: true,
                data: config
            }
        } catch (error) {
            logger.error("Error getting pricing config:", error as any)
            return {
                success: false,
                error: ["Failed to retrieve pricing configuration"]
            }
        }
    }

    async updatePricingConfig(
        data: PricingUpdateInput,
        updatedBy: string = "admin"
    ): Promise<ApiResponse<PricingConfig>> {
        try {
            const collection = await this.getCollection()

            // Get current config to merge
            const currentResult = await this.getPricingConfig()
            const current = currentResult.data || this.getDefaultConfig()

            const newConfig: PricingConfig = {
                proPlan: { ...current.proPlan, ...data.proPlan },
                credits: { ...current.credits, ...data.credits },
                usageCosts: { ...current.usageCosts, ...data.usageCosts },
                updatedAt: new Date(),
                updatedBy
            }

            await collection.updateOne(
                { type: "pricing" },
                {
                    $set: {
                        ...newConfig,
                        type: "pricing"
                    }
                },
                { upsert: true }
            )

            // Update Redis cache
            try {
                await redisClient.set(this.REDIS_KEY, JSON.stringify(newConfig))
            } catch (redisError) {
                logger.warn("Redis error updating pricing config:", redisError as any)
            }

            return {
                success: true,
                data: newConfig
            }
        } catch (error) {
            logger.error("Error updating pricing config:", error as any)
            return {
                success: false,
                error: ["Failed to update pricing configuration"]
            }
        }
    }
}
