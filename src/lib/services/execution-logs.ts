import { executionLogRepository } from "../repositories/execution-logs"
import { redisClient } from "../redis"
import { logger } from "../logger"
import {
  extractFinalDecision,
  extractAiResponseText,
} from "../utils/final-decision-extractor"
import type {
  ExecutionLog,
  ExecutionLogQuery,
  ExecutionLogResponse,
  ExecutionLogStats,
  ExecutionLogDetail,
  ExecutionLogListItem,
  ExecutionStepResponse,
  ApiResponse,
  StepType,
  SystemPromptInfo,
  SystemPromptUpdate,
} from "../types/execution-logs"

export class ExecutionLogService {
  async getExecutionLogs(
    query: ExecutionLogQuery,
  ): Promise<ApiResponse<ExecutionLogResponse>> {
    try {
      logger.info({ query }, "Getting execution logs")

      const result = await executionLogRepository.findMany(query)

      logger.info(
        {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
        "Execution logs retrieved successfully",
      )

      return {
        status: "success",
        data: result,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error },
        "Failed to get execution logs",
      )
      return {
        status: "error",
        message: "Failed to retrieve execution logs",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  async getExecutionLogById(
    id: string,
  ): Promise<ApiResponse<ExecutionLogDetail>> {
    try {
      logger.info({ id }, "Getting execution log by ID")

      const executionLog = await executionLogRepository.findById(id)

      if (!executionLog) {
        return {
          status: "error",
          message: "Execution log not found",
          errors: ["Execution log not found"],
        }
      }

      // Transform to detail view with additional formatting
      const detail: ExecutionLogDetail = {
        ...executionLog,
        formatted_start_time: this.formatDateTime(executionLog.start_time),
        formatted_end_time: executionLog.end_time
          ? this.formatDateTime(executionLog.end_time)
          : undefined,
        formatted_duration: executionLog.total_duration_ms
          ? this.formatDuration(executionLog.total_duration_ms)
          : undefined,
        steps_by_type: this.groupStepsByType(executionLog.steps),
        final_decision: extractFinalDecision(executionLog),
        ai_response_text: extractAiResponseText(executionLog),
      }

      logger.info(
        { id, steps_count: executionLog.steps.length },
        "Execution log retrieved successfully",
      )

      return {
        status: "success",
        data: detail,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, id },
        "Failed to get execution log",
      )
      return {
        status: "error",
        message: "Failed to retrieve execution log",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  async getExecutionLogByExecutionId(
    executionId: string,
  ): Promise<ApiResponse<ExecutionLogDetail>> {
    try {
      logger.info({ executionId }, "Getting execution log by execution ID")

      const executionLog =
        await executionLogRepository.findByExecutionId(executionId)

      if (!executionLog) {
        return {
          status: "error",
          message: "Execution log not found",
          errors: ["Execution log not found"],
        }
      }

      // Transform to detail view
      const detail: ExecutionLogDetail = {
        ...executionLog,
        formatted_start_time: this.formatDateTime(executionLog.start_time),
        formatted_end_time: executionLog.end_time
          ? this.formatDateTime(executionLog.end_time)
          : undefined,
        formatted_duration: executionLog.total_duration_ms
          ? this.formatDuration(executionLog.total_duration_ms)
          : undefined,
        steps_by_type: this.groupStepsByType(executionLog.steps),
        final_decision: extractFinalDecision(executionLog),
        ai_response_text: extractAiResponseText(executionLog),
      }

      return {
        status: "success",
        data: detail,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, executionId },
        "Failed to get execution log",
      )
      return {
        status: "error",
        message: "Failed to retrieve execution log",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  async getExecutionLogStats(
    filter?: Partial<ExecutionLogQuery>,
  ): Promise<ApiResponse<ExecutionLogStats>> {
    try {
      logger.info({ filter }, "Getting execution log stats")

      const stats = await executionLogRepository.getStats(filter)

      logger.info({ stats }, "Execution log stats retrieved successfully")

      return {
        status: "success",
        data: stats,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error },
        "Failed to get execution log stats",
      )
      return {
        status: "error",
        message: "Failed to retrieve execution log statistics",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  async getExecutionSteps(
    executionId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<ApiResponse<ExecutionStepResponse>> {
    try {
      logger.info({ executionId, page, limit }, "Getting execution steps")

      const result = await executionLogRepository.getSteps(
        executionId,
        page,
        limit,
      )

      logger.info(
        {
          executionId,
          total: result.total,
          page: result.page,
        },
        "Execution steps retrieved successfully",
      )

      return {
        status: "success",
        data: result,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, executionId },
        "Failed to get execution steps",
      )
      return {
        status: "error",
        message: "Failed to retrieve execution steps",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  // System prompt management methods
  async getSystemPrompts(): Promise<ApiResponse<SystemPromptInfo[]>> {
    try {
      logger.info("Getting system prompts from Redis")

      const prompts: SystemPromptInfo[] = []
      const locales = ["en", "id"]

      // Get technical and admin prompts for each locale
      for (const locale of locales) {
        // Technical prompt
        const technicalKey = `technical-system-prompt:default:${locale}`
        const technicalContent =
          await redisClient.getTechnicalSystemPrompt(locale)
        prompts.push({
          key: technicalKey,
          type: "technical",
          locale,
          content: technicalContent || undefined,
          exists: !!technicalContent,
          size: technicalContent ? technicalContent.length : 0,
        })

        // Admin behavior prompt
        const adminKey = `admin-behavior-system-prompt:default:${locale}`
        const adminContent =
          await redisClient.getAdminBehaviorSystemPrompt(locale)
        prompts.push({
          key: adminKey,
          type: "admin-behavior",
          locale,
          content: adminContent || undefined,
          exists: !!adminContent,
          size: adminContent ? adminContent.length : 0,
        })
      }

      logger.info(
        { count: prompts.length },
        "System prompts retrieved successfully",
      )

      return {
        status: "success",
        data: prompts,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error },
        "Failed to get system prompts",
      )
      return {
        status: "error",
        message: "Failed to retrieve system prompts",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  async updateSystemPrompt(
    update: SystemPromptUpdate,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      logger.info(
        { key: update.key, type: update.type },
        "Updating system prompt",
      )

      if (update.type === "technical" && update.locale) {
        await redisClient.setTechnicalSystemPrompt(
          update.content,
          update.locale,
        )
      } else if (update.type === "admin-behavior" && update.locale) {
        await redisClient.setAdminBehaviorSystemPrompt(
          update.content,
          update.locale,
        )
      } else if (update.type === "business-behavior" && update.business_id) {
        await redisClient.setBusinessBehaviorSystemPrompt(
          update.business_id,
          update.content,
        )
      } else {
        return {
          status: "error",
          message: "Invalid prompt type or missing required parameters",
          errors: ["Invalid prompt type or missing required parameters"],
        }
      }

      logger.info(
        { key: update.key, size: update.content.length },
        "System prompt updated successfully",
      )

      return {
        status: "success",
        data: { message: "System prompt updated successfully" },
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : error,
          key: update.key,
        },
        "Failed to update system prompt",
      )
      return {
        status: "error",
        message: "Failed to update system prompt",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  // Helper methods
  private formatDateTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    })
  }

  private formatDuration(durationMs: number): string {
    if (durationMs < 1000) {
      return `${durationMs}ms`
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  private groupStepsByType(steps: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {
      api_invocation: [],
      llm_query: [],
      llm_response: [],
      callback_request: [],
      callback_response: [],
      workflow_step: [],
      error: [],
    }

    steps.forEach((step) => {
      const stepType = step.step_type || "unknown"
      if (grouped[stepType]) {
        grouped[stepType].push(step)
      } else {
        // Handle unknown step types
        if (!grouped["unknown"]) {
          grouped["unknown"] = []
        }
        grouped["unknown"].push(step)
      }
    })

    return grouped
  }
}

// Singleton instance
export const executionLogService = new ExecutionLogService()

export async function getExecutionLogService(): Promise<ExecutionLogService> {
  return executionLogService
}
