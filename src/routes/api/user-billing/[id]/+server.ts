import { json, type RequestHandler } from "@sveltejs/kit"
import { UserBillingService } from "$lib/services/user-billing"
import { logger } from "$lib/logger"
import type { UserUpdateInput } from "$lib/types/user-billing"

// GET /api/user-billing/[id] - Get specific user with billing details
export const GET: RequestHandler = async ({ params, locals }) => {
  const requestId = locals.requestId || "user-billing-detail"
  const userId = params.id

  if (!userId) {
    return json({
      status: "error",
      message: "User ID is required",
      errors: ["User ID is required"],
      requestId,
    }, { status: 400 })
  }

  try {
    logger.info({
      requestId,
      type: "user_billing_detail_request",
      userId,
    }, "Processing user billing detail request")

    const service = new UserBillingService()
    const result = await service.getUserById(userId)

    if (result.success) {
      logger.info({
        requestId,
        type: "user_billing_detail_success",
        userId,
      }, "User billing detail retrieved successfully")

      return json({
        status: "success",
        data: result.data,
        requestId,
      })
    } else {
      logger.warn({
        requestId,
        type: "user_billing_detail_failed",
        userId,
        errors: result.error,
      }, "Failed to retrieve user billing detail")

      return json({
        status: "error",
        message: "Failed to retrieve user",
        errors: result.error,
        requestId,
      }, { status: 404 })
    }
  } catch (error) {
    logger.error({
      requestId,
      type: "user_billing_detail_error",
      userId,
      error: error instanceof Error ? error.message : String(error),
    }, "Error in user billing detail endpoint")

    return json({
      status: "error",
      message: "Internal server error",
      errors: ["An unexpected error occurred"],
      requestId,
    }, { status: 500 })
  }
}

// PUT /api/user-billing/[id] - Update user billing information
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const requestId = locals.requestId || "user-billing-update"
  const userId = params.id

  if (!userId) {
    return json({
      status: "error",
      message: "User ID is required",
      errors: ["User ID is required"],
      requestId,
    }, { status: 400 })
  }

  try {
    const updateData: UserUpdateInput = await request.json()

    logger.info({
      requestId,
      type: "user_billing_update_request",
      userId,
      updateData,
    }, "Processing user billing update request")

    const service = new UserBillingService()
    const result = await service.updateUser(userId, updateData)

    if (result.success) {
      logger.info({
        requestId,
        type: "user_billing_update_success",
        userId,
      }, "User billing updated successfully")

      return json({
        status: "success",
        data: result.data,
        message: "User updated successfully",
        requestId,
      })
    } else {
      logger.warn({
        requestId,
        type: "user_billing_update_failed",
        userId,
        errors: result.error,
      }, "Failed to update user billing")

      return json({
        status: "error",
        message: "Failed to update user",
        errors: result.error,
        requestId,
      }, { status: 400 })
    }
  } catch (error) {
    logger.error({
      requestId,
      type: "user_billing_update_error",
      userId,
      error: error instanceof Error ? error.message : String(error),
    }, "Error in user billing update endpoint")

    return json({
      status: "error",
      message: "Internal server error",
      errors: ["An unexpected error occurred"],
      requestId,
    }, { status: 500 })
  }
}
