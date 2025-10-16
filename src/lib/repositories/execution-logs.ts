import { Collection } from "mongodb"
import { getDatabase } from "../mongodb"
import { logger } from "../logger"
import type {
  ExecutionLog,
  ExecutionLogQuery,
  ExecutionLogResponse,
  ExecutionLogStats,
  ExecutionLogListItem,
  ExecutionStep,
  ExecutionStepResponse,
} from "../types/execution-logs"

const COLLECTION_NAME = "ai_inference_engine_execution_logs"

function logDbOperation(
  operation: string,
  collection: string,
  duration: number,
  error?: any,
) {
  if (error) {
    logger.error(
      {
        operation,
        collection,
        duration,
        error: error.message,
      },
      `Database operation failed: ${operation}`,
    )
  } else {
    logger.info(
      {
        operation,
        collection,
        duration,
      },
      `Database operation completed: ${operation}`,
    )
  }
}

export class ExecutionLogRepository {
  private async getCollection(): Promise<Collection<ExecutionLog>> {
    const db = await getDatabase()
    if (!db) {
      throw new Error("Database connection not available")
    }
    return db.collection<ExecutionLog>(COLLECTION_NAME)
  }

  async findById(id: string): Promise<ExecutionLog | null> {
    const start = Date.now()
    try {
      const collection = await this.getCollection()
      const result = await collection.findOne({ _id: id })

      if (result) {
        // Map MongoDB _id back to id field
        const { _id, ...rest } = result as any
        const executionLog: ExecutionLog = {
          id: _id,
          ...rest,
        }

        const duration = Date.now() - start
        logDbOperation("findById", COLLECTION_NAME, duration)
        return executionLog
      }

      const duration = Date.now() - start
      logDbOperation("findById", COLLECTION_NAME, duration)
      return null
    } catch (error) {
      const duration = Date.now() - start
      logDbOperation("findById", COLLECTION_NAME, duration, error)
      throw error
    }
  }

  async findByExecutionId(executionId: string): Promise<ExecutionLog | null> {
    const start = Date.now()
    try {
      const collection = await this.getCollection()
      const result = await collection.findOne({ execution_id: executionId })

      if (result) {
        const { _id, ...rest } = result as any
        const executionLog: ExecutionLog = {
          id: _id,
          ...rest,
        }

        const duration = Date.now() - start
        logDbOperation("findByExecutionId", COLLECTION_NAME, duration)
        return executionLog
      }

      const duration = Date.now() - start
      logDbOperation("findByExecutionId", COLLECTION_NAME, duration)
      return null
    } catch (error) {
      const duration = Date.now() - start
      logDbOperation("findByExecutionId", COLLECTION_NAME, duration, error)
      throw error
    }
  }

  async findMany(query: ExecutionLogQuery): Promise<ExecutionLogResponse> {
    const start = Date.now()
    try {
      const collection = await this.getCollection()

      // Build filter
      const filter: any = {}

      if (query.status) {
        filter.status = query.status
      }

      if (query.context) {
        filter.context = query.context
      }

      if (query.conversation_id) {
        filter.conversation_id = query.conversation_id
      }

      if (query.business_id) {
        filter.business_id = query.business_id
      }

      if (query.search) {
        filter.$or = [
          { original_message: { $regex: query.search, $options: "i" } },
          { execution_id: { $regex: query.search, $options: "i" } },
          { conversation_id: { $regex: query.search, $options: "i" } },
          { context: { $regex: query.search, $options: "i" } },
        ]
      }

      // Filter by customer message content
      if (query.customer_message) {
        filter.original_message = {
          $regex: query.customer_message,
          $options: "i",
        }
      }

      // Filter by AI response content
      if (query.ai_response) {
        filter.$or = [
          ...(filter.$or || []),
          {
            "final_response.final_message": {
              $regex: query.ai_response,
              $options: "i",
            },
          },
          {
            "final_response.response.final_message": {
              $regex: query.ai_response,
              $options: "i",
            },
          },
          {
            "final_response.response.ai_output.text": {
              $regex: query.ai_response,
              $options: "i",
            },
          },
          {
            "steps.response.text": { $regex: query.ai_response, $options: "i" },
          },
        ]
      }

      // Filter by final decision
      if (query.final_decision) {
        const decisionFilter = this.buildFinalDecisionFilter(
          query.final_decision,
        )
        if (decisionFilter) {
          filter.$or = [...(filter.$or || []), ...decisionFilter]
        }
      }

      if (query.start_date || query.end_date) {
        filter.start_time = {}
        if (query.start_date) {
          filter.start_time.$gte = new Date(query.start_date)
        }
        if (query.end_date) {
          filter.start_time.$lte = new Date(query.end_date)
        }
      }

      if (query.step_type) {
        filter["steps.step_type"] = query.step_type
      }

      // Pagination
      const page = query.page || 1
      const limit = Math.min(query.limit || 20, 100) // Max 100 items per page
      const skip = (page - 1) * limit

      // Sorting
      const sortBy = query.sort_by || "start_time"
      const sortOrder = query.sort_order === "asc" ? 1 : -1
      const sort = { [sortBy]: sortOrder }

      // Get total count
      const total = await collection.countDocuments(filter)

      // Get paginated results
      const cursor = collection.find(filter).sort(sort).skip(skip).limit(limit)

      const docs = await cursor.toArray()

      // Transform results
      const items: ExecutionLog[] = docs.map((doc) => {
        const { _id, ...rest } = doc as any
        return {
          id: _id,
          ...rest,
        }
      })

      const totalPages = Math.ceil(total / limit)

      const duration = Date.now() - start
      logDbOperation("findMany", COLLECTION_NAME, duration)

      return {
        items,
        total,
        page,
        limit,
        total_pages: totalPages,
      }
    } catch (error) {
      const duration = Date.now() - start
      logDbOperation("findMany", COLLECTION_NAME, duration, error)
      throw error
    }
  }

