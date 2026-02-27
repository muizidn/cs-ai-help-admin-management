import { json, type RequestHandler } from "@sveltejs/kit"
import { TransactionService } from "$lib/services/transactions"
import { logger } from "$lib/logger"
import type { UserUpdateInput } from "$lib/types/transactions"

// GET /api/users/[id] - Get specific user details
export const GET: RequestHandler = async ({ params, locals }) => {
    const requestId = locals.requestId || "user-detail"
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
        logger.info({
            requestId,
            type: "user_detail_request",
            userId,
        }, "Processing user detail request")

        const service = new TransactionService()
        const result = await service.getUserById(userId)

        if (result.success) {
            logger.info({
                requestId,
                type: "user_detail_success",
                userId,
            }, "User detail retrieved successfully")

            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            logger.warn({
                requestId,
                type: "user_detail_failed",
                userId,
                errors: result.error,
            }, "Failed to retrieve user detail")

            return json({
                status: "error",
                message: "Failed to retrieve user",
                errors: result.error,
                requestId,
            }, { status: 404 })
        }
    } catch (error) {
        logger.error({
            requestId,
            type: "user_detail_error",
            userId,
            error: error instanceof Error ? error.message : String(error),
        }, "Error in user detail endpoint")

        return json({
            status: "error",
            message: "Internal server error",
            errors: ["An unexpected error occurred"],
            requestId,
        }, { status: 500 })
    }
}

// PUT /api/users/[id] - Update user information
export const PUT: RequestHandler = async ({ params, request, locals }) => {
    const requestId = locals.requestId || "user-update"
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
        const updateData: UserUpdateInput = await request.json()

        if (!updateData.reason || !updateData.reason.trim()) {
            return json({
                status: "error",
                message: "A reason is required for any manual user update",
                errors: ["Reason is required"],
                requestId,
            }, { status: 400 })
        }

        logger.info({
            requestId,
            type: "user_update_request",
            userId,
            updateData,
        }, "Processing user update request")

        const service = new TransactionService()
        const result = await service.updateUser(userId, updateData)

        if (result.success) {
            logger.info({
                requestId,
                type: "user_update_success",
                userId,
            }, "User updated successfully")

            return json({
                status: "success",
                data: result.data,
                message: "User updated successfully",
                requestId,
            })
        } else {
            logger.warn({
                requestId,
                type: "user_update_failed",
                userId,
                errors: result.error,
            }, "Failed to update user")

            return json({
                status: "error",
                message: "Failed to update user",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({
            requestId,
            type: "user_update_error",
            userId,
            error: error instanceof Error ? error.message : String(error),
        }, "Error in user update endpoint")

        return json({
            status: "error",
            message: "Internal server error",
            errors: ["An unexpected error occurred"],
            requestId,
        }, { status: 500 })
    }
}
