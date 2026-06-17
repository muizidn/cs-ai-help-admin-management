// Types for user billing management

export interface User {
  id: string
  email: string
  name: string
  tags: string[]
  isActive: boolean
  emailVerified: boolean
  createdAt: Date | string
  updatedAt: Date | string
  deletedAt?: Date | string
  createdBy: string
  updatedBy?: string
}

export interface Transaction {
  id: string
  userId: string
  organizationId?: string
  type: "CREDIT_PURCHASE" | "PLAN_UPGRADE" | "CREDIT_UPDATE"
  planId?: string
  plan?: "BASIC" | "PRO" | "ENTERPRISE"
  quantity?: number
  credits?: number
  amount: number
  currency: string
  status: "COMPLETED" | "PENDING" | "FAILED"
  transactionCode: string
  gatewayTransactionId?: string
  paymentGateway?: string
  voucherCode?: string
  paymentProof?: string
  notes?: string
  createdAt: Date | string
  updatedAt: Date | string
  expiredAt?: Date | string
  metadata?: Record<string, any>
  createdBy: string
  updatedBy?: string
  reason?: string
  user?: {
    id: string
    name: string
    email: string
  }
  voucher?: {
    code: string
    discountType: "PERCENTAGE" | "AMOUNT"
    discountValue: number
  }
}

export interface UserWithBilling extends User {
  billingSummary?: {
    plan: string
    status: string
    expiresAt?: string
    isLifetime: boolean
    creditBalance: number
    subscriptionCredit: number
    payAsYouGoCredit: number
    rolloverCredit: number
    daysUntilExpiry?: number
    totalSpent: number
    lastPayment?: {
      date: string
      amount: number
      type: string
    }
    transactionCount: number
  }
  recentTransactions?: Transaction[]
}

export interface TransactionQuery {
  // User query fields
  search?: string
  page?: number
  limit?: number
  billingPlan?: "basic" | "pro" | "enterprise"
  billingStatus?: "active" | "expired" | "pending"
  isActive?: boolean

  // Transaction query fields
  userId?: string
  type?: "CREDIT_PURCHASE" | "PLAN_UPGRADE"
  status?: "COMPLETED" | "PENDING" | "FAILED"
  dateFrom?: string
  dateTo?: string
  metadata?: Record<string, any>

  // Sorting
  sortBy?:
    | "name"
    | "email"
    | "createdAt"
    | "billingExpiresAt"
    | "creditBalance"
    | "amount"
    | "status"
    | "type"
  sortOrder?: "asc" | "desc"
}

export interface TransactionStats {
  // User stats
  totalUsers?: number
  activeUsers?: number
  billingPlans?: {
    basic: number
    pro: number
    enterprise: number
  }
  billingStatus?: {
    active: number
    expired: number
    pending: number
  }
  totalCredits?: number

  // Transaction stats
  totalTransactions?: number
  totalAmount?: number
  byStatus?: {
    completed: number
    pending: number
    failed: number
  }
  byType?: {
    creditPurchase: number
    planUpgrade: number
  }
  completedAmount?: number
}

export interface UserUpdateInput {
  name?: string
  isActive?: boolean
  tags?: string[]
  reason?: string
  updatedBy?: string
}

export interface TransactionUpdateInput {
  status?: "COMPLETED" | "PENDING" | "FAILED"
  amount?: number
  credits?: number
  paymentProof?: string
  notes?: string
  updatedBy?: string
  metadata?: Record<string, any>
  reason?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string[]
  errorCodes?: string[]
  messages?: string[]
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats?: any
}
