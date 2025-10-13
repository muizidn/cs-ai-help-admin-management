// System Prompts Service Layer

import type {
  SystemPrompt,
  SystemPromptCreateInput,
  SystemPromptUpdateInput,
  SystemPromptFilter,
  SystemPromptListResponse,
  SystemPromptStats,
  ApiResponse,
} from "../types/system-prompts"
import type { SystemPromptsRepository } from "../repositories/system-prompts-repository"

export class SystemPromptsService {
  constructor(private repository: SystemPromptsRepository) {}

  async createSystemPrompt(
    input: SystemPromptCreateInput,
  ): Promise<ApiResponse<SystemPrompt>> {
    try {
      // Validate input
      const validation = this.validateCreateInput(input)
      if (!validation.isValid) {
        return {
          status: "error",
          message: "Validation failed",
          errors: validation.errors,
        }
      }

      const systemPrompt = await this.repository.create(input)
      await this.repository.invalidateCache()

      return {
        status: "success",
        data: systemPrompt,
      }
    } catch (error) {
      console.error("Error creating system prompt:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create system prompt",
      }
    }
  }

  async getSystemPrompt(id: string): Promise<ApiResponse<SystemPrompt>> {
    try {
      const systemPrompt = await this.repository.findById(id)

      if (!systemPrompt) {
        return {
          status: "error",
          message: "System prompt not found",
        }
      }

      return {
        status: "success",
        data: systemPrompt,
      }
    } catch (error) {
      console.error("Error getting system prompt:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get system prompt",
      }
    }
  }

  async listSystemPrompts(
    filter?: SystemPromptFilter,
  ): Promise<ApiResponse<SystemPromptListResponse>> {
    try {
      const result = await this.repository.findAll(filter)

      return {
        status: "success",
        data: result,
      }
    } catch (error) {
      console.error("Error listing system prompts:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to list system prompts",
      }
    }
  }

  async updateSystemPrompt(
    id: string,
    input: SystemPromptUpdateInput,
  ): Promise<ApiResponse<SystemPrompt>> {
    try {
      // Validate input
      const validation = this.validateUpdateInput(input)
      if (!validation.isValid) {
        return {
          status: "error",
          message: "Validation failed",
          errors: validation.errors,
        }
      }

      const systemPrompt = await this.repository.update(id, input)

      if (!systemPrompt) {
        return {
          status: "error",
          message: "System prompt not found",
        }
      }

      await this.repository.invalidateCache(id)

      return {
        status: "success",
        data: systemPrompt,
      }
    } catch (error) {
      console.error("Error updating system prompt:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update system prompt",
      }
    }
  }

  async deleteSystemPrompt(id: string): Promise<ApiResponse<boolean>> {
    try {
      const deleted = await this.repository.delete(id)

      if (!deleted) {
        return {
          status: "error",
          message: "System prompt not found",
        }
      }

      await this.repository.invalidateCache(id)

      return {
        status: "success",
        data: true,
      }
    } catch (error) {
      console.error("Error deleting system prompt:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete system prompt",
      }
    }
  }

  async duplicateSystemPrompt(
    id: string,
    newTitle?: string,
  ): Promise<ApiResponse<SystemPrompt>> {
    try {
      const duplicated = await this.repository.duplicate(id, newTitle)

      if (!duplicated) {
        return {
          status: "error",
          message: "System prompt not found",
        }
      }

      await this.repository.invalidateCache()

      return {
        status: "success",
        data: duplicated,
      }
    } catch (error) {
      console.error("Error duplicating system prompt:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to duplicate system prompt",
      }
    }
  }

  async bulkToggleActive(
    ids: string[],
    isActive: boolean,
  ): Promise<ApiResponse<number>> {
    try {
      const count = await this.repository.bulkToggleActive(ids, isActive)
      await this.repository.invalidateCache()

      return {
        status: "success",
        data: count,
      }
    } catch (error) {
      console.error("Error bulk toggling active status:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update active status",
      }
    }
  }

  async bulkDelete(ids: string[]): Promise<ApiResponse<number>> {
    try {
      const count = await this.repository.bulkDelete(ids)
      await this.repository.invalidateCache()

      return {
        status: "success",
        data: count,
      }
    } catch (error) {
      console.error("Error bulk deleting system prompts:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete system prompts",
      }
    }
  }

  async getStats(): Promise<ApiResponse<SystemPromptStats>> {
    try {
      const stats = await this.repository.getStats()

      return {
        status: "success",
        data: stats,
      }
    } catch (error) {
      console.error("Error getting system prompts stats:", error)
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to get stats",
      }
    }
  }

  async searchSystemPrompts(
    query: string,
    filter?: SystemPromptFilter,
  ): Promise<ApiResponse<SystemPromptListResponse>> {
    try {
      const result = await this.repository.search(query, filter)

      return {
        status: "success",
        data: result,
      }
    } catch (error) {
      console.error("Error searching system prompts:", error)
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to search system prompts",
      }
    }
  }

  private validateCreateInput(input: SystemPromptCreateInput): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!input.title?.trim()) {
      errors.push("Title is required")
    } else if (input.title.length > 200) {
      errors.push("Title must be less than 200 characters")
    }

    if (!input.description?.trim()) {
      errors.push("Description is required")
    } else if (input.description.length > 1000) {
      errors.push("Description must be less than 1000 characters")
    }

    if (!input.query?.trim()) {
      errors.push("Query is required")
    }

    if (!input.content?.trim()) {
      errors.push("Content is required")
    }

    if (!input.type) {
      errors.push("Type is required")
    }

    if (
      input.priority !== undefined &&
      (input.priority < 0 || input.priority > 100)
    ) {
      errors.push("Priority must be between 0 and 100")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  private validateUpdateInput(input: SystemPromptUpdateInput): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (input.title !== undefined) {
      if (!input.title?.trim()) {
        errors.push("Title cannot be empty")
      } else if (input.title.length > 200) {
        errors.push("Title must be less than 200 characters")
      }
    }

    if (input.description !== undefined) {
      if (!input.description?.trim()) {
        errors.push("Description cannot be empty")
      } else if (input.description.length > 1000) {
        errors.push("Description must be less than 1000 characters")
      }
    }

    if (input.query !== undefined && !input.query?.trim()) {
      errors.push("Query cannot be empty")
    }

    if (input.content !== undefined && !input.content?.trim()) {
      errors.push("Content cannot be empty")
    }

    if (
      input.priority !== undefined &&
      (input.priority < 0 || input.priority > 100)
    ) {
      errors.push("Priority must be between 0 and 100")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
