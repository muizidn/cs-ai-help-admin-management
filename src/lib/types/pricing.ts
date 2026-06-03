// Types for pricing and usage configuration

export interface PricingPlan {
  price: number
  originalPrice?: number
  isDiscounted: boolean
  credits: number
  discountMultipliers: Record<string, number>
  enabledDurations: number[]
  highlightDuration?: number
  highlightBadge?: string
}

export interface CreditPricing {
  price: number
  originalPrice?: number
  isDiscounted: boolean
  discountMultipliers: Record<string, number>
}

export interface UsageCosts {
  inference: number
  simulation: number
  kbParsing: number
  datasourceExecution: number
}

export interface PricingConfig {
  id?: string
  name?: string // For custom group pricing
  isGlobal?: boolean
  expiresAt?: Date | string
  proPlan: PricingPlan
  credits: CreditPricing
  usageCosts: UsageCosts
  updatedAt: Date | string
  updatedBy: string
}

export interface PricingUpdateInput {
  name?: string
  expiresAt?: Date | string
  proPlan?: Partial<PricingPlan>
  credits?: Partial<CreditPricing>
  usageCosts?: Partial<UsageCosts>
}

export interface PricingGroupAssignment {
  id: string
  groupId: string
  ownerId: string
  ownerType: "ORGANIZATION" | "USER"
  ownerName?: string // Cached for UI
  assignedAt: Date | string
  assignedBy: string
}
