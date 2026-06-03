import { getDatabase } from "$lib/mongodb"
import { logger } from "$lib/logger"
import { redisClient } from "$lib/redis"
import { ObjectId } from "mongodb"
import type {
  PricingConfig,
  PricingUpdateInput,
  PricingGroupAssignment,
} from "$lib/types/pricing"

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string[]
}

export class PricingService {
  private readonly COLLECTION = "system_settings"
  private readonly ASSIGNMENT_COLLECTION = "pricing_group_assignments"
  private readonly REDIS_KEY_PREFIX = "system-settings:pricing"
  private readonly REDIS_TTL = 60 * 60 * 24 // 1 day

  private async getCollection() {
    const db = await getDatabase()
    return db.collection(this.COLLECTION)
  }

  private async getAssignmentCollection() {
    const db = await getDatabase()
    return db.collection(this.ASSIGNMENT_COLLECTION)
  }

  private async clearPricingCache() {
    try {
      await redisClient.deleteByPattern(`${this.REDIS_KEY_PREFIX}:*`)
    } catch (error) {
      logger.warn("Failed to clear pricing cache:", error as any)
    }
  }

  // Default configuration if none exists
  private getDefaultConfig(): PricingConfig {
    return {
      proPlan: {
        price: 299000,
        originalPrice: 499000,
        isDiscounted: true,
        credits: 1000,
        discountMultipliers: {},
        enabledDurations: [1, 3, 6, 12, 24],
        highlightDuration: 3,
        highlightBadge: "plans.best_value",
      },
      credits: {
        price: 1000,
        originalPrice: 1500,
        isDiscounted: true,
        discountMultipliers: {},
      },
      usageCosts: {
        inference: 1,
        simulation: 1,
        kbParsing: 1,
        datasourceExecution: 1,
      },
      updatedAt: new Date(),
      updatedBy: "system",
    }
  }

  async getGlobalPricingConfig(): Promise<ServiceResult<PricingConfig>> {
    const redisKey = `${this.REDIS_KEY_PREFIX}:global`

    try {
      // 1. Try Redis first
      try {
        const cached = await redisClient.get(redisKey)
        if (cached) {
          return { success: true, data: JSON.parse(cached) }
        }
      } catch (redisError) {
        logger.warn("Redis error fetching pricing config:", redisError as any)
      }

      // 2. Fallback to MongoDB
      const collection = await this.getCollection()
      const doc = await collection.findOne({ type: "pricing", isGlobal: true })

      let config: PricingConfig
      if (!doc) {
        config = this.getDefaultConfig()
        config.isGlobal = true
      } else {
        const { _id, type, ...rest } = doc
        config = {
          id: _id.toString(),
          ...(rest as any),
        }
      }

      // 3. Update Redis cache
      try {
        await redisClient.set(redisKey, JSON.stringify(config), this.REDIS_TTL)
      } catch (redisError) {
        logger.warn(
          "Redis error saving global pricing config:",
          redisError as any,
        )
      }

      return { success: true, data: config }
    } catch (error) {
      logger.error({ error }, "Failed to get global pricing config")
      return {
        success: false,
        error: ["Failed to retrieve global pricing config"],
      }
    }
  }

  async getPricingConfigs(): Promise<ServiceResult<PricingConfig[]>> {
    try {
      const collection = await this.getCollection()
      const docs = await collection
        .find({ type: "pricing" })
        .sort({ updatedAt: -1 })
        .toArray()

      const configs = docs.map((doc) => {
        const { _id, type, ...rest } = doc
        return {
          id: _id.toString(),
          ...(rest as any),
        } as PricingConfig
      })

      return { success: true, data: configs }
    } catch (error) {
      logger.error({ error }, "Failed to fetch pricing configs")
      return { success: false, error: ["Failed to fetch pricing configs"] }
    }
  }

  async getPricingConfigById(
    id: string,
  ): Promise<ServiceResult<PricingConfig>> {
    try {
      const collection = await this.getCollection()
      const doc = await collection.findOne({ _id: new ObjectId(id) })

      if (!doc) return { success: false, error: ["Config not found"] }

      const { _id, type, ...rest } = doc
      return {
        success: true,
        data: {
          id: _id.toString(),
          ...(rest as any),
        } as PricingConfig,
      }
    } catch (error) {
      logger.error({ error }, "Failed to fetch pricing config by ID")
      return { success: false, error: ["Error fetching config"] }
    }
  }

  async createPricingConfig(
    input: Partial<PricingConfig>,
    user: string,
  ): Promise<ServiceResult<PricingConfig>> {
    try {
      const collection = await this.getCollection()
      const config = {
        ...this.getDefaultConfig(),
        ...input,
        type: "pricing",
        isGlobal: false,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        updatedAt: new Date(),
        updatedBy: user,
      }

      const result = await collection.insertOne(config)
      return {
        success: true,
        data: {
          id: result.insertedId.toString(),
          ...config,
        } as any,
      }
    } catch (error) {
      logger.error({ error }, "Failed to create pricing config")
      return { success: false, error: ["Failed to create config"] }
    }
  }

