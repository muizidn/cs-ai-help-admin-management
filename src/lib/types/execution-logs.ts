// Execution log types matching the ai-inference MongoDB schema

export enum LogLevel {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  DEBUG = "debug",
}

export enum StepType {
  API_INVOCATION = "api_invocation",
  LLM_QUERY = "llm_query",
  LLM_RESPONSE = "llm_response",
  CALLBACK_REQUEST = "callback_request",
  CALLBACK_RESPONSE = "callback_response",
  WORKFLOW_STEP = "workflow_step",
  ERROR = "error",
}

export interface ExecutionStep {
  id: string
  step_type: StepType
  timestamp: string // ISO date string
  duration_ms?: number
  level: LogLevel
  message: string
  payload?: Record<string, any>
  response?: Record<string, any>
  error?: string
  metadata?: Record<string, any>
}

export interface ExecutionLog {
  id: string
  business_id?: string
  execution_id: string
  conversation_id: string
  context: string
  status: "running" | "completed" | "failed"
  start_time: string // ISO date string
  end_time?: string // ISO date string
  total_duration_ms?: number

  // Request data
  original_message: string
  previous_messages: Array<{ role: string; content: string }>
  request_data: Record<string, any>

  // Headers from the request
  callback_urls: Record<string, string>

  // Steps during execution
  steps: ExecutionStep[]

  // Final result
  final_response?: Record<string, any>
  error_message?: string

  // Metadata
  created_at: string // ISO date string
  updated_at: string // ISO date string
}

export interface ExecutionLogQuery {
  page?: number
  limit?: number
  search?: string
  status?: "running" | "completed" | "failed"
  context?: string
  conversation_id?: string
  business_id?: string
  start_date?: string // ISO date string
  end_date?: string // ISO date string
  step_type?: StepType
  sort_by?: "start_time" | "end_time" | "total_duration_ms" | "created_at"
  sort_order?: "asc" | "desc"
}

export interface ExecutionLogResponse {
  items: ExecutionLog[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface ExecutionStepResponse {
  items: ExecutionStep[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// Filter and display types for the UI
export interface ExecutionLogFilter {
  search?: string
  status?: "running" | "completed" | "failed" | "all"
  context?: string
  dateRange?: {
    start?: string
    end?: string
  }
  businessId?: string
}

export interface ExecutionLogStats {
  total: number
  running: number
  completed: number
  failed: number
  avgDurationMs?: number
  totalDurationMs?: number
}

// API response wrapper
export interface ApiResponse<T = any> {
  status: "success" | "error"
  data?: T
  message?: string
  errors?: string[]
}

// For displaying execution logs in the UI
export interface ExecutionLogListItem {
  id: string
  execution_id: string
  conversation_id: string
  context: string
  status: "running" | "completed" | "failed"
  start_time: string
  end_time?: string
  total_duration_ms?: number
  original_message: string
  business_id?: string
  steps_count: number
  error_message?: string
}

// For the execution log detail view
export interface ExecutionLogDetail extends ExecutionLog {
  formatted_start_time: string
  formatted_end_time?: string
  formatted_duration?: string
  steps_by_type: Record<string, ExecutionStep[]>
}

// System prompt types for Redis integration
export interface SystemPromptInfo {
  key: string
  type: "technical" | "admin-behavior" | "business-behavior"
  locale?: string
  business_id?: string
  content?: string
  exists: boolean
  size: number
  last_modified?: string
}

export interface SystemPromptUpdate {
  key: string
  content: string
  type: "technical" | "admin-behavior" | "business-behavior"
  locale?: string
  business_id?: string
}
