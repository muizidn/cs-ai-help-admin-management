import type {
  ApiResponse,
  SystemPrompt,
  SystemPromptCreateInput,
  SystemPromptUpdateInput,
  SystemPromptFilter,
  SystemPromptListResponse,
  SystemPromptStats,
} from "./types/system-prompts"

const API_BASE = "/api"

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // System Prompts
  async getSystemPrompts(
    filter?: SystemPromptFilter,
  ): Promise<ApiResponse<SystemPromptListResponse>> {
    const params = new URLSearchParams()

    if (filter?.type) params.append("type", filter.type)
    if (filter?.isActive !== undefined)
      params.append("isActive", filter.isActive.toString())
    if (filter?.search) params.append("search", filter.search)
    if (filter?.tags?.length) params.append("tags", filter.tags.join(","))
    if (filter?.sortBy) params.append("sortBy", filter.sortBy)
    if (filter?.sortOrder) params.append("sortOrder", filter.sortOrder)
    if (filter?.limit) params.append("limit", filter.limit.toString())
    if (filter?.offset) params.append("offset", filter.offset.toString())

    const queryString = params.toString()
    return this.request(
      `/system-prompts${queryString ? `?${queryString}` : ""}`,
    )
  }

  async getSystemPrompt(id: string): Promise<ApiResponse<SystemPrompt>> {
    return this.request(`/system-prompts/${id}`)
  }

  async createSystemPrompt(
    data: SystemPromptCreateInput,
  ): Promise<ApiResponse<SystemPrompt>> {
    return this.request("/system-prompts", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateSystemPrompt(
    id: string,
    data: SystemPromptUpdateInput,
  ): Promise<ApiResponse<SystemPrompt>> {
    return this.request(`/system-prompts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteSystemPrompt(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/system-prompts/${id}`, {
      method: "DELETE",
    })
  }

  async duplicateSystemPrompt(
    id: string,
    newTitle?: string,
  ): Promise<ApiResponse<SystemPrompt>> {
    return this.request(`/system-prompts/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ newTitle }),
    })
  }

  async bulkToggleSystemPrompts(
    ids: string[],
    isActive: boolean,
  ): Promise<ApiResponse<number>> {
    return this.request("/system-prompts/bulk/toggle", {
      method: "POST",
      body: JSON.stringify({ ids, isActive }),
    })
  }

  async bulkDeleteSystemPrompts(ids: string[]): Promise<ApiResponse<number>> {
    return this.request("/system-prompts/bulk/delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    })
  }

  async getSystemPromptsStats(): Promise<ApiResponse<SystemPromptStats>> {
    return this.request("/system-prompts/stats")
  }

  async searchSystemPrompts(
    query: string,
    filter?: SystemPromptFilter,
  ): Promise<ApiResponse<SystemPromptListResponse>> {
    const params = new URLSearchParams({ search: query })

    if (filter?.type) params.append("type", filter.type)
    if (filter?.isActive !== undefined)
      params.append("isActive", filter.isActive.toString())
    if (filter?.tags?.length) params.append("tags", filter.tags.join(","))
    if (filter?.sortBy) params.append("sortBy", filter.sortBy)
    if (filter?.sortOrder) params.append("sortOrder", filter.sortOrder)
    if (filter?.limit) params.append("limit", filter.limit.toString())
    if (filter?.offset) params.append("offset", filter.offset.toString())

    return this.request(`/system-prompts/search?${params.toString()}`)
  }
}

export const api = new ApiService()
