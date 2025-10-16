import { nanoid } from "nanoid"
import { getDatabase } from "$lib/mongodb"
import type {
  GenericComment,
  CreateGenericCommentRequest,
  UpdateGenericCommentRequest,
  GenericCommentQuery,
  GenericCommentStats,
  ReviewStatus,
} from "$lib/types/generic-comments"
import { logger } from "$lib/logger"

class GenericCommentService {
  private readonly collectionName = "generic-comments"

  async createComment(
    data: CreateGenericCommentRequest,
  ): Promise<GenericComment> {
    try {
      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const comment: GenericComment = {
        id: nanoid(),
        entityType: data.entityType,
        entityId: data.entityId,
        entityLogId: data.entityLogId,
        comment: data.comment,
        reviewStatus: data.reviewStatus,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "admin", // TODO: Get from session
      }

      await collection.insertOne(comment)
      logger.info(`Generic comment created: ${comment.id}`)

      return comment
    } catch (error) {
      logger.error("Error creating generic comment:", error)
      throw error
    }
  }

  async updateComment(
    id: string,
    data: UpdateGenericCommentRequest,
  ): Promise<GenericComment | null> {
    try {
      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const updateData: Partial<GenericComment> = {
        updatedAt: new Date(),
        updatedBy: "admin", // TODO: Get from session
      }

      if (data.comment !== undefined) {
        updateData.comment = data.comment
      }

      if (data.reviewStatus !== undefined) {
        updateData.reviewStatus = data.reviewStatus
      }

      const result = await collection.findOneAndUpdate(
        { id, isActive: true },
        { $set: updateData },
        { returnDocument: "after" },
      )

      if (result) {
        logger.info(`Generic comment updated: ${id}`)
        return result as GenericComment
      }

      return null
    } catch (error) {
      logger.error("Error updating generic comment:", error)
      throw error
    }
  }

  async getComments(
    query: GenericCommentQuery = {},
  ): Promise<{ items: GenericComment[]; total: number }> {
    try {
      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const filter: any = { isActive: true }

      if (query.entityType) {
        filter.entityType = query.entityType
      }

      if (query.entityId) {
        filter.entityId = query.entityId
      }

      if (query.entityLogId) {
        filter.entityLogId = query.entityLogId
      }

      if (query.reviewStatus) {
        filter.reviewStatus = query.reviewStatus
      }

      if (query.createdBy) {
        filter.createdBy = { $regex: query.createdBy, $options: "i" }
      }

      if (query.search) {
        filter.$or = [
          { comment: { $regex: query.search, $options: "i" } },
          { entityId: { $regex: query.search, $options: "i" } },
          { entityLogId: { $regex: query.search, $options: "i" } },
        ]
      }

      const page = query.page || 1
      const limit = query.limit || 20
      const skip = (page - 1) * limit

      const [items, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter),
      ])

      return {
        items: items as GenericComment[],
        total,
      }
    } catch (error) {
      logger.error("Error getting generic comments:", error)
      throw error
    }
  }

  async getCommentsByEntity(
    entityType: string,
    entityId: string,
    entityLogId?: string,
  ): Promise<GenericComment[]> {
    try {
      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const filter: any = {
        isActive: true,
        entityType,
        entityId,
      }

      if (entityLogId) {
        filter.entityLogId = entityLogId
      }

      const comments = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray()

      return comments as GenericComment[]
    } catch (error) {
      logger.error("Error getting comments by entity:", error)
      throw error
    }
  }

  async getCommentStats(): Promise<GenericCommentStats> {
    try {
      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const [total, statusStats, entityTypeStats, recentCount] =
        await Promise.all([
          collection.countDocuments({ isActive: true }),
          collection
            .aggregate([
              { $match: { isActive: true } },
              { $group: { _id: "$reviewStatus", count: { $sum: 1 } } },
            ])
            .toArray(),
          collection
            .aggregate([
              { $match: { isActive: true } },
              { $group: { _id: "$entityType", count: { $sum: 1 } } },
            ])
            .toArray(),
          collection.countDocuments({
            isActive: true,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          }),
        ])

      const byStatus: Record<ReviewStatus, number> = {
        NEEDS_REVIEW: 0,
        REVIEWED_GOOD: 0,
        REVIEWED_ISSUES: 0,
        REVIEWED_CRITICAL: 0,
      }

      statusStats.forEach((stat: any) => {
        if (stat._id in byStatus) {
          byStatus[stat._id as ReviewStatus] = stat.count
        }
      })

      const byEntityType: Record<string, number> = {}
      entityTypeStats.forEach((stat: any) => {
        byEntityType[stat._id] = stat.count
      })

      return {
        total,
        byStatus,
        byEntityType,
        recentCount,
      }
    } catch (error) {
      logger.error("Error getting comment stats:", error)
      throw error
    }
  }

  async deleteComment(id: string): Promise<boolean> {
    try {
      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const result = await collection.updateOne(
        { id, isActive: true },
        {
          $set: {
            isActive: false,
            deletedAt: new Date(),
            updatedBy: "admin", // TODO: Get from session
          },
        },
      )

      if (result.modifiedCount > 0) {
        logger.info(`Generic comment deleted: ${id}`)
        return true
      }

      return false
    } catch (error) {
      logger.error("Error deleting generic comment:", error)
      throw error
    }
  }
}

export const genericCommentService = new GenericCommentService()
