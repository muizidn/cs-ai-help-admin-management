import { Collection, ObjectId } from "mongodb"
import { getDatabase } from "../mongodb"
import { logDbOperation } from "../logger"
import type {
  LibraryTemplate,
  LibraryTemplateCreateInput,
  LibraryTemplateUpdateInput,
  LibraryTemplateFilter,
  LibraryTemplateListResponse,
  LibraryTemplateStats
} from "../types/library-templates"

const COLLECTION_NAME = "library_templates"

export class LibraryTemplateRepository {
  private async getCollection(): Promise<Collection<LibraryTemplate>> {
    const db = await getDatabase()
    if (!db) {
      throw new Error("Database connection not available")
    }
    return db.collection<LibraryTemplate>(COLLECTION_NAME)
  }

  async findById(id: string): Promise<LibraryTemplate | null> {
    const start = Date.now()
    try {
      const collection = await this.getCollection()
      const result = await collection.findOne({ id })
      const duration = Date.now() - start
      logDbOperation('findById', COLLECTION_NAME, duration)
      return result
    } catch (error) {
      const duration = Date.now() - start
      logDbOperation('findById', COLLECTION_NAME, duration, error)
      throw error
    }
  }

  async findAll(filter: LibraryTemplateFilter = {}): Promise<LibraryTemplateListResponse> {
    try {
      const collection = await this.getCollection()
      const {
        type,
        category,
        tags,
        isActive = true,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        limit = 20,
        offset = 0
      } = filter

      // Build MongoDB filter
      const mongoFilter: any = { isActive }

      if (type) mongoFilter.type = type
      if (category) mongoFilter.category = category
      if (tags && tags.length > 0) {
        mongoFilter.tags = { $in: tags }
      }

      if (search) {
        mongoFilter.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $regex: search, $options: "i" } }
        ]
      }

      // Build sort
      const sort: any = {}
      sort[sortBy] = sortOrder === "asc" ? 1 : -1

      // Execute query
      const [items, total] = await Promise.all([
        collection
          .find(mongoFilter)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .toArray(),
        collection.countDocuments(mongoFilter)
      ])

      return {
        items,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    } catch (error) {
      console.error("Error finding library templates:", error)
      throw error
    }
  }

  async create(data: LibraryTemplateCreateInput): Promise<LibraryTemplate> {
    const start = Date.now()
    try {
      const collection = await this.getCollection()
      const now = new Date()
      const id = new ObjectId().toString()

      const template: LibraryTemplate = {
        ...data,
        id,
        isActive: true,
        downloadCount: 0,
        rating: 0,
        createdAt: now,
        updatedAt: now,
        version: data.version || "1.0.0",
        createdBy: "system" // TODO: Get from auth context
      }

      await collection.insertOne(template)
      const duration = Date.now() - start
      logDbOperation('create', COLLECTION_NAME, duration)
      return template
    } catch (error) {
      const duration = Date.now() - start
      logDbOperation('create', COLLECTION_NAME, duration, error)
      throw error
    }
  }

  async update(id: string, data: LibraryTemplateUpdateInput): Promise<LibraryTemplate | null> {
    try {
      const collection = await this.getCollection()
      const updateData = {
        ...data,
        updatedAt: new Date()
      }

      const result = await collection.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: "after" }
      )

      return result || null
    } catch (error) {
      console.error("Error updating library template:", error)
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const collection = await this.getCollection()
      const result = await collection.deleteOne({ id })
      return result.deletedCount > 0
    } catch (error) {
      console.error("Error deleting library template:", error)
      throw error
    }
  }

  async incrementDownloadCount(id: string): Promise<void> {
    try {
      const collection = await this.getCollection()
      await collection.updateOne(
        { id },
        { $inc: { downloadCount: 1 } }
      )
    } catch (error) {
      console.error("Error incrementing download count:", error)
      throw error
    }
  }

  async updateRating(id: string, rating: number): Promise<void> {
    try {
      const collection = await this.getCollection()
      await collection.updateOne(
        { id },
        { $set: { rating, updatedAt: new Date() } }
      )
    } catch (error) {
      console.error("Error updating rating:", error)
      throw error
    }
  }

  async getStats(): Promise<LibraryTemplateStats> {
    try {
      const collection = await this.getCollection()

      const [
        totalCount,
        activeCount,
        inactiveCount,
        typeStats,
        categoryStats,
        downloadStats,
        ratingStats
      ] = await Promise.all([
        collection.countDocuments({}),
        collection.countDocuments({ isActive: true }),
        collection.countDocuments({ isActive: false }),
        collection.aggregate([
          { $group: { _id: "$type", count: { $sum: 1 } } }
        ]).toArray(),
        collection.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } }
        ]).toArray(),
        collection.aggregate([
          { $group: { _id: null, total: { $sum: "$downloadCount" } } }
        ]).toArray(),
        collection.aggregate([
          { $group: { _id: null, average: { $avg: "$rating" } } }
        ]).toArray()
      ])

      const byType: any = {}
      typeStats.forEach((stat: any) => {
        byType[stat._id] = stat.count
      })

      const byCategory: any = {}
      categoryStats.forEach((stat: any) => {
        byCategory[stat._id] = stat.count
      })

      return {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        byType,
        byCategory,
        totalDownloads: downloadStats[0]?.total || 0,
        averageRating: ratingStats[0]?.average || 0
      }
    } catch (error) {
      console.error("Error getting library template stats:", error)
      throw error
    }
  }

  async search(query: string, limit: number = 20): Promise<LibraryTemplate[]> {
    try {
      const collection = await this.getCollection()

      const searchFilter = {
        isActive: true,
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { tags: { $regex: query, $options: "i" } },
          { "metadata.keywords": { $regex: query, $options: "i" } }
        ]
      }

      const results = await collection
        .find(searchFilter)
        .sort({ downloadCount: -1, rating: -1 })
        .limit(limit)
        .toArray()

      return results
    } catch (error) {
      console.error("Error searching library templates:", error)
      throw error
    }
  }
}

// Singleton instance
export const libraryTemplateRepository = new LibraryTemplateRepository()
