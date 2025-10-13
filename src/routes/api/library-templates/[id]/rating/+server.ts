import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { libraryTemplateService } from "$lib/services/library-templates"

// PUT /api/library-templates/[id]/rating - Update template rating
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params
    const { rating } = await request.json()
    
    if (typeof rating !== "number") {
      return json(
        {
          status: "error",
          message: "Rating must be a number",
          errors: ["invalid_rating_type"]
        },
        { status: 400 }
      )
    }

    const result = await libraryTemplateService.updateRating(id, rating)
    
    if (result.status === "error") {
      return json(result, { status: 400 })
    }

    return json(result)
  } catch (error) {
    console.error("Error in PUT /api/library-templates/[id]/rating:", error)
    
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
