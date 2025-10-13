import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { libraryTemplateService } from "$lib/services/library-templates"

// POST /api/library-templates/[id]/download - Increment download count
export const POST: RequestHandler = async ({ params }) => {
  try {
    const { id } = params
    
    const result = await libraryTemplateService.incrementDownloadCount(id)
    
    if (result.status === "error") {
      return json(result, { status: 400 })
    }

    return json(result)
  } catch (error) {
    console.error("Error in POST /api/library-templates/[id]/download:", error)
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
