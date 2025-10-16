export type FeedbackType = "THUMBS_UP" | "THUMBS_DOWN"

export interface ContextMessage {
  messageId: string
  content: string
  senderId: string
  isAiGenerated: boolean
  createdAt: Date
}

export interface AIResponseFeedback {
  id: string
  messageId: string
  conversationId: string
  feedbackType: FeedbackType
  reason?: string
  contextMessages: ContextMessage[]
  contextMessageCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  createdBy: string
  updatedBy?: string
  organizationId?: string
}

export interface AIResponseFeedbackQuery {
  page?: number
  limit?: number
  search?: string
  feedbackType?: FeedbackType | "all"
  conversationId?: string
  messageId?: string
  organizationId?: string
  createdBy?: string
  start_date?: string
  end_date?: string
  sort_by?: "createdAt" | "updatedAt" | "feedbackType"
  sort_order?: "asc" | "desc"
}

export interface AIResponseFeedbackResponse {
  items: AIResponseFeedback[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AIResponseFeedbackStats {
  total: number
  thumbsUp: number
  thumbsDown: number
  withReason: number
  withoutReason: number
  byOrganization: { [organizationId: string]: number }
  byFeedbackType: { [type in FeedbackType]: number }
  recentActivity: {
    today: number
    thisWeek: number
    thisMonth: number
  }
}
