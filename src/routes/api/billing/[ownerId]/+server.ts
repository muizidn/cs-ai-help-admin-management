import { json, type RequestHandler } from "@sveltejs/kit"
import { BillingService } from "$lib/services/billing"
import { logger } from "$lib/logger"

// PUT /api/billing/[ownerId] - Update billing state for a user or organization
export const PUT: RequestHandler = async ({ params, request, locals }) => {
    const requestId = locals.requestId || "billing-update"
    const ownerId = params.ownerId

    if (!ownerId) {
        return json({
            status: "error",
            message: "Owner ID is required",
            errors: ["Owner ID is required"],
            requestId,
        }, { status: 400 })
    }

    try {
        const { reason, ...updates } = await request.json()

        if (!reason || !reason.trim()) {
            return json({
                status: "error",
                message: "A reason is required for any manual billing adjustment",
                errors: ["Reason is required"],
                requestId,
            }, { status: 400 })
        }

        logger.info({
            requestId,
            type: "billing_state_update_request",
            ownerId,
            updates,
            reason
        }, "Processing billing state update request")

        const service = new BillingService()
        const result = await service.updateBillingState(ownerId, updates, reason || "")

        if (result.success) {
            logger.info({
                requestId,
                type: "billing_state_update_success",
                ownerId,
            }, "Billing state updated successfully")

            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            logger.warn({
                requestId,
                type: "billing_state_update_failed",
                ownerId,
                errors: result.error,
            }, "Failed to update billing state")

            return json({
                status: "error",
                message: result.error?.[0] || "Failed to update billing state",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({
            requestId,
            type: "billing_state_update_error",
            ownerId,
            error: error instanceof Error ? error.message : String(error),
        }, "Error in billing state update endpoint")

        return json({
            status: "error",
            message: "Internal server error",
            errors: ["An unexpected error occurred"],
            requestId,
        }, { status: 500 })
    }
}
