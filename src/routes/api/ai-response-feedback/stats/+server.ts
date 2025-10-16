import { json, type RequestHandler } from "@sveltejs/kit"
import { getAIResponseFeedbackService } from "$lib/services/ai-response-feedback"
import { logger } from "$lib/logger"

// GET /api/ai-response-feedback/stats - Get AI response feedback statistics
export const GET: RequestHandler = async ({ locals }) => {
  const requestId = locals.requestId || "ai-response-feedback-stats"

  try {
    const service = await getAIResponseFeedbackService()

    logger.info("Fetching AI response feedback statistics", { requestId })

    const stats = await service.getFeedbackStats()

    logger.info("Successfully fetched AI response feedback statistics", {
      requestId,
      total: stats.total,
      thumbsUp: stats.thumbsUp,
      thumbsDown: stats.thumbsDown
    })

    return json({
      status: "success",
      data: stats,
      message: "AI response feedback statistics retrieved successfully"
    })
  } catch (error) {
    logger.error("Failed to fetch AI response feedback statistics", {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    })

    return json(
      {
        status: "error",
        message: "Failed to fetch AI response feedback statistics",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
