// System Prompts API Routes - Statistics

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { MongoDBSystemPromptsRepository } from "../../../../lib/repositories/mongodb-system-prompts-repository"
import { SystemPromptsService } from "../../../../lib/services/system-prompts-service"
import { getDatabase } from "../../../../lib/mongodb"

let systemPromptsService: SystemPromptsService

async function getSystemPromptsService(): Promise<SystemPromptsService> {
  if (!systemPromptsService) {
    const db = await getDatabase()
    const repository = new MongoDBSystemPromptsRepository(db)
    systemPromptsService = new SystemPromptsService(repository)
  }
  return systemPromptsService
}

// GET /api/system-prompts/stats - Get system prompts statistics
export const GET: RequestHandler = async () => {
  try {
    const service = await getSystemPromptsService()
    const result = await service.getStats()

    if (result.status === "success") {
      return json(result)
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Error in GET /api/system-prompts/stats:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
