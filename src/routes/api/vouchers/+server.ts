import { json, type RequestHandler } from "@sveltejs/kit"
import { VoucherService } from "$lib/services/voucher"
import { logger } from "$lib/logger"
import type { VoucherQuery, VoucherCreateInput } from "$lib/types/voucher"

// GET /api/vouchers - List vouchers
export const GET: RequestHandler = async ({ url, locals }) => {
    const requestId = locals.requestId || "voucher-list"

    try {
        const searchParams = url.searchParams

        const query: VoucherQuery = {
            search: searchParams.get("search") || undefined,
            page: parseInt(searchParams.get("page") || "1"),
            limit: parseInt(searchParams.get("limit") || "20"),
            isActive: searchParams.get("isActive") ? searchParams.get("isActive") === "true" : undefined,
            sortBy: (searchParams.get("sortBy") as any) || "createdAt",
            sortOrder: (searchParams.get("sortOrder") as any) || "desc",
        }

        const service = new VoucherService()
        const result = await service.getVouchers(query)

        if (result.success) {
            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            return json({
                status: "error",
                message: "Failed to retrieve vouchers",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error }, "Error in voucher list endpoint")
        return json({
            status: "error",
            message: "Internal server error",
            requestId,
        }, { status: 500 })
    }
}

// POST /api/vouchers - Create voucher
export const POST: RequestHandler = async ({ request, locals }) => {
    const requestId = locals.requestId || "voucher-create"

    try {
        const data: VoucherCreateInput = await request.json()

        const service = new VoucherService()
        const result = await service.createVoucher(data, (locals as any).user?.email || "admin")

        if (result.success) {
            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            return json({
                status: "error",
                message: result.error?.[0] || "Failed to create voucher",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error }, "Error in voucher create endpoint")
        return json({
            status: "error",
            message: "Internal server error",
            requestId,
        }, { status: 500 })
    }
}
