export interface AiAnalyticsQuery {
    startDate?: string
    endDate?: string
    ownerId?: string
    ownerType?: "user" | "organization"
}

export interface OwnerUsage {
    ownerId: string
    ownerName: string
    ownerType: "user" | "organization"
    creditSpent: number
    invocations: number
}

export interface AiAnalyticsStats {
    totalCreditSpent: number
    totalProviderCost: number
    totalInvocations: number
    usageBySource: Record<string, { credits: number; count: number }>
    topUsers: OwnerUsage[]
    usageOverTime: Array<{
        date: string
        credits: number
        invocations: number
    }>
}
