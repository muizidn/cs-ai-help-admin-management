import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { libraryTemplateService } from "$lib/services/library-templates"
import type { LibraryTemplateCreateInput, LibraryTemplateFilter } from "$lib/types/library-templates"
import { logger, createChildLogger } from "$lib/logger"

// GET /api/library-templates - Get all library templates with filtering
export const GET: RequestHandler = async ({ url, locals }) => {
  const requestLogger = createChildLogger({ requestId: locals.requestId, endpoint: 'GET /api/library-templates' })

  try {
    const searchParams = url.searchParams

    const filter: LibraryTemplateFilter = {
      type: searchParams.get("type") as any || undefined,
      category: searchParams.get("category") as any || undefined,
      tags: searchParams.get("tags")?.split(",").filter(Boolean) || undefined,
      isActive: searchParams.get("isActive") ? searchParams.get("isActive") === "true" : undefined,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") as any || "createdAt",
      sortOrder: searchParams.get("sortOrder") as any || "desc",
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0
    }

    requestLogger.debug({ filter }, "Processing library templates list request")

    const result = await libraryTemplateService.getAll(filter)

    if (result.status === "error") {
      requestLogger.warn({ result }, "Library templates list request failed")
      return json(result, { status: 400 })
    }

    requestLogger.info({
      totalResults: result.data?.total || 0,
      returnedItems: result.data?.items?.length || 0
    }, "Library templates list request successful")

    return json(result)
  } catch (error) {
    requestLogger.error({ error: error instanceof Error ? error.message : String(error) }, "Error in GET /api/library-templates")
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

// POST /api/library-templates - Create a new library template
export const POST: RequestHandler = async ({ request, locals }) => {
  const requestLogger = createChildLogger({ requestId: locals.requestId, endpoint: 'POST /api/library-templates' })

  try {
    const data: LibraryTemplateCreateInput = await request.json()

    requestLogger.debug({
      title: data.title,
      type: data.type,
      category: data.category
    }, "Processing library template creation request")

    const result = await libraryTemplateService.create(data)

    if (result.status === "error") {
      requestLogger.warn({ result }, "Library template creation failed")
      return json(result, { status: 400 })
    }

    requestLogger.info({
      templateId: result.data?.id,
      title: result.data?.title
    }, "Library template created successfully")

    return json(result, { status: 201 })
  } catch (error) {
    requestLogger.error({ error: error instanceof Error ? error.message : String(error) }, "Error in POST /api/library-templates")

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      requestLogger.warn("Invalid JSON in request body")
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
