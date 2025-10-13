import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { libraryTemplateService } from "$lib/services/library-templates"
import type { LibraryTemplateUpdateInput } from "$lib/types/library-templates"
import { logger, createChildLogger } from "$lib/logger"

// GET /api/library-templates/[id] - Get a specific library template
export const GET: RequestHandler = async ({ params, locals }) => {
  const requestLogger = createChildLogger({ requestId: locals.requestId, endpoint: 'GET /api/library-templates/[id]' })

  try {
    const { id } = params

    requestLogger.debug({ templateId: id }, "Processing library template get request")

    const result = await libraryTemplateService.getById(id)

    if (result.status === "error") {
      const status = result.errors?.includes("template_not_found") ? 404 : 400
      requestLogger.warn({ templateId: id, result }, "Library template get request failed")
      return json(result, { status })
    }

    requestLogger.info({
      templateId: id,
      title: result.data?.title
    }, "Library template retrieved successfully")

    return json(result)
  } catch (error) {
    requestLogger.error({
      templateId: params.id,
      error: error instanceof Error ? error.message : String(error)
    }, "Error in GET /api/library-templates/[id]")
    return json(
      {
        status: "error",
        message: "Internal server error",
        errors: ["internal_error"]
      },
      { status: 500 }
    )
  }
}

// PUT /api/library-templates/[id] - Update a specific library template
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params
    const data: LibraryTemplateUpdateInput = await request.json()

    const result = await libraryTemplateService.update(id, data)

    if (result.status === "error") {
      const status = result.errors?.includes("template_not_found") ? 404 : 400
      return json(result, { status })
    }

    return json(result)
  } catch (error) {
    console.error("Error in PUT /api/library-templates/[id]:", error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return json(
        {
          status: "error",
          message: "Invalid JSON in request body",
          errors: ["invalid_json"]
        },
        { status: 400 }
      )
    }

    return json(
      {
        status: "error",
        message: "Internal server error",
        errors: ["internal_error"]
      },
      { status: 500 }
    )
  }
}

// DELETE /api/library-templates/[id] - Delete a specific library template
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params

    const result = await libraryTemplateService.delete(id)

    if (result.status === "error") {
      const status = result.errors?.includes("template_not_found") ? 404 : 400
      return json(result, { status })
    }

    return json(result)
  } catch (error) {
    console.error("Error in DELETE /api/library-templates/[id]:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
        errors: ["internal_error"]
      },
      { status: 500 }
    )
  }
}
