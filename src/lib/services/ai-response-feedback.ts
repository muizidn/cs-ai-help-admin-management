import { getDatabase } from "$lib/mongodb"
import { logger } from "$lib/logger"
import type { 
  AIResponseFeedback, 
  AIResponseFeedbackQuery, 
  AIResponseFeedbackResponse,
  AIResponseFeedbackStats,
  FeedbackType 
} from "$lib/types/ai-response-feedback"

const COLLECTION_NAME = "ai-response-feedback"

export class AIResponseFeedbackService {
  private db: any

  constructor(db: any) {
    this.db = db
  }

  async getFeedbackList(query: AIResponseFeedbackQuery): Promise<AIResponseFeedbackResponse> {
    const collection = this.db.collection(COLLECTION_NAME)
    
    // Build MongoDB query
    const mongoQuery: any = { deletedAt: { $exists: false } }
    
    // Search functionality
    if (query.search) {
      mongoQuery.$or = [
        { reason: { $regex: query.search, $options: "i" } },
        { messageId: { $regex: query.search, $options: "i" } },
        { conversationId: { $regex: query.search, $options: "i" } },
        { createdBy: { $regex: query.search, $options: "i" } }
      ]
    }

    // Filter by feedback type
    if (query.feedbackType && query.feedbackType !== "all") {
      mongoQuery.feedbackType = query.feedbackType
    }

    // Filter by conversation ID
    if (query.conversationId) {
      mongoQuery.conversationId = query.conversationId
    }

    // Filter by message ID
    if (query.messageId) {
      mongoQuery.messageId = query.messageId
    }

    // Filter by organization ID
    if (query.organizationId) {
      mongoQuery.organizationId = query.organizationId
    }

    // Filter by creator
    if (query.createdBy) {
      mongoQuery.createdBy = query.createdBy
    }

    // Date range filtering
    if (query.start_date || query.end_date) {
      mongoQuery.createdAt = {}
      if (query.start_date) {
        mongoQuery.createdAt.$gte = new Date(query.start_date)
      }
      if (query.end_date) {
        mongoQuery.createdAt.$lte = new Date(query.end_date)
      }
    }

    // Pagination
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit

    // Sorting
    const sortField = query.sort_by || "createdAt"
    const sortOrder = query.sort_order === "asc" ? 1 : -1
    const sort = { [sortField]: sortOrder }

    try {
      // Get total count
      const total = await collection.countDocuments(mongoQuery)
      
      // Get paginated results
      const items = await collection
        .find(mongoQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray()

      // Transform MongoDB documents
      const transformedItems = items.map((item: any) => {
        const { _id, ...rest } = item
        return {
          ...rest,
          createdAt: new Date(rest.createdAt),
          updatedAt: new Date(rest.updatedAt),
          deletedAt: rest.deletedAt ? new Date(rest.deletedAt) : undefined,
          contextMessages: rest.contextMessages?.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt)
          })) || []
        } as AIResponseFeedback
      })

      return {
        items: transformedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
      logger.error("Error fetching AI response feedback list", { error, query })
      throw new Error("Failed to fetch AI response feedback list")
    }
  }

  async getFeedbackById(id: string): Promise<AIResponseFeedback | null> {
    const collection = this.db.collection(COLLECTION_NAME)
    
    try {
      const item = await collection.findOne({ 
        id, 
        deletedAt: { $exists: false } 
      })
      
      if (!item) {
        return null
      }

      const { _id, ...rest } = item
      return {
        ...rest,
        createdAt: new Date(rest.createdAt),
        updatedAt: new Date(rest.updatedAt),
        deletedAt: rest.deletedAt ? new Date(rest.deletedAt) : undefined,
        contextMessages: rest.contextMessages?.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        })) || []
      } as AIResponseFeedback
    } catch (error) {
      logger.error("Error fetching AI response feedback by ID", { error, id })
      throw new Error("Failed to fetch AI response feedback")
    }
  }

  async getFeedbackStats(): Promise<AIResponseFeedbackStats> {
    const collection = this.db.collection(COLLECTION_NAME)
    
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [
        totalResult,
        feedbackTypeStats,
        organizationStats,
        recentStats
      ] = await Promise.all([
        // Total count
        collection.countDocuments({ deletedAt: { $exists: false } }),
        
        // Feedback type aggregation
        collection.aggregate([
          { $match: { deletedAt: { $exists: false } } },
          { $group: { _id: "$feedbackType", count: { $sum: 1 } } }
        ]).toArray(),
        
        // Organization aggregation
        collection.aggregate([
          { $match: { deletedAt: { $exists: false } } },
          { $group: { _id: "$organizationId", count: { $sum: 1 } } }
        ]).toArray(),
        
        // Recent activity
        Promise.all([
          collection.countDocuments({ 
            deletedAt: { $exists: false },
            createdAt: { $gte: today }
          }),
          collection.countDocuments({ 
            deletedAt: { $exists: false },
            createdAt: { $gte: thisWeek }
          }),
          collection.countDocuments({ 
            deletedAt: { $exists: false },
            createdAt: { $gte: thisMonth }
          })
        ])
      ])

      // Process feedback type stats
      const byFeedbackType = { THUMBS_UP: 0, THUMBS_DOWN: 0 }
      let withReason = 0
      
      for (const stat of feedbackTypeStats) {
        if (stat._id === "THUMBS_UP" || stat._id === "THUMBS_DOWN") {
          byFeedbackType[stat._id] = stat.count
        }
      }

      // Count feedback with reasons
      withReason = await collection.countDocuments({
        deletedAt: { $exists: false },
        reason: { $exists: true, $ne: "", $ne: null }
      })

      // Process organization stats
      const byOrganization: { [key: string]: number } = {}
      for (const stat of organizationStats) {
        if (stat._id) {
          byOrganization[stat._id] = stat.count
        }
      }

      return {
        total: totalResult,
        thumbsUp: byFeedbackType.THUMBS_UP,
        thumbsDown: byFeedbackType.THUMBS_DOWN,
        withReason,
        withoutReason: totalResult - withReason,
        byOrganization,
        byFeedbackType,
        recentActivity: {
          today: recentStats[0],
          thisWeek: recentStats[1],
          thisMonth: recentStats[2]
        }
      }
    } catch (error) {
      logger.error("Error fetching AI response feedback stats", { error })
      throw new Error("Failed to fetch AI response feedback stats")
    }
  }
}

// Singleton service instance
let serviceInstance: AIResponseFeedbackService | null = null

export async function getAIResponseFeedbackService(): Promise<AIResponseFeedbackService> {
  if (!serviceInstance) {
    const db = await getDatabase()
    serviceInstance = new AIResponseFeedbackService(db)
  }
  return serviceInstance
}
