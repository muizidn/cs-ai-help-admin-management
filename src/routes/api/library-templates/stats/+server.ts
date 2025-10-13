import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { libraryTemplateService } from "$lib/services/library-templates"

// GET /api/library-templates/stats - Get library template statistics
export const GET: RequestHandler = async () => {
  try {
    const result = await libraryTemplateService.getStats()
    
    if (result.status === "error") {
      return json(result, { status: 400 })
    }

    return json(result)
  } catch (error) {
    console.error("Error in GET /api/library-templates/stats:", error)
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
