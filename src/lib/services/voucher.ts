import { getDatabase } from "$lib/mongodb"
import { logger } from "$lib/logger"
import { ObjectId } from "mongodb"
import type {
    Voucher,
    VoucherQuery,
    VoucherCreateInput,
    VoucherUpdateInput,
    VoucherStats,
} from "$lib/types/voucher"
import type { ApiResponse, PaginatedResponse } from "$lib/types/transactions"

export class VoucherService {
    private async getCollection() {
        const db = await getDatabase()
        return db.collection("vouchers")
    }

    private mapVoucher(doc: any): Voucher {
        const { _id, ...rest } = doc
        return {
            ...rest,
            id: doc.id || (_id ? _id.toString() : ""),
        } as Voucher
    }

    async getVouchers(
        query: VoucherQuery,
    ): Promise<ApiResponse<PaginatedResponse<Voucher>>> {
        try {
            const {
                search = "",
                page = 1,
                limit = 20,
                isActive,
                sortBy = "createdAt",
                sortOrder = "desc",
            } = query

            const collection = await this.getCollection()

            // Build MongoDB filter
            const filter: any = { deletedAt: { $exists: false } }

            if (search) {
                filter.code = { $regex: search, $options: "i" }
            }

            if (isActive !== undefined) {
                filter.isActive = isActive
            }

            // Build sort
            const sort: any = {}
            sort[sortBy] = sortOrder === "asc" ? 1 : -1

            // Get total count
            const total = await collection.countDocuments(filter)

            // Get vouchers with pagination
            const docs = await collection
                .find(filter)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray()

            const items = docs.map((doc) => this.mapVoucher(doc))

            // Calculate stats
            const totalVouchers = await collection.countDocuments({ deletedAt: { $exists: false } })
            const activeVouchers = await collection.countDocuments({
                deletedAt: { $exists: false },
                isActive: true
            })

            const usageDocs = await collection.aggregate([
                { $match: { deletedAt: { $exists: false } } },
                { $group: { _id: null, totalUsed: { $sum: "$usedCount" } } }
            ]).toArray()

            const totalUsedCount = usageDocs[0]?.totalUsed || 0

            const stats: VoucherStats = {
                totalVouchers,
                activeVouchers,
                totalUsedCount,
            }

            return {
                success: true,
                data: {
                    items,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                    stats,
                },
            }
        } catch (error) {
            logger.error("Error getting vouchers:", error as any)
            return {
                success: false,
                error: ["Failed to retrieve vouchers"],
            }
        }
    }

    async getVoucherById(id: string): Promise<ApiResponse<Voucher>> {
        try {
            const collection = await this.getCollection()
            const doc = await collection.findOne({
                id: id,
                deletedAt: { $exists: false },
            })

            if (!doc) {
                return {
                    success: false,
                    error: ["Voucher not found"],
                }
            }

            return {
                success: true,
                data: this.mapVoucher(doc),
            }
        } catch (error) {
            logger.error("Error getting voucher by ID:", error as any)
            return {
                success: false,
                error: ["Failed to retrieve voucher"],
            }
        }
    }

    async createVoucher(
        data: VoucherCreateInput,
        createdBy: string = "admin"
    ): Promise<ApiResponse<Voucher>> {
        try {
            const collection = await this.getCollection()

            // Check if code already exists
            const existing = await collection.findOne({
                code: data.code.toUpperCase(),
                deletedAt: { $exists: false }
            })

            if (existing) {
                return {
                    success: false,
                    error: ["Voucher code already exists"],
                }
            }

            const now = new Date()
            const id = new ObjectId().toString()

            const newVoucher = {
                id,
                code: data.code.toUpperCase(),
                discountType: data.discountType,
                discountValue: data.discountValue,
                limitUse: data.limitUse,
                usedCount: 0,
                isActive: data.isActive,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                createdAt: now,
                updatedAt: now,
                createdBy,
            }

            await collection.insertOne(newVoucher)

            return {
                success: true,
                data: this.mapVoucher(newVoucher),
            }
        } catch (error) {
            logger.error("Error creating voucher:", error as any)
            return {
                success: false,
                error: ["Failed to create voucher"],
            }
        }
    }

    async updateVoucher(
        id: string,
        data: VoucherUpdateInput,
    ): Promise<ApiResponse<Voucher>> {
        try {
            const collection = await this.getCollection()

            const processedData: any = { ...data, updatedAt: new Date() }
            if (processedData.expiresAt !== undefined) {
                processedData.expiresAt = processedData.expiresAt ? new Date(processedData.expiresAt) : null
            }

            if (processedData.code) {
                processedData.code = processedData.code.toUpperCase()
            }

            const result = await collection.updateOne(
                { id: id, deletedAt: { $exists: false } },
                { $set: processedData }
            )

            if (result.matchedCount === 0) {
                return {
                    success: false,
                    error: ["Voucher not found"],
                }
            }

            const updatedDoc = await collection.findOne({ id })
            return {
                success: true,
                data: updatedDoc ? this.mapVoucher(updatedDoc) : undefined,
            }
        } catch (error) {
            logger.error("Error updating voucher:", error as any)
            return {
                success: false,
                error: ["Failed to update voucher"],
            }
        }
    }

    async deleteVoucher(id: string): Promise<ApiResponse<any>> {
        try {
            const collection = await this.getCollection()
            const result = await collection.updateOne(
                { id: id },
                { $set: { deletedAt: new Date() } }
            )

            if (result.matchedCount === 0) {
                return {
                    success: false,
                    error: ["Voucher not found"],
                }
            }

            return { success: true }
        } catch (error) {
            logger.error("Error deleting voucher:", error as any)
            return {
                success: false,
                error: ["Failed to delete voucher"],
            }
        }
    }
}
