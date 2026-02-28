import { Collection } from "mongodb"
import { getDatabase } from "../mongodb"
import { logger } from "../logger"
import type {
  ExecutionLog,
  ExecutionLogQuery,
  ExecutionLogResponse,
  ExecutionLogStats,
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

function calculateTotalCost(steps: any[]): number {
  if (!steps || !Array.isArray(steps)) return 0
  let totalCost = 0
  for (const step of steps) {
    if (step.response?.usage?.cost_details?.upstream_inference_cost != null) {
      totalCost += step.response.usage.cost_details.upstream_inference_cost
    } else if (step.response?.usage?.cost != null) {
      totalCost += step.response.usage.cost
    }
  }
  return Number(totalCost.toFixed(6))
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
      const result = await collection.findOne({ _id: id as any })

      if (result) {
        // Map MongoDB _id back to id field
        const { _id, steps, ...rest } = result as any
        const executionLog: ExecutionLog = {
          id: _id,
          steps,
          total_cost: calculateTotalCost(steps),
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
        const { _id, steps, ...rest } = result as any
        const executionLog: ExecutionLog = {
          id: _id,
          steps,
          total_cost: calculateTotalCost(steps),
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
      const filter = this.buildBaseFilter(query)

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
      const cursor = collection.find(filter).sort(sort as any).skip(skip).limit(limit)

      const docs = await cursor.toArray()

      // Transform results
      const items: ExecutionLog[] = docs.map((doc) => {
        const { _id, steps, ...rest } = doc as any
        return {
          id: _id,
          steps,
          total_cost: calculateTotalCost(steps),
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
      const baseFilter = this.buildBaseFilter(filter || {})

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
            totalCost: {
              $sum: {
                $sum: {
                  $map: {
                    input: { $ifNull: ["$steps", []] },
                    as: "step",
                    in: {
                      $ifNull: [
                        "$$step.response.usage.cost_details.upstream_inference_cost",
                        { $ifNull: ["$$step.response.usage.cost", 0] }
                      ]
                    }
                  }
                }
              }
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
            totalCost: Number((result[0].totalCost || 0).toFixed(6)),
          }
          : {
            total: 0,
            running: 0,
            completed: 0,
            failed: 0,
            avgDurationMs: 0,
            totalDurationMs: 0,
            totalCost: 0,
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
   * Build base MongoDB filter from query parameters
   */
  private buildBaseFilter(query: Partial<ExecutionLogQuery>): any {
    const filter: any = {}

    if (query.status && query.status !== "all") {
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

    if (query.flag) {
      if (query.flag === "unflagged") {
        filter.flag = { $in: [null, "", { $exists: false }] }
      } else {
        filter.flag = query.flag
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

    // Build $and sections for complex filters
    const andSections: any[] = []

    // 1. Search filter
    if (query.search) {
      andSections.push({
        $or: [
          { original_message: { $regex: query.search, $options: "i" } },
          { execution_id: { $regex: query.search, $options: "i" } },
          { conversation_id: { $regex: query.search, $options: "i" } },
          { context: { $regex: query.search, $options: "i" } },
        ],
      })
    }

    // 2. Customer message filter
    if (query.customer_message) {
      filter.original_message = {
        $regex: query.customer_message,
        $options: "i",
      }
    }

    // 3. AI response filter
    if (query.ai_response) {
      andSections.push({
        $or: [
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
        ],
      })
    }

    // 4. Decision filter
    if (query.final_decision && query.final_decision !== "all") {
      const decisionOrs = this.buildFinalDecisionFilter(query.final_decision)
      if (decisionOrs && decisionOrs.length > 0) {
        andSections.push({ $or: decisionOrs })
      }
    }

    if (andSections.length > 0) {
      filter.$and = andSections
    }

    return filter
  }

  /**
   * Build MongoDB filter for final decision
   */
  private buildFinalDecisionFilter(decision: string): any[] | null {
    const normalizedDecision = decision.toUpperCase()

    switch (normalizedDecision) {
      case "DIRECT_REPLY":
      case "SENT_ANSWER":
        return [
          {
            "final_response.ai_output.decision": {
              $regex: "^(DIRECT_REPLY|SENT_ANSWER)$",
              $options: "i",
            },
          },
          {
            "final_response.response.decision": {
              $regex: "^(DIRECT_REPLY|SENT_ANSWER)$",
              $options: "i",
            },
          },
          { "steps.metadata.step_type": "SENT_ANSWER" },
        ]

      case "REQUEST_HUMAN_ASSISTANCE":
        return [
          {
            "final_response.ai_output.decision": {
              $regex: "^(REQUEST_HUMAN_ASSISTANCE|HUMAN_ASSISTANCE)$",
              $options: "i",
            },
          },
          {
            "final_response.response.decision": {
              $regex: "^(REQUEST_HUMAN_ASSISTANCE|HUMAN_ASSISTANCE)$",
              $options: "i",
            },
          },
          { "final_response.response.requires_human_assistance": true },
          { "steps.metadata.step_type": "REQUEST_HUMAN_ASSISTANCE" },
        ]

      case "FALLBACK_REPLY":
        return [
          { "final_response.ai_output.decision": "FALLBACK_REPLY" },
          { "final_response.response.decision": "FALLBACK_REPLY" },
          { "steps.metadata.step_type": "FALLBACK_REPLY" },
        ]

      case "NO_ANSWER_GIVEN":
        return [
          {
            "final_response.ai_output.decision": {
              $regex: "^(NO_ANSWER|NO_ANSWER_GIVEN)$",
              $options: "i",
            },
          },
          {
            "final_response.response.decision": {
              $regex: "^(NO_ANSWER|NO_ANSWER_GIVEN)$",
              $options: "i",
            },
          },
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

  async updateFlag(id: string, flag: string | null): Promise<boolean> {
    const start = Date.now()
    try {
      const collection = await this.getCollection()

      const updateDoc: any = {}
      if (flag === null) {
        updateDoc.$unset = { flag: "" }
      } else {
        updateDoc.$set = { flag }
      }

      const result = await collection.updateOne({ _id: id as any }, updateDoc)

      const duration = Date.now() - start
      logDbOperation("updateFlag", COLLECTION_NAME, duration)

      return result.modifiedCount > 0
    } catch (error) {
      const duration = Date.now() - start
      logDbOperation("updateFlag", COLLECTION_NAME, duration, error)
      throw error
    }
  }
}

// Singleton instance
export const executionLogRepository = new ExecutionLogRepository()
