import { json, type RequestHandler } from "@sveltejs/kit"
import { executionLogRepository } from "$lib/repositories/execution-logs"
import { logger } from "$lib/logger"

// PATCH /api/ai-execution-log/[id]/flag
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    const requestId = locals.requestId || "ai-execution-log-flag"
    const { id } = params

    if (!id) {
        return json({ status: "error", message: "Missing ID" }, { status: 400 })
    }

    try {
        const body = await request.json()
        const flag = body.flag === null || body.flag === undefined ? null : String(body.flag)

        logger.info({ requestId, id, flag, type: "update_log_flag" }, "Updating execution log flag")

        const success = await executionLogRepository.updateFlag(id, flag)

        if (success) {
            return json({ status: "success", data: { id, flag } })
        } else {
            return json({ status: "error", message: "Failed to update flag or log not found." }, { status: 400 })
        }
    } catch (error) {
        logger.error(
            { requestId, error: error instanceof Error ? error.message : String(error) },
            "Error updating execution log flag"
        )
        return json({ status: "error", message: "Internal server error" }, { status: 500 })
    }
}
