import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { libraryTemplateService } from "$lib/services/library-templates"

// GET /api/library-templates/search - Search library templates
export const GET: RequestHandler = async ({ url }) => {
  try {
    const searchParams = url.searchParams
    const query = searchParams.get("q") || searchParams.get("query")
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20
    
    if (!query) {
      return json(
        {
          status: "error",
          message: "Search query is required",
          errors: ["query_required"]
        },
        { status: 400 }
      )
    }

    const result = await libraryTemplateService.search(query, limit)
    
    if (result.status === "error") {
      return json(result, { status: 400 })
    }

    return json(result)
  } catch (error) {
    console.error("Error in GET /api/library-templates/search:", error)
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
