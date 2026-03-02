import { json, type RequestHandler } from "@sveltejs/kit"
import { PricingService } from "$lib/services/pricing"
import { logger } from "$lib/logger"
import type { PricingUpdateInput } from "$lib/types/pricing"

// GET /api/pricing - Get pricing configuration(s)
export const GET: RequestHandler = async ({ url, locals }) => {
    const requestId = locals.requestId || "pricing-get"
    const id = url.searchParams.get("id")

    try {
        const service = new PricingService()

        if (id) {
            const result = await service.getPricingConfigById(id)
            return json({ status: result.success ? "success" : "error", data: result.data, message: result.error?.[0], requestId }, { status: result.success ? 200 : 400 })
        }

        const result = await service.getPricingConfigs()
        return json({ status: "success", data: result.data, requestId })
    } catch (error) {
        logger.error({ requestId, error }, "Error in pricing get endpoint")
        return json({ status: "error", message: "Internal server error", requestId }, { status: 500 })
    }
}

// POST /api/pricing - Create new pricing configuration
export const POST: RequestHandler = async ({ request, locals }) => {
    const requestId = locals.requestId || "pricing-create"

    try {
        const data: PricingUpdateInput = await request.json()
        const service = new PricingService()
        const result = await service.createPricingConfig(data, (locals as any).user?.email || "admin")

        if (result.success) {
            return json({ status: "success", data: result.data, requestId })
        } else {
            return json({ status: "error", message: result.error?.[0], errors: result.error, requestId }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error }, "Error in pricing create endpoint")
        return json({ status: "error", message: "Internal server error", requestId }, { status: 500 })
    }
}

// PATCH /api/pricing - Update pricing configuration
export const PATCH: RequestHandler = async ({ request, url, locals }) => {
    const requestId = locals.requestId || "pricing-update"
    const id = url.searchParams.get("id") // null for global

    try {
        const data: PricingUpdateInput = await request.json()
        const service = new PricingService()
        const result = await service.updatePricingConfig(id, data, (locals as any).user?.email || "admin")

        if (result.success) {
            return json({ status: "success", data: result.data, requestId })
        } else {
            return json({ status: "error", message: result.error?.[0], requestId }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error }, "Error in pricing update endpoint")
        return json({ status: "error", message: "Internal server error", requestId }, { status: 500 })
    }
}

// DELETE /api/pricing - Delete pricing configuration
export const DELETE: RequestHandler = async ({ url, locals }) => {
    const requestId = locals.requestId || "pricing-delete"
    const id = url.searchParams.get("id")

    if (!id) {
        return json({ status: "error", message: "ID is required", requestId }, { status: 400 })
    }

    try {
        const service = new PricingService()
        const result = await service.deletePricingConfig(id)

        if (result.success) {
            return json({ status: "success", requestId })
        } else {
            return json({ status: "error", message: result.error?.[0], requestId }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error }, "Error in pricing delete endpoint")
        return json({ status: "error", message: "Internal server error", requestId }, { status: 500 })
    }
}