  async updatePricingConfig(
    id: string | null,
    input: PricingUpdateInput,
    user: string,
  ): Promise<ServiceResult<PricingConfig>> {
    try {
      const collection = await this.getCollection()

      const filter = id
        ? { _id: new ObjectId(id) }
        : { type: "pricing", isGlobal: true }
      const doc = await collection.findOne(filter)

      const currentConfig = doc
        ? { ...doc }
        : { ...this.getDefaultConfig(), type: "pricing", isGlobal: true }

      const newConfig = {
        ...currentConfig,
        ...input,
        expiresAt: input.expiresAt
          ? new Date(input.expiresAt)
          : "expiresAt" in input
            ? null
            : currentConfig.expiresAt,
        proPlan: {
          ...(currentConfig as any).proPlan,
          ...(input.proPlan || {}),
        },
        credits: {
          ...(currentConfig as any).credits,
          ...(input.credits || {}),
        },
        usageCosts: {
          ...(currentConfig as any).usageCosts,
          ...(input.usageCosts || {}),
        },
        updatedAt: new Date(),
        updatedBy: user,
      }
      delete (newConfig as any)._id
      delete (newConfig as any).type

      await collection.updateOne(filter, { $set: newConfig }, { upsert: true })

      // Clear all pricing cache to ensure total consistency
      await this.clearPricingCache()

      return {
        success: true,
        data: { id: id || "global", ...newConfig } as any,
      }
    } catch (error) {
      logger.error({ error, id }, "Failed to update pricing config")
      return { success: false, error: ["Error updating pricing config"] }
    }
  }

  private async invalidateGroupCache(groupId: string) {
    try {
      const assignmentCollection = await this.getAssignmentCollection()
      const assignments = await assignmentCollection.find({ groupId }).toArray()
      for (const assignment of assignments) {
        const redisKey = `${this.REDIS_KEY_PREFIX}:${assignment.ownerId}`
        await redisClient.delete(redisKey)
      }
    } catch (error) {
      logger.warn("Failed to invalidate group cache:", error as any)
    }
  }

  async deletePricingConfig(id: string): Promise<ServiceResult<boolean>> {
    try {
      const collection = await this.getCollection()
      const config = await collection.findOne({ _id: new ObjectId(id) })

      if (config?.isGlobal)
        return { success: false, error: ["Cannot delete global pricing"] }

      const assignmentCollection = await this.getAssignmentCollection()
      await assignmentCollection.deleteMany({ groupId: id })

      await collection.deleteOne({ _id: new ObjectId(id) })

      // Clear all pricing cache
      await this.clearPricingCache()

      return { success: true, data: true }
    } catch (error) {
      logger.error({ error, id }, "Failed to delete pricing config")
      return { success: false, error: ["Failed to delete pricing config"] }
    }
  }

  // --- Association Methods ---

  async getGroupAssignments(
    groupId: string,
  ): Promise<ServiceResult<PricingGroupAssignment[]>> {
    try {
      const collection = await this.getAssignmentCollection()
      const docs = await collection.find({ groupId }).toArray()
      const assignments = docs.map((doc) => {
        const { _id, ...rest } = doc
        return { id: _id.toString(), ...(rest as any) }
      })
      return { success: true, data: assignments }
    } catch (error) {
      return { success: false, error: ["Failed to fetch group assignments"] }
    }
  }

  async assignOwnerToGroup(
    groupId: string,
    ownerId: string,
    ownerType: string,
    ownerName: string,
    user: string,
  ): Promise<ServiceResult<PricingGroupAssignment>> {
    try {
      const collection = await this.getAssignmentCollection()

      const existing = await collection.findOne({ ownerId })
      if (existing) {
        return {
          success: false,
          error: ["Owner is already assigned to a group"],
        }
      }

      const assignment = {
        groupId,
        ownerId,
        ownerType,
        ownerName,
        assignedAt: new Date(),
        assignedBy: user,
      }

      const result = await collection.insertOne(assignment)

      // Clear all pricing cache
      await this.clearPricingCache()

      return {
        success: true,
        data: {
          id: result.insertedId.toString(),
          ...assignment,
        } as any,
      }
    } catch (error) {
      return { success: false, error: ["Failed to assign owner to group"] }
    }
  }

  async removeOwnerFromGroup(id: string): Promise<ServiceResult<boolean>> {
    try {
      const collection = await this.getAssignmentCollection()
      const assignment = await collection.findOne({ _id: new ObjectId(id) })

      if (assignment) {
        await collection.deleteOne({ _id: new ObjectId(id) })
        // Clear all pricing cache
        await this.clearPricingCache()
      }

      return { success: true, data: true }
    } catch (error) {
      return { success: false, error: ["Failed to remove owner from group"] }
    }
  }

  async searchOwnersGroup(
    ownerId: string,
  ): Promise<ServiceResult<string | null>> {
    try {
      const collection = await this.getAssignmentCollection()
      const assignment = await collection.findOne({ ownerId })
      if (!assignment) return { success: true, data: null }

      const pricingCollection = await this.getCollection()
      const group = await pricingCollection.findOne({
        _id: new ObjectId(assignment.groupId),
      })

      return { success: true, data: group?.name || assignment.groupId }
    } catch (error) {
      return { success: false, error: ["Failed to search owner group"] }
    }
  }
}
