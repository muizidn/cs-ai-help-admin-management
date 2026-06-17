import { json, type RequestHandler } from "@sveltejs/kit"
import { TransactionService } from "$lib/services/transactions"
import { logger } from "$lib/logger"

// PUT /api/users/[id]/credit - Update user credit balance
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const requestId = locals.requestId || "user-credit-update"
  const userId = params.id

  if (!userId) {
    return json(
      {
        status: "error",
        message: "User ID is required",
        errors: ["User ID is required"],
        requestId,
      },
      { status: 400 },
    )
  }

  try {
    const { creditBalance, reason } = await request.json()

    if (typeof creditBalance !== "number" || creditBalance < 0) {
      return json(
        {
          status: "error",
          message: "Valid credit balance is required",
          errors: ["Credit balance must be a non-negative number"],
          requestId,
        },
        { status: 400 },
      )
    }

    if (!reason || !reason.trim()) {
      return json(
        {
          status: "error",
          message: "A reason is required for any manual credit adjustment",
          errors: ["Reason is required"],
          requestId,
        },
        { status: 400 },
      )
    }

    logger.info(
      {
        requestId,
        type: "user_credit_update_request",
        userId,
        creditBalance,
        reason,
      },
      "Processing user credit update request",
    )

    const service = new TransactionService()
    const result = await service.updateUserCredit(
      userId,
      creditBalance,
      "admin",
      reason || "",
    )

    if (result.success) {
      logger.info(
        {
          requestId,
          type: "user_credit_update_success",
          userId,
          creditBalance,
          reason,
        },
        "User credit updated successfully",
      )

      return json({
        status: "success",
        data: result.data,
        requestId,
      })
    } else {
      logger.warn(
        {
          requestId,
          type: "user_credit_update_failed",
          userId,
          errors: result.error,
        },
        "Failed to update user credit",
      )

      return json(
        {
          status: "error",
          message: "Failed to update user credit",
          errors: result.error,
          requestId,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    logger.error(
      {
        requestId,
        type: "user_credit_update_error",
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Error in user credit update endpoint",
    )

    return json(
      {
        status: "error",
        message: "Internal server error",
        errors: ["An unexpected error occurred"],
        requestId,
      },
      { status: 500 },
    )
  }
}
