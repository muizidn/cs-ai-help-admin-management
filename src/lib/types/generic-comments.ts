export interface GenericComment {
  id: string
  entityType: 'execution-log' | 'ai-response-feedback'
  entityId: string
  entityLogId?: string
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

export interface CreateGenericCommentRequest {
  entityType: 'execution-log' | 'ai-response-feedback'
  entityId: string
  entityLogId?: string
  comment: string
  reviewStatus: ReviewStatus
}

export interface UpdateGenericCommentRequest {
  comment?: string
  reviewStatus?: ReviewStatus
}

export interface GenericCommentQuery {
  entityType?: string
  entityId?: string
  entityLogId?: string
  reviewStatus?: ReviewStatus
  createdBy?: string
  page?: number
  limit?: number
  search?: string
}

export interface GenericCommentStats {
  total: number
  byStatus: Record<ReviewStatus, number>
  byEntityType: Record<string, number>
  recentCount: number
}
