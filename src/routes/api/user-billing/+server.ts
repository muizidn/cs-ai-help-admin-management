import { json, type RequestHandler } from "@sveltejs/kit"
import { UserBillingService } from "$lib/services/user-billing"
import { logger } from "$lib/logger"
import type { UserBillingQuery } from "$lib/types/user-billing"

// GET /api/user-billing - List users with billing information
export const GET: RequestHandler = async ({ url, locals }) => {
  const requestId = locals.requestId || "user-billing-list"

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
      type: "user_billing_list_request",
      query,
    }, "Processing user billing list request")

    const service = new UserBillingService()
    const result = await service.getUsers(query)

    if (result.success) {
      logger.info({
        requestId,
        type: "user_billing_list_success",
        totalUsers: result.data?.pagination.total,
        page: result.data?.pagination.page,
      }, "User billing list retrieved successfully")

      return json({
        status: "success",
        data: result.data,
        requestId,
      })
    } else {
      logger.warn({
        requestId,
        type: "user_billing_list_failed",
        errors: result.error,
      }, "Failed to retrieve user billing list")

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
      type: "user_billing_list_error",
      error: error instanceof Error ? error.message : String(error),
    }, "Error in user billing list endpoint")

    return json({
      status: "error",
      message: "Internal server error",
      errors: ["An unexpected error occurred"],
      requestId,
    }, { status: 500 })
  }
}
