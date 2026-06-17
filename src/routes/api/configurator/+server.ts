import { json, type RequestHandler } from "@sveltejs/kit"
import { getExecutionLogService } from "$lib/services/execution-logs"
import { logger } from "$lib/logger"

// GET /api/configurator - Get configuration from Redis
export const GET: RequestHandler = async ({ locals }) => {
  const requestId = locals.requestId || "configurator-get"

  try {
    const service = await getExecutionLogService()

    logger.info(
      {
        requestId,
        type: "configurator_get_request",
      },
      "Getting configuration from Redis",
    )

    const result = await service.getLlmModel()

    if (result.status === "success") {
      return json(result)
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : error,
        type: "configurator_get_exception",
      },
      "Exception in GET /api/configurator",
    )

    return json(
      {
        status: "error",
        message: "Internal server error",
        errors: ["Internal server error"],
      },
      { status: 500 },
    )
  }
}

// PUT /api/configurator - Update configuration in Redis
export const PUT: RequestHandler = async ({ request, locals }) => {
  const requestId = locals.requestId || "configurator-update"

  try {
    const service = await getExecutionLogService()
    const { model } = await request.json()

    if (!model) {
      return json(
        {
          status: "error",
          message: "Missing required field: model",
          errors: ["Missing required field: model"],
        },
        { status: 400 },
      )
    }

    logger.info(
      {
        requestId,
        model,
        type: "configurator_update_request",
      },
      "Updating LLM model in Redis",
    )

    const result = await service.updateLlmModel(model)

    if (result.status === "success") {
      return json(result)
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : error,
        type: "configurator_update_exception",
      },
      "Exception in PUT /api/configurator",
    )

    return json(
      {
        status: "error",
        message: "Internal server error",
        errors: ["Internal server error"],
      },
      { status: 500 },
    )
  }
}
