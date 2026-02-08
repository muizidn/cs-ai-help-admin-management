// Types for organization management

export interface Organization {
    id: string
    name: string
    isActive: boolean
    createdAt: Date | string
    updatedAt: Date | string
    deletedAt?: Date | string
    createdBy: string
    updatedBy?: string
    plan?: {
        id: string
        name: string
        isPro: boolean
    }
}

export interface OrganizationWithStats extends Organization {
    memberCount: number
}

export interface OrganizationQuery {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
}
