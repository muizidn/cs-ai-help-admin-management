// System Prompts API Routes - Individual prompt operations

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { MongoDBSystemPromptsRepository } from "../../../../lib/repositories/mongodb-system-prompts-repository"
import { SystemPromptsService } from "../../../../lib/services/system-prompts-service"
import { getDatabase } from "../../../../lib/mongodb"
import type { SystemPromptUpdateInput } from "../../../../lib/types/system-prompts"

let systemPromptsService: SystemPromptsService

async function getSystemPromptsService(): Promise<SystemPromptsService> {
  if (!systemPromptsService) {
    const db = await getDatabase()
    const repository = new MongoDBSystemPromptsRepository(db)
    systemPromptsService = new SystemPromptsService(repository)
  }
  return systemPromptsService
}

// GET /api/system-prompts/[id] - Get single system prompt
export const GET: RequestHandler = async ({ params }) => {
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

    const result = await service.getSystemPrompt(id)

    if (result.status === "success") {
      return json(result)
    } else {
      return json(result, {
        status: result.message === "System prompt not found" ? 404 : 400,
      })
    }
  } catch (error) {
    console.error("Error in GET /api/system-prompts/[id]:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}

// PUT /api/system-prompts/[id] - Update system prompt
export const PUT: RequestHandler = async ({ params, request }) => {
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

    const data: SystemPromptUpdateInput = await request.json()
    const result = await service.updateSystemPrompt(id, data)

    if (result.status === "success") {
      return json(result)
    } else {
      return json(result, {
        status: result.message === "System prompt not found" ? 404 : 400,
      })
    }
  } catch (error) {
    console.error("Error in PUT /api/system-prompts/[id]:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}

// DELETE /api/system-prompts/[id] - Delete system prompt
export const DELETE: RequestHandler = async ({ params }) => {
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

    const result = await service.deleteSystemPrompt(id)

    if (result.status === "success") {
      return json(result)
    } else {
      return json(result, {
        status: result.message === "System prompt not found" ? 404 : 400,
      })
    }
  } catch (error) {
    console.error("Error in DELETE /api/system-prompts/[id]:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
