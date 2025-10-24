import { json, type RequestHandler } from "@sveltejs/kit"
import { UserBillingService } from "$lib/services/user-billing"
import { logger } from "$lib/logger"
import type { TransactionUpdateInput } from "$lib/types/user-billing"

// GET /api/transactions/[id] - Get transaction by ID
export const GET: RequestHandler = async ({ params, locals }) => {
  const requestId = locals.requestId || "transaction-get"
  const transactionId = params.id

  if (!transactionId) {
    return json(
      {
        status: "error",
        message: "Transaction ID is required",
        errors: ["Transaction ID is required"],
        requestId,
      },
      { status: 400 },
    )
  }

  try {
    logger.info(
      {
        requestId,
        type: "transaction_get_request",
        transactionId,
      },
      "Processing transaction get request",
    )

    const service = new UserBillingService()

    // Get transaction by transaction ID
    const result = await service.getTransactionById(transactionId)

    if (result.success && result.data) {
      logger.info(
        {
          requestId,
          type: "transaction_get_success",
          transactionId,
        },
        "Transaction retrieved successfully",
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
          type: "transaction_not_found",
          transactionId,
        },
        "Transaction not found",
      )

      return json(
        {
          status: "error",
          message: "Transaction not found",
          errors: ["Transaction not found"],
          requestId,
        },
        { status: 404 },
      )
    }
  } catch (error) {
    logger.error(
      {
        requestId,
        type: "transaction_get_error",
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Error in transaction get endpoint",
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

// PUT /api/transactions/[id] - Update transaction
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const requestId = locals.requestId || "transaction-update"
  const transactionId = params.id

  if (!transactionId) {
    return json(
      {
        status: "error",
        message: "Transaction ID is required",
        errors: ["Transaction ID is required"],
        requestId,
      },
      { status: 400 },
    )
  }

  try {
    const updateData: TransactionUpdateInput = await request.json()

    logger.info(
      {
        requestId,
        type: "transaction_update_request",
        transactionId,
        updateData,
      },
      "Processing transaction update request",
    )

    const service = new UserBillingService()
    const result = await service.updateTransaction(transactionId, {
      ...updateData,
      updatedBy: "admin", // Set admin as updater
    })

    if (result.success) {
      logger.info(
        {
          requestId,
          type: "transaction_update_success",
          transactionId,
        },
        "Transaction updated successfully",
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
          type: "transaction_update_failed",
          transactionId,
          errors: result.error,
        },
        "Failed to update transaction",
      )

      return json(
        {
          status: "error",
          message: "Failed to update transaction",
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
        type: "transaction_update_error",
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Error in transaction update endpoint",
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
