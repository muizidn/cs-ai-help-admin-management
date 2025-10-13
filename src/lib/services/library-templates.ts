import { libraryTemplateRepository } from "../repositories/library-templates"
import type {
  LibraryTemplate,
  LibraryTemplateCreateInput,
  LibraryTemplateUpdateInput,
  LibraryTemplateFilter,
  LibraryTemplateListResponse,
  LibraryTemplateStats,
  ApiResponse
} from "../types/library-templates"

export class LibraryTemplateService {
  async getById(id: string): Promise<ApiResponse<LibraryTemplate>> {
    try {
      if (!id) {
        return {
          status: "error",
          message: "Template ID is required",
          errors: ["id_required"]
        }
      }

      const template = await libraryTemplateRepository.findById(id)

      if (!template) {
        return {
          status: "error",
          message: "Template not found",
          errors: ["template_not_found"]
        }
      }

      return {
        status: "success",
        data: template
      }
    } catch (error) {
      console.error("Error getting library template:", error)
      return {
        status: "error",
        message: "Failed to get template",
        errors: ["internal_error"]
      }
    }
  }

  async getAll(filter: LibraryTemplateFilter = {}): Promise<ApiResponse<LibraryTemplateListResponse>> {
    try {
      const result = await libraryTemplateRepository.findAll(filter)

      return {
        status: "success",
        data: result
      }
    } catch (error) {
      console.error("Error getting library templates:", error)
      return {
        status: "error",
        message: "Failed to get templates",
        errors: ["internal_error"]
      }
    }
  }

  async create(data: LibraryTemplateCreateInput): Promise<ApiResponse<LibraryTemplate>> {
    try {
      // Validate required fields
      const errors = this.validateCreateInput(data)
      if (errors.length > 0) {
        return {
          status: "error",
          message: "Validation failed",
          errors
        }
      }

      const template = await libraryTemplateRepository.create(data)

      return {
        status: "success",
        data: template,
        message: "Template created successfully"
      }
    } catch (error) {
      console.error("Error creating library template:", error)
      return {
        status: "error",
        message: "Failed to create template",
        errors: ["internal_error"]
      }
    }
  }

  async update(id: string, data: LibraryTemplateUpdateInput): Promise<ApiResponse<LibraryTemplate>> {
    try {
      if (!id) {
        return {
          status: "error",
          message: "Template ID is required",
          errors: ["id_required"]
        }
      }

      // Validate update data
      const errors = this.validateUpdateInput(data)
      if (errors.length > 0) {
        return {
          status: "error",
          message: "Validation failed",
          errors
        }
      }

      const template = await libraryTemplateRepository.update(id, data)

      if (!template) {
        return {
          status: "error",
          message: "Template not found",
          errors: ["template_not_found"]
        }
      }

      return {
        status: "success",
        data: template,
        message: "Template updated successfully"
      }
    } catch (error) {
      console.error("Error updating library template:", error)
      return {
        status: "error",
        message: "Failed to update template",
        errors: ["internal_error"]
      }
    }
  }

  async delete(id: string): Promise<ApiResponse<boolean>> {
    try {
      if (!id) {
        return {
          status: "error",
          message: "Template ID is required",
          errors: ["id_required"]
        }
      }

      const deleted = await libraryTemplateRepository.delete(id)

      if (!deleted) {
        return {
          status: "error",
          message: "Template not found",
          errors: ["template_not_found"]
        }
      }

      return {
        status: "success",
        data: true,
        message: "Template deleted successfully"
      }
    } catch (error) {
      console.error("Error deleting library template:", error)
      return {
        status: "error",
        message: "Failed to delete template",
        errors: ["internal_error"]
      }
    }
  }

  async getStats(): Promise<ApiResponse<LibraryTemplateStats>> {
    try {
      const stats = await libraryTemplateRepository.getStats()

      return {
        status: "success",
        data: stats
      }
    } catch (error) {
      console.error("Error getting library template stats:", error)
      return {
        status: "error",
        message: "Failed to get stats",
        errors: ["internal_error"]
      }
    }
  }

  async search(query: string, limit: number = 20): Promise<ApiResponse<LibraryTemplate[]>> {
    try {
      if (!query || query.trim().length === 0) {
        return {
          status: "error",
          message: "Search query is required",
          errors: ["query_required"]
        }
      }

      const results = await libraryTemplateRepository.search(query.trim(), limit)

      return {
        status: "success",
        data: results
      }
    } catch (error) {
      console.error("Error searching library templates:", error)
      return {
        status: "error",
        message: "Failed to search templates",
        errors: ["internal_error"]
      }
    }
  }

  async incrementDownloadCount(id: string): Promise<ApiResponse<boolean>> {
    try {
      if (!id) {
        return {
          status: "error",
          message: "Template ID is required",
          errors: ["id_required"]
        }
      }

      await libraryTemplateRepository.incrementDownloadCount(id)

      return {
        status: "success",
        data: true,
        message: "Download count updated"
      }
    } catch (error) {
      console.error("Error incrementing download count:", error)
      return {
        status: "error",
        message: "Failed to update download count",
        errors: ["internal_error"]
      }
    }
  }

  async updateRating(id: string, rating: number): Promise<ApiResponse<boolean>> {
    try {
      if (!id) {
        return {
          status: "error",
          message: "Template ID is required",
          errors: ["id_required"]
        }
      }

      if (rating < 0 || rating > 5) {
        return {
          status: "error",
          message: "Rating must be between 0 and 5",
          errors: ["invalid_rating"]
        }
      }

      await libraryTemplateRepository.updateRating(id, rating)

      return {
        status: "success",
        data: true,
        message: "Rating updated"
      }
    } catch (error) {
      console.error("Error updating rating:", error)
      return {
        status: "error",
        message: "Failed to update rating",
        errors: ["internal_error"]
      }
    }
  }

  private validateCreateInput(data: LibraryTemplateCreateInput): string[] {
    const errors: string[] = []

    if (!data.title || data.title.trim().length === 0) {
      errors.push("title_required")
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push("description_required")
    }

    if (!data.type) {
      errors.push("type_required")
    }

    if (!data.category) {
      errors.push("category_required")
    }

    // if (!data.content || Object.keys(data.content).length === 0) {
    //   errors.push("content_required")
    // }

    if (!Array.isArray(data.tags)) {
      errors.push("tags_must_be_array")
    }

    return errors
  }

  private validateUpdateInput(data: LibraryTemplateUpdateInput): string[] {
    const errors: string[] = []

    if (data.title !== undefined && (!data.title || data.title.trim().length === 0)) {
      errors.push("title_required")
    }

    if (data.description !== undefined && (!data.description || data.description.trim().length === 0)) {
      errors.push("description_required")
    }

    // if (data.content !== undefined && (!data.content || Object.keys(data.content).length === 0)) {
    //   errors.push("content_required")
    // }

    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      errors.push("tags_must_be_array")
    }

    return errors
  }
}

// Singleton instance
export const libraryTemplateService = new LibraryTemplateService()
