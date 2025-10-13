// System Prompts API Routes - Main CRUD operations

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { MongoDBSystemPromptsRepository } from "../../../lib/repositories/mongodb-system-prompts-repository"
import { SystemPromptsService } from "../../../lib/services/system-prompts-service"
import { getDatabase } from "../../../lib/mongodb"
import type {
  SystemPromptFilter,
  SystemPromptCreateInput,
} from "../../../lib/types/system-prompts"

let systemPromptsService: SystemPromptsService

async function getSystemPromptsService(): Promise<SystemPromptsService> {
  if (!systemPromptsService) {
    const db = await getDatabase()
    const repository = new MongoDBSystemPromptsRepository(db)
    systemPromptsService = new SystemPromptsService(repository)
  }
  return systemPromptsService
}

// GET /api/system-prompts - List system prompts with filtering
export const GET: RequestHandler = async ({ url }) => {
  try {
    const service = await getSystemPromptsService()

    // Parse query parameters
    const filter: SystemPromptFilter = {}

    const type = url.searchParams.get("type")
    if (type) filter.type = type as any

    const isActive = url.searchParams.get("isActive")
    if (isActive !== null) filter.isActive = isActive === "true"

    const search = url.searchParams.get("search")
    if (search) filter.search = search

    const tags = url.searchParams.get("tags")
    if (tags) filter.tags = tags.split(",").filter(Boolean)

    const sortBy = url.searchParams.get("sortBy")
    if (sortBy) filter.sortBy = sortBy as any

    const sortOrder = url.searchParams.get("sortOrder")
    if (sortOrder) filter.sortOrder = sortOrder as any

    const limit = url.searchParams.get("limit")
    if (limit) filter.limit = parseInt(limit, 10)

    const offset = url.searchParams.get("offset")
    if (offset) filter.offset = parseInt(offset, 10)

    const result = await service.listSystemPrompts(filter)

    if (result.status === "success") {
      return json(result)
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Error in GET /api/system-prompts:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}

// POST /api/system-prompts - Create new system prompt
export const POST: RequestHandler = async ({ request }) => {
  try {
    const service = await getSystemPromptsService()
    const data: SystemPromptCreateInput = await request.json()

    const result = await service.createSystemPrompt(data)

    if (result.status === "success") {
      return json(result, { status: 201 })
    } else {
      return json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Error in POST /api/system-prompts:", error)
    return json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
