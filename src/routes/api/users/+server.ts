import { json, type RequestHandler } from "@sveltejs/kit"
import { UserBillingService } from "$lib/services/user-billing"
import { logger } from "$lib/logger"
import type { UserBillingQuery } from "$lib/types/user-billing"

// GET /api/users - List users with billing information
export const GET: RequestHandler = async ({ url, locals }) => {
    const requestId = locals.requestId || "users-list"

    try {
        const searchParams = url.searchParams

        const query: UserBillingQuery = {
            search: searchParams.get("search") || undefined,
            page: parseInt(searchParams.get("page") || "1"),
            limit: parseInt(searchParams.get("limit") || "20"),
            billingPlan: (searchParams.get("billingPlan") as any) || undefined,
            billingStatus: (searchParams.get("billingStatus") as any) || undefined,
            isActive: searchParams.get("isActive") ? searchParams.get("isActive") === "true" : undefined,
            sortBy: (searchParams.get("sortBy") as any) || "createdAt",
            sortOrder: (searchParams.get("sortOrder") as any) || "desc",
        }

        logger.info({
            requestId,
            type: "users_list_request",
            query,
        }, "Processing users list request")

        const service = new UserBillingService()
        const result = await service.getUsers(query)

        if (result.success) {
            logger.info({
                requestId,
                type: "users_list_success",
                totalUsers: result.data?.pagination.total,
                page: result.data?.pagination.page,
            }, "Users list retrieved successfully")

            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            logger.warn({
                requestId,
                type: "users_list_failed",
                errors: result.error,
            }, "Failed to retrieve users list")

            return json({
                status: "error",
                message: "Failed to retrieve users",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({
            requestId,
            type: "users_list_error",
            error: error instanceof Error ? error.message : String(error),
        }, "Error in users list endpoint")

        return json({
            status: "error",
            message: "Internal server error",
            errors: ["An unexpected error occurred"],
            requestId,
        }, { status: 500 })
    }
}
