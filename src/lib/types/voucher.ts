// Types for voucher management

export type DiscountType = "PERCENTAGE" | "AMOUNT"

export interface Voucher {
  id: string
  code: string
  ownerId?: string // user.id or org.id
  discountType: DiscountType
  discountValue: number
  maxRedemption?: number // Legacy field
  maxRedemptionGlobal: number // Global availability across all users
  maxRedemptionPerOwner: number // Limit per single user/organization
  usedCount: number
  isActive: boolean
  showInSettings: boolean
  expiresAt: Date | string | null
  targetType?: "PERSONAL" | "ORGANIZATION" | "BOTH"
  applicablePlanType?: "SUBSCRIPTION" | "CREDIT" | "BOTH"

  // Usage tracking
  lastUsedBy?: string
  lastUsedAt?: Date | string
  lastTransactionId?: string

  createdAt: Date | string
  updatedAt: Date | string
  deletedAt?: Date | string
  createdBy: string
  updatedBy?: string
}

export interface VoucherQuery {
  search?: string
  page?: number
  limit?: number
  isActive?: boolean
  sortBy?: "code" | "createdAt" | "usedCount" | "expiresAt"
  sortOrder?: "asc" | "desc"
}

export interface VoucherCreateInput {
  code: string
  ownerId?: string
  discountType: DiscountType
  discountValue: number
  maxRedemptionGlobal: number
  maxRedemptionPerOwner: number
  isActive: boolean
  showInSettings: boolean
  expiresAt?: string | null
  targetType?: "PERSONAL" | "ORGANIZATION" | "BOTH"
  applicablePlanType?: "SUBSCRIPTION" | "CREDIT" | "BOTH"
}

export interface VoucherUpdateInput {
  code?: string
  ownerId?: string
  discountType?: DiscountType
  discountValue?: number
  maxRedemptionGlobal?: number
  maxRedemptionPerOwner?: number
  isActive?: boolean
  showInSettings?: boolean
  expiresAt?: string | null
  targetType?: "PERSONAL" | "ORGANIZATION" | "BOTH"
  applicablePlanType?: "SUBSCRIPTION" | "CREDIT" | "BOTH"
  updatedBy?: string
}

export interface VoucherStats {
  totalVouchers: number
  activeVouchers: number
  totalUsedCount: number
}
