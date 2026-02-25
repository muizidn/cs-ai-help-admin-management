import { getDatabase } from "$lib/mongodb"
import { logger } from "$lib/logger"
import type { BillingEntity, BillingQuery, BillingState } from "$lib/types/billing"
import type { ApiResponse, PaginatedResponse } from "$lib/types/transactions"

export class BillingService {
    private async getCollection(name: string) {
        const db = await getDatabase()
        return db.collection(name)
    }

    async getBillingEntities(
        query: BillingQuery
    ): Promise<ApiResponse<PaginatedResponse<BillingEntity>>> {
        try {
            const {
                search = "",
                page = 1,
                limit = 20,
                type,
                subscriptionStatus,
                sortBy = "updatedAt",
                sortOrder = "desc",
            } = query

            const db = await getDatabase()
            const billingStatesCollection = db.collection("billing-state")
            const usersCollection = db.collection("users")
            const orgsCollection = db.collection("organizations")

            // Build billing state filter
            const stateFilter: any = {}
            if (subscriptionStatus) {
                stateFilter.subscriptionStatus = subscriptionStatus
            }
            if (type) {
                stateFilter.ownerType = type
            }

            // We might want to list ALL users/orgs or only those with billing state
            // The user asked to "list of user and orgs" in the context of billing.

            // Let's get billing states first
            const states = await billingStatesCollection
                .find(stateFilter)
                .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
                .toArray()

            // Enrich with owner info
            const entities: BillingEntity[] = await Promise.all(
                states.map(async (state) => {
                    let owner: any
                    if (state.ownerType === "user") {
                        owner = await usersCollection.findOne({ id: state.ownerId })
                    } else {
                        owner = await orgsCollection.findOne({ id: state.ownerId })
                    }

                    return {
                        id: state.ownerId,
                        name: owner?.name || "Unknown",
                        email: owner?.email,
                        type: state.ownerType as "user" | "organization",
                        billingState: {
                            ...state,
                            id: state._id.toString()
                        } as any as BillingState
                    }
                })
            )

            // Apply search filter if provided
            let filteredEntities = entities
            if (search) {
                const searchRegex = new RegExp(search, "i")
                filteredEntities = entities.filter(
                    (e) => searchRegex.test(e.name) || (e.email && searchRegex.test(e.email))
                )
            }

            // Pagination after filtering (since we fetched all states for simplicity, 
            // in a real large DB we'd use aggregation)
            const total = filteredEntities.length
            const paginatedItems = filteredEntities.slice((page - 1) * limit, page * limit)

            return {
                success: true,
                data: {
                    items: paginatedItems,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    }
                }
            }
        } catch (error) {
            logger.error("Error getting billing entities:", error as any)
            return {
                success: false,
                error: ["Failed to retrieve billing entities"]
            }
        }
    }

    async updateBillingState(
        ownerId: string,
        updates: any
    ): Promise<ApiResponse<BillingState>> {
        try {
            const db = await getDatabase()
            const billingStatesCollection = db.collection("billing-state")

            const result = await billingStatesCollection.findOneAndUpdate(
                { ownerId },
                {
                    $set: {
                        ...updates,
                        updatedAt: new Date()
                    }
                },
                { returnDocument: "after" }
            )

            if (!result) {
                return {
                    success: false,
                    error: ["Billing state not found"]
                }
            }

            // Cleanup for response
            const updatedDoc = result as any
            const data: BillingState = {
                ...updatedDoc,
                id: updatedDoc._id.toString()
            }

            return {
                success: true,
                data
            }
        } catch (error) {
            logger.error("Error updating billing state:", error as any)
            return {
                success: false,
                error: ["Failed to update billing state"]
            }
        }
    }
}
