// System Prompts API Routes - Bulk toggle active status

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { MongoDBSystemPromptsRepository } from "../../../../../lib/repositories/mongodb-system-prompts-repository"
import { SystemPromptsService } from "../../../../../lib/services/system-prompts-service"
import { getDatabase } from "../../../../../lib/mongodb"

let systemPromptsService: SystemPromptsService

async function getSystemPromptsService(): Promise<SystemPromptsService> {
  if (!systemPromptsService) {
    const db = await getDatabase()
    const repository = new MongoDBSystemPromptsRepository(db)
    systemPromptsService = new SystemPromptsService(repository)
  }
  return systemPromptsService
}

// POST /api/system-prompts/bulk/toggle - Bulk toggle active status
export const POST: RequestHandler = async ({ request }) => {
  try {
    const service = await getSystemPromptsService()
    const { ids, isActive } = await request.json()

    if (!Array.isArray(ids) || typeof isActive !== "boolean") {
      return json(
        {
          status: "error",
          message:
            "Invalid request data. Expected { ids: string[], isActive: boolean }",
        },
        { status: 400 },
      )
    }

    const result = await service.bulkToggleActive(ids, isActive)

    if (result.status === "success") {
      return json(result)
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Error in POST /api/system-prompts/bulk/toggle:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
