import { json, type RequestHandler } from "@sveltejs/kit"
import { VoucherService } from "$lib/services/voucher"
import { logger } from "$lib/logger"

// GET /api/vouchers/[id]/transactions - Get linked transactions
export const GET: RequestHandler = async ({ params, locals }) => {
  const requestId = locals.requestId || "voucher-transactions"
  const { id } = params

  try {
    const service = new VoucherService()
    const result = await service.getVoucherTransactions(id!)

    if (result.success) {
      return json({
        status: "success",
        data: result.data,
        requestId,
      })
    } else {
      return json(
        {
          status: "error",
          message: result.error?.[0] || "Failed to load transactions",
          requestId,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    logger.error({ requestId, error }, "Error in voucher transactions endpoint")
    return json(
      {
        status: "error",
        message: "Internal server error",
        requestId,
      },
      { status: 500 },
    )
  }
}
