// Library Template Types and Interfaces

export type LibraryTemplateType =
  | "message_template"
  | "ai_rule"
  | "datasource"
  | "tool"
  | "knowledge_base"

export type BusinessCategory =
  | "customer-service"
  | "sales"
  | "marketing"
  | "hr"
  | "finance"
  | "operations"
  | "productivity"
  | "database"
  | "integration"
  | "e-commerce"
  | "healthcare"
  | "education"
  | "legal"
  | "real-estate"
  | "general"

export interface LibraryTemplate {
  id: string
  title: string
  description: string
  type: LibraryTemplateType
  category: BusinessCategory
  tags: string[]
  content: Record<string, any> // The actual template content (varies by type)
  language?: string // "en", "id", etc.
  preview?: string // Optional preview text
  isActive: boolean
  downloadCount: number
  rating: number // 0-5 stars
  createdAt: Date
  updatedAt: Date
  createdBy: string
  version: string
  // Metadata for different template types
  metadata?: {
    variables?: string[] // For message templates
    conditions?: string[] // For AI rules
    actions?: string[] // For AI rules
    dataSourceType?: string // For datasources
    keywords?: string[] // For knowledge base
    requiredPermissions?: string[] // For tools
    exampleUseCases?: string[] // For all types
  }
}

export interface LibraryTemplateCreateInput {
  id: string
  title: string
  description: string
  type: LibraryTemplateType
  category: BusinessCategory
  tags: string[]
  content: Record<string, any>
  language?: string
  preview?: string
  version?: string
  metadata?: {
    variables?: string[]
    conditions?: string[]
    actions?: string[]
    dataSourceType?: string
    keywords?: string[]
    requiredPermissions?: string[]
    exampleUseCases?: string[]
  }
}

export interface LibraryTemplateUpdateInput {
  title?: string
  description?: string
  type?: LibraryTemplateType
  category?: BusinessCategory
  tags?: string[]
  content?: Record<string, any>
  language?: string
  preview?: string
  isActive?: boolean
  version?: string
  metadata?: {
    variables?: string[]
    conditions?: string[]
    actions?: string[]
    dataSourceType?: string
    keywords?: string[]
    requiredPermissions?: string[]
    exampleUseCases?: string[]
  }
}

export interface LibraryTemplateFilter {
  type?: LibraryTemplateType
  category?: BusinessCategory
  tags?: string[]
  isActive?: boolean
  search?: string
  sortBy?: "title" | "createdAt" | "updatedAt" | "downloadCount" | "rating"
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface LibraryTemplateListResponse {
  items: LibraryTemplate[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Content type interfaces for different template types
export interface MessageTemplateContent {
  title: string
  query: string
  template: string
  variables?: string[]
}

export interface AiRuleContent {
  name: string
  description?: string
  conditions: string[]
  actions: string[]
}

export interface DatasourceContent {
  name: string
  type: string
  url?: string
  content?: string
  accessToken?: string
}

export interface ToolContent {
  name: string
  toolId: string // The tool ID from the registry
  description?: string
  query?: string // Query for matching in vector DB
  toolCallConfig: {
    toolParameters: Record<string, any>
    llmParams: Array<{
      name: string
      type: "string" | "number" | "boolean" | "object" | "array"
      description: string
      prompt?: string
    }>
  }
}

export interface TestMessage {
  customer: string
  ai_response_eval: string
}

export interface TestScenario {
  flowName: string
  messages: TestMessage[]
}

export interface KnowledgeBaseContent {
  sections: Array<{
    content: string
  }>
  keywords: string[]
  questions?: TestScenario[]
}

// API Response Types
export interface ApiResponse<T> {
  status: "success" | "error"
  data?: T
  message?: string
  errors?: string[]
}

export interface LibraryTemplateStats {
  total: number
  active: number
  inactive: number
  byType: Record<LibraryTemplateType, number>
  byCategory: Record<BusinessCategory, number>
  totalDownloads: number
  averageRating: number
}

// UI State Types
export interface LibraryTemplateFormState {
  isEditing: boolean
  isLoading: boolean
  errors: Record<string, string>
  isDirty: boolean
}

export interface LibraryTemplateListState {
  items: LibraryTemplate[]
  loading: boolean
  error: string | null
  filter: LibraryTemplateFilter
  selectedItems: string[]
  stats: LibraryTemplateStats | null
}

// Constants
export const LIBRARY_TEMPLATE_TYPE_LABELS: Record<LibraryTemplateType, string> =
  {
    message_template: "Message Template",
    ai_rule: "AI Rule",
    datasource: "Datasource",
    tool: "Tool",
    knowledge_base: "Knowledge Base",
  }

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  "customer-service": "Customer Service",
  sales: "Sales",
  marketing: "Marketing",
  hr: "Human Resources",
  finance: "Finance",
  operations: "Operations",
  productivity: "Productivity",
  database: "Database",
  integration: "Integration",
  "e-commerce": "E-commerce",
  healthcare: "Healthcare",
  education: "Education",
  legal: "Legal",
  "real-estate": "Real Estate",
  general: "General",
}

export const LIBRARY_TEMPLATE_TYPE_DESCRIPTIONS: Record<
  LibraryTemplateType,
  string
> = {
  message_template:
    "Pre-built message templates for common communication scenarios",
  ai_rule: "AI behavior rules and conditions for automated responses",
  datasource: "Data source configurations for external integrations",

  tool: "Tool configurations for data access and external services",
  knowledge_base: "Structured knowledge base articles/guides with sections",
}
