import { getDatabase } from "$lib/mongodb"
import { logger } from "$lib/logger"
import type { AiAnalyticsQuery, AiAnalyticsStats, OwnerUsage } from "$lib/types/analytics"
import type { ApiResponse } from "$lib/types/transactions"

export class AnalyticsService {
    private async getCollection(name: string) {
        const db = await getDatabase()
        return db.collection(name)
    }

    async getAiAnalytics(query: AiAnalyticsQuery): Promise<ApiResponse<AiAnalyticsStats>> {
        try {
            const db = await getDatabase()
            const ledgerCollection = db.collection("credit_ledger")
            const usersCollection = db.collection("users")
            const orgsCollection = db.collection("organizations")

            const filter: any = {
                amount: { $lt: 0 } // Spent credits are negative
            }

            if (query.startDate || query.endDate) {
                filter.createdAt = {}
                if (query.startDate) filter.createdAt.$gte = new Date(query.startDate)
                if (query.endDate) filter.createdAt.$lte = new Date(query.endDate)
            }

            if (query.ownerId) {
                if (query.ownerType === "organization") {
                    filter.organizationId = query.ownerId
                } else {
                    filter.userId = query.ownerId
                    filter.organizationId = { $in: ["", null] }
                }
            }

            const logs = await ledgerCollection.find(filter).toArray()

            const stats: AiAnalyticsStats = {
                totalCreditSpent: 0,
                totalInvocations: 0,
                usageBySource: {},
                topUsers: [],
                usageOverTime: []
            }

            const userMap = new Map<string, OwnerUsage>()

            for (const log of logs) {
                const amount = Math.abs(log.amount)
                const source = log.source || "unknown"

                stats.totalCreditSpent += amount
                stats.totalInvocations += 1

                if (!stats.usageBySource[source]) {
                    stats.usageBySource[source] = { credits: 0, count: 0 }
                }
                stats.usageBySource[source].credits += amount
                stats.usageBySource[source].count += 1

                const ownerId = log.organizationId || log.userId
                const ownerType = log.organizationId ? "organization" : "user"
                const key = `${ownerType}:${ownerId}`

                if (!userMap.has(key)) {
                    userMap.set(key, {
                        ownerId,
                        ownerType,
                        ownerName: "Loading...",
                        creditSpent: 0,
                        invocations: 0
                    })
                }
                const userUsage = userMap.get(key)!
                userUsage.creditSpent += amount
                userUsage.invocations += 1
            }

            // Resolve owner names
            const topUsers = Array.from(userMap.values())
                .sort((a, b) => b.creditSpent - a.creditSpent)
                .slice(0, 100)

            for (const user of topUsers) {
                if (user.ownerType === "user") {
                    const u = await usersCollection.findOne({ id: user.ownerId })
                    user.ownerName = u?.name || u?.email || "Unknown User"
                } else {
                    const o = await orgsCollection.findOne({ id: user.ownerId })
                    user.ownerName = o?.name || "Unknown Org"
                }
            }

            stats.topUsers = topUsers

            // Simplified usage over time (by day)
            const timeMap = new Map<string, { credits: number; invocations: number }>()
            for (const log of logs) {
                const date = new Date(log.createdAt).toISOString().split("T")[0]
                if (!timeMap.has(date)) {
                    timeMap.set(date, { credits: 0, invocations: 0 })
                }
                const entry = timeMap.get(date)!
                entry.credits += Math.abs(log.amount)
                entry.invocations += 1
            }

            stats.usageOverTime = Array.from(timeMap.entries())
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => a.date.localeCompare(b.date))

            return {
                success: true,
                data: stats
            } as any
        } catch (error) {
            logger.error("Error getting AI analytics:", error as any)
            return {
                success: false,
                error: ["Failed to retrieve AI analytics"]
            } as any
        }
    }
}
