import { json, type RequestHandler } from "@sveltejs/kit"
import { PricingService } from "$lib/services/pricing"
import { logger } from "$lib/logger"
import type { PricingUpdateInput } from "$lib/types/pricing"

// GET /api/pricing - Get pricing configuration
export const GET: RequestHandler = async ({ locals }) => {
    const requestId = locals.requestId || "pricing-get"

    try {
        const service = new PricingService()
        const result = await service.getPricingConfig()

        if (result.success) {
            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            return json({
                status: "error",
                message: "Failed to retrieve pricing settings",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error }, "Error in pricing get endpoint")
        return json({
            status: "error",
            message: "Internal server error",
            requestId,
        }, { status: 500 })
    }
}

// PATCH /api/pricing - Update pricing configuration
export const PATCH: RequestHandler = async ({ request, locals }) => {
    const requestId = locals.requestId || "pricing-update"

    try {
        const data: PricingUpdateInput = await request.json()

        const service = new PricingService()
        const result = await service.updatePricingConfig(data, (locals as any).user?.email || "admin")

        if (result.success) {
            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            return json({
                status: "error",
                message: result.error?.[0] || "Failed to update pricing settings",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error }, "Error in pricing update endpoint")
        return json({
            status: "error",
            message: "Internal server error",
            requestId,
        }, { status: 500 })
    }
}