  async getStats(
    filter?: Partial<ExecutionLogQuery>,
  ): Promise<ExecutionLogStats> {
    const start = Date.now()
    try {
      const collection = await this.getCollection()

      // Build base filter
      const baseFilter: any = {}
      if (filter?.business_id) {
        baseFilter.business_id = filter.business_id
      }
      if (filter?.context) {
        baseFilter.context = filter.context
      }
      if (filter?.start_date || filter?.end_date) {
        baseFilter.start_time = {}
        if (filter.start_date) {
          baseFilter.start_time.$gte = new Date(filter.start_date)
        }
        if (filter.end_date) {
          baseFilter.start_time.$lte = new Date(filter.end_date)
        }
      }

      // Aggregate stats
      const pipeline = [
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            running: {
              $sum: { $cond: [{ $eq: ["$status", "running"] }, 1, 0] },
            },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
            totalDurationMs: {
              $sum: { $ifNull: ["$total_duration_ms", 0] },
            },
            avgDurationMs: {
              $avg: { $ifNull: ["$total_duration_ms", 0] },
            },
          },
        },
      ]

      const result = await collection.aggregate(pipeline).toArray()

      const stats: ExecutionLogStats =
        result.length > 0
          ? {
              total: result[0].total || 0,
              running: result[0].running || 0,
              completed: result[0].completed || 0,
              failed: result[0].failed || 0,
              avgDurationMs: Math.round(result[0].avgDurationMs || 0),
              totalDurationMs: result[0].totalDurationMs || 0,
            }
          : {
              total: 0,
              running: 0,
              completed: 0,
              failed: 0,
              avgDurationMs: 0,
              totalDurationMs: 0,
            }

      const duration = Date.now() - start
      logDbOperation("getStats", COLLECTION_NAME, duration)

      return stats
    } catch (error) {
      const duration = Date.now() - start
      logDbOperation("getStats", COLLECTION_NAME, duration, error)
      throw error
    }
  }

  async getSteps(
    executionId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<ExecutionStepResponse> {
    const start = Date.now()
    try {
      const executionLog = await this.findById(executionId)
      if (!executionLog) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          total_pages: 0,
        }
      }

      const steps = executionLog.steps || []
      const total = steps.length

      // Apply pagination
      const skip = (page - 1) * limit
      const paginatedSteps = steps.slice(skip, skip + limit)

      const totalPages = Math.ceil(total / limit)

      const duration = Date.now() - start
      logDbOperation("getSteps", COLLECTION_NAME, duration)

      return {
        items: paginatedSteps,
        total,
        page,
        limit,
        total_pages: totalPages,
      }
    } catch (error) {
      const duration = Date.now() - start
      logDbOperation("getSteps", COLLECTION_NAME, duration, error)
      throw error
    }
  }

  /**
   * Build MongoDB filter for final decision
   */
  private buildFinalDecisionFilter(decision: string): any[] | null {
    const normalizedDecision = decision.toUpperCase()

    switch (normalizedDecision) {
      case "SENT_ANSWER":
        return [
          {
            "final_response.response.decision": {
              $regex: "DIRECT_REPLY|SENT_ANSWER",
              $options: "i",
            },
          },
          { "final_response.context": "TRY_ANSWER" },
          { "steps.message": { $regex: "sent_answer", $options: "i" } },
          { "steps.metadata.step_type": "SENT_ANSWER" },
          {
            status: "completed",
            "final_response.response.requires_human_assistance": { $ne: true },
          },
        ]

      case "REQUEST_HUMAN_ASSISTANCE":
        return [
          {
            "final_response.response.decision": {
              $regex: "REQUEST_HUMAN_ASSISTANCE|HUMAN_ASSISTANCE",
              $options: "i",
            },
          },
          { "final_response.context": "TRY_ANSWER" },
          { "final_response.response.requires_human_assistance": true },
          {
            "steps.message": {
              $regex: "request_human_assistance",
              $options: "i",
            },
          },
          { "steps.metadata.step_type": "REQUEST_HUMAN_ASSISTANCE" },
        ]

      case "NO_ANSWER_GIVEN":
        return [
          {
            "final_response.response.decision": {
              $regex: "NO_ANSWER|NO_ANSWER_GIVEN",
              $options: "i",
            },
          },
          { "final_response.context": "TRY_ANSWER" },
          { "steps.message": { $regex: "no_answer_given", $options: "i" } },
          { "steps.metadata.step_type": "NO_ANSWER_GIVEN" },
        ]

      case "FAILED":
        return [{ status: "failed" }]

      case "RUNNING":
        return [{ status: "running" }]

      default:
        return null
    }
  }
}

// Singleton instance
export const executionLogRepository = new ExecutionLogRepository()
