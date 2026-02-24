import { json, type RequestHandler } from "@sveltejs/kit"
import { BillingService } from "$lib/services/billing"
import { logger } from "$lib/logger"
import type { BillingQuery } from "$lib/types/billing"

export const GET: RequestHandler = async ({ url, locals }) => {
    const requestId = locals.requestId || "billing-list"

    try {
        const searchParams = url.searchParams

        const query: BillingQuery = {
            search: searchParams.get("search") || undefined,
            page: parseInt(searchParams.get("page") || "1"),
            limit: parseInt(searchParams.get("limit") || "20"),
            type: (searchParams.get("type") as any) || undefined,
            subscriptionStatus: searchParams.get("subscriptionStatus") || undefined,
            sortBy: (searchParams.get("sortBy") as any) || "updatedAt",
            sortOrder: (searchParams.get("sortOrder") as any) || "desc",
        }

        const service = new BillingService()
        const result = await service.getBillingEntities(query)

        if (result.success) {
            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            return json({
                status: "error",
                message: "Failed to retrieve billing entities",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error: error instanceof Error ? error.message : String(error) }, "Error in billing list endpoint")
        return json({
            status: "error",
            message: "Internal server error",
            requestId,
        }, { status: 500 })
    }
}
