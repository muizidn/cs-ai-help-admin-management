import { json, type RequestHandler } from "@sveltejs/kit"
import { getAIResponseFeedbackService } from "$lib/services/ai-response-feedback"
import { logger } from "$lib/logger"
import type { AIResponseFeedbackQuery, FeedbackType } from "$lib/types/ai-response-feedback"

// GET /api/ai-response-feedback - List AI response feedback with filtering and pagination
export const GET: RequestHandler = async ({ url, locals }) => {
  const requestId = locals.requestId || "ai-response-feedback-list"

  try {
    const service = await getAIResponseFeedbackService()

    // Parse query parameters
    const query: AIResponseFeedbackQuery = {}

    const page = url.searchParams.get("page")
    if (page) query.page = parseInt(page, 10)

    const limit = url.searchParams.get("limit")
    if (limit) query.limit = parseInt(limit, 10)

    const search = url.searchParams.get("search")
    if (search) query.search = search

    const feedbackType = url.searchParams.get("feedbackType")
    if (feedbackType && (feedbackType === "THUMBS_UP" || feedbackType === "THUMBS_DOWN" || feedbackType === "all")) {
      query.feedbackType = feedbackType as FeedbackType | "all"
    }

    const conversationId = url.searchParams.get("conversationId")
    if (conversationId) query.conversationId = conversationId

    const messageId = url.searchParams.get("messageId")
    if (messageId) query.messageId = messageId

    const organizationId = url.searchParams.get("organizationId")
    if (organizationId) query.organizationId = organizationId

    const createdBy = url.searchParams.get("createdBy")
    if (createdBy) query.createdBy = createdBy

    const startDate = url.searchParams.get("start_date")
    if (startDate) query.start_date = startDate

    const endDate = url.searchParams.get("end_date")
    if (endDate) query.end_date = endDate

    const sortBy = url.searchParams.get("sort_by")
    if (sortBy && ["createdAt", "updatedAt", "feedbackType"].includes(sortBy)) {
      query.sort_by = sortBy as "createdAt" | "updatedAt" | "feedbackType"
    }

    const sortOrder = url.searchParams.get("sort_order")
    if (sortOrder && ["asc", "desc"].includes(sortOrder)) {
      query.sort_order = sortOrder as "asc" | "desc"
    }

    logger.info("Fetching AI response feedback list", { requestId, query })

    const result = await service.getFeedbackList(query)

    logger.info("Successfully fetched AI response feedback list", {
      requestId,
      total: result.total,
      page: result.page,
      itemCount: result.items.length
    })

    return json({
      status: "success",
      data: result,
      message: "AI response feedback list retrieved successfully"
    })
  } catch (error) {
    logger.error("Failed to fetch AI response feedback list", {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    })

    return json(
      {
        status: "error",
        message: "Failed to fetch AI response feedback list",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
