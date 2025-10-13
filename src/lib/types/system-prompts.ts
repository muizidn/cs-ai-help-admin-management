// System Prompts Types and Interfaces

export interface SystemPrompt {
  id: string
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

export enum SystemPromptType {
  QUERY_EXPANSION = "query_expansion",
  INDUSTRY_SPECIFIC = "industry_specific",
  GENERAL_INSTRUCTION = "general_instruction",
  CONTEXT_ENHANCEMENT = "context_enhancement",
  RESPONSE_FORMATTING = "response_formatting",
  SAFETY_FILTER = "safety_filter",
  CUSTOM = "custom",
}

export interface SystemPromptCreateInput {
  title: string
  description: string
  query: string
  content: string
  type: SystemPromptType
  isActive?: boolean
  tags?: string[]
  priority?: number
}

export interface SystemPromptUpdateInput {
  title?: string
  description?: string
  query?: string
  content?: string
  type?: SystemPromptType
  isActive?: boolean
  tags?: string[]
  priority?: number
}

export interface SystemPromptFilter {
  type?: SystemPromptType
  isActive?: boolean
  search?: string
  tags?: string[]
  sortBy?: "title" | "createdAt" | "updatedAt" | "priority"
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface SystemPromptListResponse {
  items: SystemPrompt[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// API Response Types
export interface ApiResponse<T> {
  status: "success" | "error"
  data?: T
  message?: string
  errors?: string[]
}

export interface SystemPromptStats {
  total: number
  active: number
  inactive: number
  byType: Record<SystemPromptType, number>
}

// UI State Types
export interface SystemPromptFormState {
  isEditing: boolean
  isLoading: boolean
  errors: Record<string, string>
  isDirty: boolean
}

export interface SystemPromptListState {
  items: SystemPrompt[]
  loading: boolean
  error: string | null
  filter: SystemPromptFilter
  selectedItems: string[]
  stats: SystemPromptStats | null
}

// Constants
export const SYSTEM_PROMPT_TYPE_LABELS: Record<SystemPromptType, string> = {
  [SystemPromptType.QUERY_EXPANSION]: "Query Expansion",
  [SystemPromptType.INDUSTRY_SPECIFIC]: "Industry Specific",
  [SystemPromptType.GENERAL_INSTRUCTION]: "General Instruction",
  [SystemPromptType.CONTEXT_ENHANCEMENT]: "Context Enhancement",
  [SystemPromptType.RESPONSE_FORMATTING]: "Response Formatting",
  [SystemPromptType.SAFETY_FILTER]: "Safety Filter",
  [SystemPromptType.CUSTOM]: "Custom",
}

export function stringAsSystemPromptType(type: string): SystemPromptType {
  return Object.values(SystemPromptType).find((t) => t === type) ||
    SystemPromptType.CUSTOM
}

export const SYSTEM_PROMPT_TYPE_DESCRIPTIONS: Record<SystemPromptType, string> =
{
  [SystemPromptType.QUERY_EXPANSION]:
    "Prompts that expand or enhance user queries before processing",
  [SystemPromptType.INDUSTRY_SPECIFIC]:
    "Prompts tailored for specific industries or domains",
  [SystemPromptType.GENERAL_INSTRUCTION]:
    "General instructions for AI behavior and responses",
  [SystemPromptType.CONTEXT_ENHANCEMENT]:
    "Prompts that add context to improve response quality",
  [SystemPromptType.RESPONSE_FORMATTING]:
    "Prompts that control response format and structure",
  [SystemPromptType.SAFETY_FILTER]:
    "Prompts for content safety and moderation",
  [SystemPromptType.CUSTOM]: "Custom prompts for specific use cases",
}
