// MongoDB System Prompts Repository Implementation

import { MongoClient, Db, Collection, ObjectId } from "mongodb"
import type {
  SystemPrompt,
  SystemPromptCreateInput,
  SystemPromptUpdateInput,
  SystemPromptFilter,
  SystemPromptListResponse,
  SystemPromptStats,
  SystemPromptType,
} from "../types/system-prompts"
import type { SystemPromptsRepository } from "./system-prompts-repository"

interface SystemPromptDocument {
  _id?: ObjectId
  title: string
  description: string
  query: string
  content: string
  type: SystemPromptType
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
  tags?: string[]
  priority?: number
}

export class MongoDBSystemPromptsRepository implements SystemPromptsRepository {
  private collection: Collection<SystemPromptDocument>

  constructor(db: Db) {
    this.collection = db.collection<SystemPromptDocument>("system_prompts")
    this.ensureIndexes()
  }

  private async ensureIndexes(): Promise<void> {
    try {
      await this.collection.createIndexes([
        { key: { title: 1 }, unique: true },
        { key: { type: 1 } },
        { key: { isActive: 1 } },
        { key: { tags: 1 } },
        { key: { createdAt: -1 } },
        { key: { updatedAt: -1 } },
        { key: { priority: -1 } },
        { key: { title: "text", description: "text", content: "text" } },
      ])
    } catch (error) {
      console.error("Failed to create indexes:", error)
    }
  }

  private documentToSystemPrompt(doc: SystemPromptDocument): SystemPrompt {
    return {
      id: doc._id!.toString(),
      title: doc.title,
      description: doc.description,
      query: doc.query,
      content: doc.content,
      type: doc.type,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
      tags: doc.tags || [],
      priority: doc.priority || 0,
    }
  }

  private buildFilter(filter?: SystemPromptFilter) {
    const mongoFilter: any = {}

    if (filter?.type) {
      mongoFilter.type = filter.type
    }

    if (filter?.isActive !== undefined) {
      mongoFilter.isActive = filter.isActive
    }

    if (filter?.tags && filter.tags.length > 0) {
      mongoFilter.tags = { $in: filter.tags }
    }

    if (filter?.search) {
      mongoFilter.$text = { $search: filter.search }
    }

    return mongoFilter
  }

  private buildSort(filter?: SystemPromptFilter) {
    const sortBy = filter?.sortBy || "updatedAt"
    const sortOrder = filter?.sortOrder === "asc" ? 1 : -1
    return { [sortBy]: sortOrder }
  }

  async create(input: SystemPromptCreateInput): Promise<SystemPrompt> {
    const now = new Date()
    const doc: SystemPromptDocument = {
      title: input.title,
      description: input.description,
      query: input.query,
      content: input.content,
      type: input.type,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      tags: input.tags || [],
      priority: input.priority || 0,
    }

    const result = await this.collection.insertOne(doc)
    const created = await this.collection.findOne({ _id: result.insertedId })

    if (!created) {
      throw new Error("Failed to create system prompt")
    }

    return this.documentToSystemPrompt(created)
  }

  async findById(id: string): Promise<SystemPrompt | null> {
    try {
      const doc = await this.collection.findOne({ _id: new ObjectId(id) })
      return doc ? this.documentToSystemPrompt(doc) : null
    } catch (error) {
      return null
    }
  }

  async findAll(
    filter?: SystemPromptFilter,
  ): Promise<SystemPromptListResponse> {
    const mongoFilter = this.buildFilter(filter)
    const sort = this.buildSort(filter)
    const limit = filter?.limit || 50
    const offset = filter?.offset || 0

    const [items, total] = await Promise.all([
      this.collection
        .find(mongoFilter)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(mongoFilter),
    ])

    return {
      items: items.map((doc) => this.documentToSystemPrompt(doc)),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    }
  }

  async update(
    id: string,
    input: SystemPromptUpdateInput,
  ): Promise<SystemPrompt | null> {
    try {
      const updateDoc: any = {
        ...input,
        updatedAt: new Date(),
      }

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateDoc },
        { returnDocument: "after" },
      )

