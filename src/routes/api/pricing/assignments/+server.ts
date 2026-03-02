import { json, type RequestHandler } from "@sveltejs/kit"
import { PricingService } from "$lib/services/pricing"
import { logger } from "$lib/logger"

// GET /api/pricing/assignments - Get members of a group
export const GET: RequestHandler = async ({ url, locals }) => {
    const groupId = url.searchParams.get("groupId")
    const ownerId = url.searchParams.get("ownerId")
    const service = new PricingService()

    if (ownerId) {
        const result = await service.searchOwnersGroup(ownerId)
        return json({ status: result.success ? "success" : "error", data: result.data, message: result.error?.[0] })
    }

    if (!groupId) return json({ status: "error", message: "groupId or ownerId required" }, { status: 400 })

    const result = await service.getGroupAssignments(groupId)
    return json({ status: result.success ? "success" : "error", data: result.data, message: result.error?.[0] })
}

// POST /api/pricing/assignments - Assign owner to group
export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { groupId, ownerId, ownerType, ownerName } = await request.json()
        const service = new PricingService()
        const userEmail = (locals as any).user?.email || "admin"

        const result = await service.assignOwnerToGroup(groupId, ownerId, ownerType, ownerName, userEmail)

        if (result.success) {
            return json({ status: "success", data: result.data })
        } else {
            return json({ status: "error", message: result.error?.[0] }, { status: 400 })
        }
    } catch (error) {
        return json({ status: "error", message: "Failed to assign owner" }, { status: 500 })
    }
}

// DELETE /api/pricing/assignments - Remove owner from group (by assignment ID)
export const DELETE: RequestHandler = async ({ url }) => {
    const id = url.searchParams.get("id")
    if (!id) return json({ status: "error", message: "ID required" }, { status: 400 })

    const service = new PricingService()
    const result = await service.removeOwnerFromGroup(id)

    return json({ status: result.success ? "success" : "error", message: result.error?.[0] })
}
