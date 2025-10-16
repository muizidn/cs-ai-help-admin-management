// Execution log comment types for admin review functionality

export interface ExecutionLogComment {
  id: string
  executionLogId: string
  executionId: string
  comment: string
  reviewStatus: ReviewStatus
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  createdBy: string
  updatedBy?: string
}

export type ReviewStatus = 
  | "NEEDS_REVIEW"
  | "REVIEWED_GOOD" 
  | "REVIEWED_ISSUES"
  | "REVIEWED_CRITICAL"

export interface CreateExecutionLogCommentRequest {
  executionLogId: string
  executionId: string
  comment: string
  reviewStatus: ReviewStatus
}

export interface UpdateExecutionLogCommentRequest {
  id: string
  comment?: string
  reviewStatus?: ReviewStatus
}

export interface ExecutionLogCommentQuery {
  page?: number
  limit?: number
  search?: string
  executionLogId?: string
  executionId?: string
  reviewStatus?: ReviewStatus | "all"
  createdBy?: string
  start_date?: string
  end_date?: string
  sort_by?: "createdAt" | "updatedAt" | "reviewStatus"
  sort_order?: "asc" | "desc"
}

export interface ExecutionLogCommentResponse {
  items: ExecutionLogComment[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface ExecutionLogCommentStats {
  total: number
  needsReview: number
  reviewedGood: number
  reviewedIssues: number
  reviewedCritical: number
  byReviewStatus: { [status in ReviewStatus]: number }
  recentActivity: {
    today: number
    thisWeek: number
    thisMonth: number
  }
}

// For UI display
export interface ExecutionLogWithComments {
  executionLog: any // ExecutionLog type
  comments: ExecutionLogComment[]
  commentCount: number
  latestComment?: ExecutionLogComment
  reviewStatus?: ReviewStatus
}

// API response wrapper
export interface ApiResponse<T = any> {
  status: "success" | "error"
  data?: T
  message?: string
  errors?: string[]
}