      return result ? this.documentToSystemPrompt(result) : null
    } catch (error) {
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(id) })
      return result.deletedCount > 0
    } catch (error) {
      return false
    }
  }

  async bulkCreate(inputs: SystemPromptCreateInput[]): Promise<SystemPrompt[]> {
    const now = new Date()
    const docs: SystemPromptDocument[] = inputs.map((input) => ({
      title: input.title,
      description: input.description,
      query: input.query,
      content: input.content,
      type: input.type,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      tags: input.tags || [],
      priority: input.priority || 0,
    }))

    const result = await this.collection.insertMany(docs)
    const created = await this.collection
      .find({ _id: { $in: Object.values(result.insertedIds) } })
      .toArray()

    return created.map((doc) => this.documentToSystemPrompt(doc))
  }

  async bulkUpdate(
    updates: Array<{ id: string; input: SystemPromptUpdateInput }>,
  ): Promise<SystemPrompt[]> {
    const operations = updates.map(({ id, input }) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { ...input, updatedAt: new Date() } },
      },
    }))

    await this.collection.bulkWrite(operations)

    const ids = updates.map((u) => new ObjectId(u.id))
    const updated = await this.collection.find({ _id: { $in: ids } }).toArray()

    return updated.map((doc) => this.documentToSystemPrompt(doc))
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const objectIds = ids.map((id) => new ObjectId(id))
    const result = await this.collection.deleteMany({ _id: { $in: objectIds } })
    return result.deletedCount
  }

  async bulkToggleActive(ids: string[], isActive: boolean): Promise<number> {
    const objectIds = ids.map((id) => new ObjectId(id))
    const result = await this.collection.updateMany(
      { _id: { $in: objectIds } },
      { $set: { isActive, updatedAt: new Date() } },
    )
    return result.modifiedCount
  }

  async findByType(type: string, isActive?: boolean): Promise<SystemPrompt[]> {
    const filter: any = { type }
    if (isActive !== undefined) {
      filter.isActive = isActive
    }

    const docs = await this.collection
      .find(filter)
      .sort({ priority: -1, updatedAt: -1 })
      .toArray()
    return docs.map((doc) => this.documentToSystemPrompt(doc))
  }

  async findByTags(
    tags: string[],
    isActive?: boolean,
  ): Promise<SystemPrompt[]> {
    const filter: any = { tags: { $in: tags } }
    if (isActive !== undefined) {
      filter.isActive = isActive
    }

    const docs = await this.collection
      .find(filter)
      .sort({ priority: -1, updatedAt: -1 })
      .toArray()
    return docs.map((doc) => this.documentToSystemPrompt(doc))
  }

  async search(
    query: string,
    filter?: SystemPromptFilter,
  ): Promise<SystemPromptListResponse> {
    const searchFilter = { ...filter, search: query }
    return this.findAll(searchFilter)
  }

  async getStats(): Promise<SystemPromptStats> {
    const pipeline = [
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
          inactive: { $sum: { $cond: ["$isActive", 0, 1] } },
        },
      },
    ]

    const typesPipeline = [
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]

    const [statsResult, typesResult] = await Promise.all([
      this.collection.aggregate(pipeline).toArray(),
      this.collection.aggregate(typesPipeline).toArray(),
    ])

    const stats = statsResult[0] || { total: 0, active: 0, inactive: 0 }
    const byType = typesResult.reduce(
      (acc, item) => {
        acc[item._id] = item.count
        return acc
      },
      {} as Record<SystemPromptType, number>,
    )

    return {
      total: stats.total,
      active: stats.active,
      inactive: stats.inactive,
      byType,
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({
        _id: new ObjectId(id),
      })
      return count > 0
    } catch (error) {
      return false
    }
  }

  async count(filter?: SystemPromptFilter): Promise<number> {
    const mongoFilter = this.buildFilter(filter)
    return this.collection.countDocuments(mongoFilter)
  }

  async duplicate(id: string, newTitle?: string): Promise<SystemPrompt | null> {
    const original = await this.findById(id)
    if (!original) {
      return null
    }

    const duplicateInput: SystemPromptCreateInput = {
      title: newTitle || `${original.title} (Copy)`,
      description: original.description,
      query: original.query,
      content: original.content,
      type: original.type,
      isActive: false, // Duplicates start as inactive
      tags: original.tags,
      priority: original.priority,
    }

    return this.create(duplicateInput)
  }

  async invalidateCache(id?: string): Promise<void> {
    // Placeholder for Redis cache invalidation
    // Implementation would depend on Redis setup
    console.log("Cache invalidation requested for:", id || "all")
  }

  async warmCache(): Promise<void> {
    // Placeholder for Redis cache warming
    // Implementation would depend on Redis setup
    console.log("Cache warming requested")
  }
}
