import { json, type RequestHandler } from "@sveltejs/kit"
import { getAIResponseFeedbackService } from "$lib/services/ai-response-feedback"
import { logger } from "$lib/logger"

// GET /api/ai-response-feedback/[id] - Get specific AI response feedback details
export const GET: RequestHandler = async ({ params, locals }) => {
  const requestId = locals.requestId || "ai-response-feedback-detail"
  const feedbackId = params.id

  if (!feedbackId) {
    return json(
      {
        status: "error",
        message: "Feedback ID is required"
      },
      { status: 400 }
    )
  }

  try {
    const service = await getAIResponseFeedbackService()

    logger.info("Fetching AI response feedback details", { requestId, feedbackId })

    const feedback = await service.getFeedbackById(feedbackId)

    if (!feedback) {
      logger.warn("AI response feedback not found", { requestId, feedbackId })
      return json(
        {
          status: "error",
          message: "AI response feedback not found"
        },
        { status: 404 }
      )
    }

    logger.info("Successfully fetched AI response feedback details", {
      requestId,
      feedbackId,
      feedbackType: feedback.feedbackType
    })

    return json({
      status: "success",
      data: feedback,
      message: "AI response feedback details retrieved successfully"
    })
  } catch (error) {
    logger.error("Failed to fetch AI response feedback details", {
      requestId,
      feedbackId,
      error: error instanceof Error ? error.message : String(error)
    })

    return json(
      {
        status: "error",
        message: "Failed to fetch AI response feedback details",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
