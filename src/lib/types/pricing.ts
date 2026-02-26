// Types for pricing and usage configuration

export interface PricingPlan {
    originalPrice: number
    currentPrice: number
    credits: number
    discountMultipliers: Record<string, number>
    enabledDurations: number[]
    highlightDuration?: number
    highlightBadge?: string
}

export interface CreditPricing {
    pricePerCredit: number
    originalPricePerCredit?: number
    discountMultipliers: Record<string, number>
}

export interface UsageCosts {
    inference: number
    simulation: number
    kbParsing: number
}

export interface PricingConfig {
    proPlan: PricingPlan
    credits: CreditPricing
    usageCosts: UsageCosts
    updatedAt: Date | string
    updatedBy: string
}

export interface PricingUpdateInput {
    proPlan?: Partial<PricingPlan>
    credits?: Partial<CreditPricing>
    usageCosts?: Partial<UsageCosts>
}
