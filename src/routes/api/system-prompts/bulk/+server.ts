// System Prompts API Routes - Bulk operations

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

// POST /api/system-prompts/bulk - Handle bulk operations (placeholder)
export const POST: RequestHandler = async ({ request }) => {
  try {
    return json(
      {
        status: "error",
        message:
          "Use specific bulk operation endpoints: /bulk/toggle or /bulk/delete",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("Error in POST /api/system-prompts/bulk:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
