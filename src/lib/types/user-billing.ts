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
  // Billing fields
  billingPlan?: "basic" | "pro" | "enterprise"
  billingStatus?: "active" | "expired" | "pending"
  billingExpiresAt?: Date | string
  isLifetimeBilling?: boolean
  creditBalance?: number
}

export interface Transaction {
  id: string
  userId: string
  type: "CREDIT_PURCHASE" | "PLAN_UPGRADE"
  plan?: "BASIC" | "PRO" | "ENTERPRISE"
  amount: number
  status: "COMPLETED" | "PENDING" | "FAILED"
  transactionCode: string
  paymentProof?: string
  notes?: string
  createdAt: Date | string
  updatedAt: Date | string
  expiredAt?: Date | string
  createdBy: string
  updatedBy?: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface UserWithBilling extends User {
  billingSummary?: {
    plan: string
    status: string
    expiresAt?: string
    isLifetime: boolean
    creditBalance: number
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

export interface UserBillingQuery {
  search?: string
  page?: number
  limit?: number
  billingPlan?: "basic" | "pro" | "enterprise"
  billingStatus?: "active" | "expired" | "pending"
  isActive?: boolean
  sortBy?: "name" | "email" | "createdAt" | "billingExpiresAt" | "creditBalance"
  sortOrder?: "asc" | "desc"
}

export interface TransactionQuery {
  search?: string
  page?: number
  limit?: number
  userId?: string
  type?: "CREDIT_PURCHASE" | "PLAN_UPGRADE"
  status?: "COMPLETED" | "PENDING" | "FAILED"
  sortBy?: "createdAt" | "amount" | "status" | "type"
  sortOrder?: "asc" | "desc"
  dateFrom?: string
  dateTo?: string
}

export interface UserBillingStats {
  totalUsers: number
  activeUsers: number
  billingPlans: {
    basic: number
    pro: number
    enterprise: number
  }
  billingStatus: {
    active: number
    expired: number
    pending: number
  }
  totalCredits: number
}

export interface TransactionStats {
  totalTransactions: number
  totalAmount: number
  byStatus: {
    completed: number
    pending: number
    failed: number
  }
  byType: {
    creditPurchase: number
    planUpgrade: number
  }
  completedAmount: number
}

export interface UserUpdateInput {
  name?: string
  isActive?: boolean
  billingPlan?: "basic" | "pro" | "enterprise"
  billingStatus?: "active" | "expired" | "pending"
  billingExpiresAt?: string
  isLifetimeBilling?: boolean
  creditBalance?: number
  tags?: string[]
}

export interface TransactionUpdateInput {
  status?: "COMPLETED" | "PENDING" | "FAILED"
  paymentProof?: string
  notes?: string
  updatedBy?: string
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
