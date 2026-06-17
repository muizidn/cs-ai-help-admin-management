import { json, type RequestHandler } from "@sveltejs/kit"
import { VoucherService } from "$lib/services/voucher"
import { logger } from "$lib/logger"
import type { VoucherUpdateInput } from "$lib/types/voucher"

// GET /api/vouchers/[id] - Get voucher details
export const GET: RequestHandler = async ({ params, locals }) => {
  const requestId = locals.requestId || "voucher-detail"
  const { id } = params

  try {
    const service = new VoucherService()
    const result = await service.getVoucherById(id!)

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
          message: "Voucher not found",
          requestId,
        },
        { status: 404 },
      )
    }
  } catch (error) {
    logger.error({ requestId, error }, "Error in voucher detail endpoint")
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

// PATCH /api/vouchers/[id] - Update voucher
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const requestId = locals.requestId || "voucher-update"
  const { id } = params

  try {
    const data: VoucherUpdateInput = await request.json()
    data.updatedBy = (locals as any).user?.email || "admin"

    const service = new VoucherService()
    const result = await service.updateVoucher(id!, data)

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
          message: result.error?.[0] || "Failed to update voucher",
          requestId,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    logger.error({ requestId, error }, "Error in voucher update endpoint")
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

// DELETE /api/vouchers/[id] - Delete voucher
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const requestId = locals.requestId || "voucher-delete"
  const { id } = params

  try {
    const service = new VoucherService()
    const result = await service.deleteVoucher(id!)

    if (result.success) {
      return json({
        status: "success",
        requestId,
      })
    } else {
      return json(
        {
          status: "error",
          message: "Failed to delete voucher",
          requestId,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    logger.error({ requestId, error }, "Error in voucher delete endpoint")
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
