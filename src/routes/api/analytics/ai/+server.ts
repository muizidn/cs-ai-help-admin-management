import { json, type RequestHandler } from "@sveltejs/kit"
import { AnalyticsService } from "$lib/services/analytics"
import { logger } from "$lib/logger"

export const GET: RequestHandler = async ({ url, locals }) => {
  const requestId = locals.requestId || "analytics-ai"

  try {
    const searchParams = url.searchParams

    const query = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      ownerId: searchParams.get("ownerId") || undefined,
      ownerType: (searchParams.get("ownerType") as any) || undefined,
    }

    const service = new AnalyticsService()
    const result = await service.getAiAnalytics(query)

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
          message: "Failed to retrieve analytics",
          errors: (result as any).error,
          requestId,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Error in analytics ai endpoint",
    )
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
