// Types for voucher management

export type DiscountType = "PERCENTAGE" | "AMOUNT"

export interface Voucher {
    id: string
    code: string
    discountType: DiscountType
    discountValue: number
    limitUse: number
    usedCount: number
    isActive: boolean
    expiresAt: Date | string | null

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
    discountType: DiscountType
    discountValue: number
    limitUse: number
    isActive: boolean
    expiresAt?: string | null
}

export interface VoucherUpdateInput {
    code?: string
    discountType?: DiscountType
    discountValue?: number
    limitUse?: number
    isActive?: boolean
    expiresAt?: string | null
    updatedBy?: string
}

export interface VoucherStats {
    totalVouchers: number
    activeVouchers: number
    totalUsedCount: number
}
