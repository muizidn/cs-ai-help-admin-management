import { json, type RequestHandler } from "@sveltejs/kit"
import { OrganizationService } from "$lib/services/organization"
import { logger } from "$lib/logger"

export const GET: RequestHandler = async ({ url, locals }) => {
    const requestId = locals.requestId || "org-list"

    try {
        const search = url.searchParams.get("search") || ""
        const page = parseInt(url.searchParams.get("page") || "1")
        const limit = parseInt(url.searchParams.get("limit") || "20")
        const sortBy = url.searchParams.get("sortBy") || "createdAt"
        const sortOrder = (url.searchParams.get("sortOrder") as "asc" | "desc") || "desc"

        const service = new OrganizationService()
        const result = await service.getOrganizations({
            search,
            page,
            limit,
            sortBy,
            sortOrder
        })

        if (result.success) {
            return json({
                status: "success",
                data: result.data,
                requestId,
            })
        } else {
            return json({
                status: "error",
                message: "Failed to retrieve organizations",
                errors: result.error,
                requestId,
            }, { status: 400 })
        }
    } catch (error) {
        logger.error({ requestId, error }, "Error in organization list endpoint")
        return json({
            status: "error",
            message: "Internal server error",
            requestId,
        }, { status: 500 })
    }
}
