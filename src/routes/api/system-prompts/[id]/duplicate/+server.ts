// System Prompts API Routes - Duplicate operation

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

// POST /api/system-prompts/[id]/duplicate - Duplicate system prompt
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const service = await getSystemPromptsService()
    const { id } = params

    if (!id) {
      return json(
        {
          status: "error",
          message: "ID parameter is required",
        },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const { newTitle } = body

    const result = await service.duplicateSystemPrompt(id, newTitle)

    if (result.status === "success") {
      return json(result, { status: 201 })
    } else {
      return json(result, {
        status: result.message === "System prompt not found" ? 404 : 400,
      })
    }
  } catch (error) {
    console.error("Error in POST /api/system-prompts/[id]/duplicate:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
