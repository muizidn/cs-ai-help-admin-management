import { getDatabase } from "$lib/mongodb"
import { logger } from "$lib/logger"
import type {
    OrganizationWithStats,
    OrganizationQuery
} from "$lib/types/organization"
import type { ApiResponse, PaginatedResponse } from "$lib/types/user-billing"

export class OrganizationService {
    private async getCollection(name: string) {
        const db = await getDatabase()
        return db.collection(name)
    }

    async getOrganizations(
        query: OrganizationQuery
    ): Promise<ApiResponse<PaginatedResponse<OrganizationWithStats>>> {
        try {
            const {
                search = "",
                page = 1,
                limit = 20,
                sortBy = "createdAt",
                sortOrder = "desc",
            } = query

            const orgsCollection = await this.getCollection("organizations")
            const collaboratorsCollection = await this.getCollection("organization-collaborators")

            // Build MongoDB filter
            const filter: any = { deletedAt: { $exists: false } }
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { id: { $regex: search, $options: "i" } },
                ]
            }

            const total = await orgsCollection.countDocuments(filter)
            const orgs = await orgsCollection
                .find(filter)
                .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray()

            // Enrich with member counts
            const enrichedOrgs = await Promise.all(
                orgs.map(async (org) => {
                    const memberCount = await collaboratorsCollection.countDocuments({
                        organizationId: org.id || org._id.toString(),
                        status: "active",
                        deletedAt: { $exists: false }
                    })

                    const { _id, ...rest } = org
                    return {
                        ...rest,
                        id: org.id || (_id ? _id.toString() : ""),
                        memberCount
                    } as OrganizationWithStats
                })
            )

            return {
                success: true,
                data: {
                    items: enrichedOrgs,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    }
                }
            }
        } catch (error) {
            logger.error("Error getting organizations:", error as any)
            return {
                success: false,
                error: ["Failed to retrieve organizations"]
            }
        }
    }
}
