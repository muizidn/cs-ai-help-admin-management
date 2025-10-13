// System Prompts Repository Interface

import type {
  SystemPrompt,
  SystemPromptCreateInput,
  SystemPromptUpdateInput,
  SystemPromptFilter,
  SystemPromptListResponse,
  SystemPromptStats,
} from "../types/system-prompts"

export interface SystemPromptsRepository {
  // CRUD Operations
  create(input: SystemPromptCreateInput): Promise<SystemPrompt>
  findById(id: string): Promise<SystemPrompt | null>
  findAll(filter?: SystemPromptFilter): Promise<SystemPromptListResponse>
  update(
    id: string,
    input: SystemPromptUpdateInput,
  ): Promise<SystemPrompt | null>
  delete(id: string): Promise<boolean>

  // Bulk Operations
  bulkCreate(inputs: SystemPromptCreateInput[]): Promise<SystemPrompt[]>
  bulkUpdate(
    updates: Array<{ id: string; input: SystemPromptUpdateInput }>,
  ): Promise<SystemPrompt[]>
  bulkDelete(ids: string[]): Promise<number>
  bulkToggleActive(ids: string[], isActive: boolean): Promise<number>

  // Query Operations
  findByType(type: string, isActive?: boolean): Promise<SystemPrompt[]>
  findByTags(tags: string[], isActive?: boolean): Promise<SystemPrompt[]>
  search(
    query: string,
    filter?: SystemPromptFilter,
  ): Promise<SystemPromptListResponse>

  // Statistics
  getStats(): Promise<SystemPromptStats>

  // Utility Operations
  exists(id: string): Promise<boolean>
  count(filter?: SystemPromptFilter): Promise<number>
  duplicate(id: string, newTitle?: string): Promise<SystemPrompt | null>

  // Cache Operations (for Redis integration)
  invalidateCache(id?: string): Promise<void>
  warmCache(): Promise<void>
}
