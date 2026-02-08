// Types for pricing and usage configuration

export interface PricingPlan {
    originalPrice: number
    currentPrice: number
}

export interface CreditPricing {
    pricePerCredit: number
    originalPricePerCredit?: number
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
