import { json, type RequestHandler } from "@sveltejs/kit"
import { UserBillingService } from "$lib/services/user-billing"
import { logger } from "$lib/logger"

// PUT /api/user-billing/[id]/credit - Update user credit balance
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const requestId = locals.requestId || "user-credit-update"
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
    const { creditBalance } = await request.json()

    if (typeof creditBalance !== "number" || creditBalance < 0) {
      return json({
        status: "error",
        message: "Valid credit balance is required",
        errors: ["Credit balance must be a non-negative number"],
        requestId,
      }, { status: 400 })
    }

    logger.info({
      requestId,
      type: "user_credit_update_request",
      userId,
      creditBalance,
    }, "Processing user credit update request")

    const service = new UserBillingService()
    const result = await service.updateUserCredit(userId, creditBalance, "admin")

    if (result.success) {
      logger.info({
        requestId,
        type: "user_credit_update_success",
        userId,
        creditBalance,
      }, "User credit updated successfully")

      return json({
        status: "success",
        data: result.data,
        requestId,
      })
    } else {
      logger.warn({
        requestId,
        type: "user_credit_update_failed",
        userId,
        errors: result.error,
      }, "Failed to update user credit")

      return json({
        status: "error",
        message: "Failed to update user credit",
        errors: result.error,
        requestId,
      }, { status: 400 })
    }
  } catch (error) {
    logger.error({
      requestId,
      type: "user_credit_update_error",
      userId,
      error: error instanceof Error ? error.message : String(error),
    }, "Error in user credit update endpoint")

    return json({
      status: "error",
      message: "Internal server error",
      errors: ["An unexpected error occurred"],
      requestId,
    }, { status: 500 })
  }
}
