import { json, type RequestHandler } from "@sveltejs/kit"
import { UserBillingService } from "$lib/services/user-billing"
import { logger } from "$lib/logger"
import type { TransactionQuery } from "$lib/types/user-billing"

// GET /api/transactions - List transactions with filtering and pagination
export const GET: RequestHandler = async ({ url, locals }) => {
  const requestId = locals.requestId || "transactions-list"

  try {
    const searchParams = url.searchParams
    
    const query: TransactionQuery = {
      search: searchParams.get("search") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      userId: searchParams.get("userId") || undefined,
      type: (searchParams.get("type") as any) || undefined,
      status: (searchParams.get("status") as any) || undefined,
      sortBy: (searchParams.get("sortBy") as any) || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as any) || "desc",
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    }

    logger.info({
      requestId,
      type: "transactions_list_request",
      query,
    }, "Processing transactions list request")

    const service = new UserBillingService()
    const result = await service.getTransactions(query)

    if (result.success) {
      logger.info({
        requestId,
        type: "transactions_list_success",
        totalTransactions: result.data?.pagination.total,
        page: result.data?.pagination.page,
      }, "Transactions list retrieved successfully")

      return json({
        status: "success",
        data: result.data,
        requestId,
      })
    } else {
      logger.warn({
        requestId,
        type: "transactions_list_failed",
        errors: result.error,
      }, "Failed to retrieve transactions list")

      return json({
        status: "error",
        message: "Failed to retrieve transactions",
        errors: result.error,
        requestId,
      }, { status: 400 })
    }
  } catch (error) {
    logger.error({
      requestId,
      type: "transactions_list_error",
      error: error instanceof Error ? error.message : String(error),
    }, "Error in transactions list endpoint")

    return json({
      status: "error",
      message: "Internal server error",
      errors: ["An unexpected error occurred"],
      requestId,
    }, { status: 500 })
  }
}
