import { getDatabase } from "$lib/mongodb"
import { logger } from "$lib/logger"
import type {
  User,
  Transaction,
  UserWithBilling,
  UserBillingQuery,
  TransactionQuery,
  UserBillingStats,
  TransactionStats,
  UserUpdateInput,
  TransactionUpdateInput,
  PaginatedResponse,
  ApiResponse,
} from "$lib/types/user-billing"

export class UserBillingService {
  private async getCollection(name: string) {
    const db = await getDatabase()
    return db.collection(name)
  }

  private mapUser(user: any): User {
    const { _id, ...rest } = user
    return {
      ...rest,
      id: user.id || (_id ? _id.toString() : ""),
    } as User
  }

  private mapTransaction(transaction: any): Transaction {
    const { _id, ...rest } = transaction

    // Infer type if missing or from main app
    let type = transaction.type
    if (!type) {
      if (transaction.planId?.includes("pro_") || transaction.planId === "pro") {
        type = "PLAN_UPGRADE"
      } else if (transaction.planId?.includes("credits_") || transaction.planId === "credit") {
        type = "CREDIT_PURCHASE"
      } else if (transaction.notes?.toLowerCase().includes("manual credit update")) {
        type = "CREDIT_UPDATE"
      } else {
        type = "CREDIT_PURCHASE" // Default fallback
      }
    } else if (type === "credit") {
      type = "CREDIT_PURCHASE"
    } else if (type === "subscription") {
      type = "PLAN_UPGRADE"
    }

    // Normalize status to uppercase
    let status = transaction.status
    if (status) {
      status = status.toUpperCase()
      if (status === "COMPLETED") status = "COMPLETED"
      else if (status === "PENDING") status = "PENDING"
      else if (status === "FAILED") status = "FAILED"
      else if (status === "CANCELLED") status = "FAILED" // Map cancelled to failed
    } else {
      status = "PENDING"
    }

    return {
      ...rest,
      id: transaction.id || (_id ? _id.toString() : ""),
      type,
      status,
      transactionCode: transaction.transactionCode || transaction.gatewayTransactionId || `TRX-${transaction.id?.substring(0, 8) || "UNK"}`,
      currency: transaction.currency || "IDR",
      voucherCode: transaction.voucherCode,
    } as Transaction
  }

  // Get all users with billing information
  async getUsers(
    query: UserBillingQuery,
  ): Promise<ApiResponse<PaginatedResponse<UserWithBilling>>> {
    try {
      const {
        search = "",
        page = 1,
        limit = 20,
        billingPlan,
        billingStatus,
        isActive,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = query

      const usersCollection = await this.getCollection("users")
      const transactionsCollection = await this.getCollection("transactions")

      // Build MongoDB filter
      const filter: any = { deletedAt: { $exists: false } }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ]
      }

      if (billingPlan) filter.billingPlan = billingPlan
      if (billingStatus) filter.billingStatus = billingStatus
      if (isActive !== undefined) filter.isActive = isActive

      // Build sort
      const sort: any = {}
      sort[sortBy] = sortOrder === "asc" ? 1 : -1

      // Get total count
      const total = await usersCollection.countDocuments(filter)

      // Get users with pagination
      const users = await usersCollection
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray()

      // Enrich users with billing summary
      const enrichedUsers: UserWithBilling[] = await Promise.all(
        users.map(async (userDoc) => {
          const user = this.mapUser(userDoc)
          const userTransactions = await transactionsCollection
            .find({ userId: user.id })
            .sort({ createdAt: -1 })
            .toArray()

          // Map all transactions first to normalize status and type
          const mappedTransactions = userTransactions.map(t => this.mapTransaction(t))

          const completedTransactions = mappedTransactions.filter(
            (t) => t.status === "COMPLETED",
          )
          const totalSpent = completedTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          )
          const lastPayment = completedTransactions[0]

          const now = new Date()
          const billingExpiresAt = user.billingExpiresAt
            ? new Date(user.billingExpiresAt)
            : null
          const daysUntilExpiry = billingExpiresAt
            ? Math.ceil(
              (billingExpiresAt.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
            )
            : undefined

          return {
            ...user,
            billingSummary: {
              plan: user.billingPlan || "basic",
              status: user.billingStatus || "active",
              expiresAt: user.billingExpiresAt ? String(user.billingExpiresAt) : undefined,
              isLifetime: user.isLifetimeBilling || false,
              creditBalance: user.creditBalance || 0,
              daysUntilExpiry,
              totalSpent,
              lastPayment: lastPayment
                ? {
                  date: String(lastPayment.createdAt),
                  amount: lastPayment.amount,
                  type: lastPayment.type,
                }
                : undefined,
              transactionCount: mappedTransactions.length,
            },
            recentTransactions: mappedTransactions.slice(0, 3),
          }
        }),
      )

      // Calculate stats
      const stats: UserBillingStats = {
        totalUsers: total,
        activeUsers: enrichedUsers.filter((u) => u.isActive).length,
        billingPlans: {
          basic: enrichedUsers.filter((u) => u.billingPlan === "basic").length,
          pro: enrichedUsers.filter((u) => u.billingPlan === "pro").length,
          enterprise: enrichedUsers.filter((u) => u.billingPlan === "enterprise")
            .length,
        },
        billingStatus: {
          active: enrichedUsers.filter((u) => u.billingStatus === "active").length,
          expired: enrichedUsers.filter((u) => u.billingStatus === "expired").length,
          pending: enrichedUsers.filter((u) => u.billingStatus === "pending").length,
        },
        totalCredits: enrichedUsers.reduce((sum, u) => sum + (u.creditBalance || 0), 0),
      }

      return {
        success: true,
        data: {
          items: enrichedUsers,
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
      logger.error("Error getting users:", error as any)
      return {
        success: false,
        error: ["Failed to retrieve users"],
      }
    }
  }

  // Get specific user with detailed billing info
  async getUserById(userId: string): Promise<ApiResponse<UserWithBilling>> {
    try {
      const usersCollection = await this.getCollection("users")
      const transactionsCollection = await this.getCollection("transactions")

      const userDoc = await usersCollection.findOne({
        id: userId,
        deletedAt: { $exists: false },
      })
      if (!userDoc) {
        return {
          success: false,
          error: ["User not found"],
        }
      }

      const user = this.mapUser(userDoc)

      // Get all user transactions
      const transactions = await transactionsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray()

      // Map all transactions first to normalize status and type
      const mappedTransactions = transactions.map(t => this.mapTransaction(t))

      const completedTransactions = mappedTransactions.filter(
        (t) => t.status === "COMPLETED",
      )
      const totalSpent = completedTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      )
      const lastPayment = completedTransactions[0]

      const now = new Date()
      const billingExpiresAt = user.billingExpiresAt
        ? new Date(user.billingExpiresAt)
        : null
      const daysUntilExpiry = billingExpiresAt
        ? Math.ceil(
          (billingExpiresAt.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
        )
        : undefined

      const enrichedUser: UserWithBilling = {
        ...user,
        billingSummary: {
          plan: user.billingPlan || "basic",
          status: user.billingStatus || "active",
          expiresAt: user.billingExpiresAt ? String(user.billingExpiresAt) : undefined,
          isLifetime: user.isLifetimeBilling || false,
          creditBalance: user.creditBalance || 0,
          daysUntilExpiry,
          totalSpent,
          lastPayment: lastPayment
            ? {
              date: String(lastPayment.createdAt),
              amount: lastPayment.amount,
              type: lastPayment.type,
            }
            : undefined,
          transactionCount: mappedTransactions.length,
        },
        recentTransactions: mappedTransactions,
      }

      return {
        success: true,
        data: enrichedUser,
      }
    } catch (error) {
      logger.error("Error getting user by ID:", error as any)
      return {
        success: false,
        error: ["Failed to retrieve user"],
      }
    }
  }

  // Update user billing information
  async updateUser(
    userId: string,
    updateData: UserUpdateInput,
  ): Promise<ApiResponse<User>> {
    try {
      const usersCollection = await this.getCollection("users")

      // Convert date string to Date object if provided
      const processedData = { ...updateData }
      if (processedData.billingExpiresAt) {
        processedData.billingExpiresAt = new Date(
          processedData.billingExpiresAt,
        ) as any
      }

      const result = await usersCollection.updateOne(
        { id: userId, deletedAt: { $exists: false } },
        {
          $set: {
            ...processedData,
            updatedAt: new Date(),
          },
        },
      )

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: ["User not found"],
        }
      }

      const updatedUserDoc = await usersCollection.findOne({ id: userId })
      return {
        success: true,
        data: updatedUserDoc ? this.mapUser(updatedUserDoc) : undefined,
      }
    } catch (error) {
      logger.error("Error updating user:", error as any)
      return {
        success: false,
        error: ["Failed to update user"],
      }
    }
  }

  // Get transactions with filtering and pagination
  async getTransactions(
    query: TransactionQuery,
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    try {
      const {
        search = "",
        page = 1,
        limit = 20,
        userId,
        type,
        status,
        sortBy = "createdAt",
        sortOrder = "desc",
        dateFrom,
        dateTo,
      } = query

      const transactionsCollection = await this.getCollection("transactions")
      const usersCollection = await this.getCollection("users")

      // Build MongoDB filter
      const filter: any = {}

      if (search) {
        filter.$or = [
          { transactionCode: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ]
      }

      if (userId) filter.userId = userId
      if (type) filter.type = type
      if (status) filter.status = status
      if (dateFrom)
        filter.createdAt = { ...filter.createdAt, $gte: new Date(dateFrom) }
      if (dateTo)
        filter.createdAt = { ...filter.createdAt, $lte: new Date(dateTo) }

      // Build sort
      const sort: any = {}
      sort[sortBy] = sortOrder === "asc" ? 1 : -1

      // Get total count
      const total = await transactionsCollection.countDocuments(filter)

      // Get transactions with pagination
      const transactions = await transactionsCollection
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray()

      // Enrich transactions with user and voucher data
      const userIds = [...new Set(transactions.map((t) => t.userId))]
      const voucherCodes = [...new Set(transactions.map((t) => t.voucherCode).filter(Boolean))] as string[]

      const userDocs = await usersCollection
        .find({ id: { $in: userIds } })
        .toArray()
      const userMap = new Map(userDocs.map((u) => [u.id, this.mapUser(u)]))

      const vouchersCollection = await this.getCollection("vouchers")
      const voucherDocs = await vouchersCollection
        .find({ code: { $in: voucherCodes }, deletedAt: { $exists: false } })
        .toArray()
      const voucherMap = new Map(voucherDocs.map((v) => [v.code, v]))

      const enrichedTransactions = transactions.map((transactionDoc) => {
        const transaction = this.mapTransaction(transactionDoc)
        const user = userMap.get(transaction.userId)
        const voucherDoc = voucherMap.get(transaction.voucherCode!)

        return {
          ...transaction,
          user: user
            ? {
              id: user.id,
              name: user.name,
              email: user.email,
            }
            : undefined,
          voucher: voucherDoc
            ? {
              code: voucherDoc.code,
              discountType: voucherDoc.discountType,
              discountValue: voucherDoc.discountValue,
            }
            : undefined,
        }
      })

      // Calculate stats
      const stats: TransactionStats = {
        totalTransactions: total,
        totalAmount: enrichedTransactions.reduce((sum, t) => sum + t.amount, 0),
        byStatus: {
          completed: enrichedTransactions.filter((t) => t.status === "COMPLETED")
            .length,
          pending: enrichedTransactions.filter((t) => t.status === "PENDING").length,
          failed: enrichedTransactions.filter((t) => t.status === "FAILED").length,
        },
        byType: {
          creditPurchase: enrichedTransactions.filter(
            (t) => t.type === "CREDIT_PURCHASE",
          ).length,
          planUpgrade: enrichedTransactions.filter((t) => t.type === "PLAN_UPGRADE")
            .length,
        },
        completedAmount: enrichedTransactions
          .filter((t) => t.status === "COMPLETED")
          .reduce((sum, t) => sum + t.amount, 0),
      }

      return {
        success: true,
        data: {
          items: enrichedTransactions,
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
      logger.error("Error getting transactions:", error as any)
      return {
        success: false,
        error: ["Failed to retrieve transactions"],
      }
    }
  }

  // Update transaction
  async updateTransaction(
    transactionId: string,
    updateData: TransactionUpdateInput,
  ): Promise<ApiResponse<Transaction>> {
    try {
      const transactionsCollection = await this.getCollection("transactions")

      const result = await transactionsCollection.updateOne(
        { id: transactionId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
      )

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: ["Transaction not found"],
        }
      }

      const updatedTransactionDoc = await transactionsCollection.findOne({
        id: transactionId,
      })
      return {
        success: true,
        data: updatedTransactionDoc ? this.mapTransaction(updatedTransactionDoc) : undefined,
      }
    } catch (error) {
      logger.error("Error updating transaction:", error as any)
      return {
        success: false,
        error: ["Failed to update transaction"],
      }
    }
  }

  // Get transaction by transaction ID
  async getTransactionById(
    transactionId: string,
  ): Promise<ApiResponse<Transaction>> {
    try {
      const transactionsCollection = await this.getCollection("transactions")
      const usersCollection = await this.getCollection("users")

      // Find transaction by transaction ID
      const transactionDoc = await transactionsCollection.findOne({
        id: transactionId,
      })

      if (!transactionDoc) {
        return {
          success: false,
          error: ["Transaction not found"],
        }
      }

      const transaction = this.mapTransaction(transactionDoc)

      // Get user information
      const userDoc = await usersCollection.findOne({ id: transaction.userId })
      const user = userDoc ? this.mapUser(userDoc) : undefined

      const enrichedTransaction: Transaction = {
        ...transaction,
        user: user
          ? {
            id: user.id,
            name: user.name,
            email: user.email,
          }
          : undefined,
      }

      return {
        success: true,
        data: enrichedTransaction,
      }
    } catch (error) {
      logger.error("Error getting transaction by code:", error as any)
      return {
        success: false,
        error: ["Failed to retrieve transaction"],
      }
    }
  }

  // Update user credit balance
  async updateUserCredit(
    userId: string,
    creditBalance: number,
    updatedBy: string = "admin",
  ): Promise<ApiResponse<User>> {
    try {
      const usersCollection = await this.getCollection("users")
      const transactionsCollection = await this.getCollection("transactions")

      // Get current user to get current balance for notes
      const userDoc = await usersCollection.findOne({ id: userId })
      if (!userDoc) {
        return {
          success: false,
          error: ["User not found"],
        }
      }

      const user = this.mapUser(userDoc)
      const previousBalance = user.creditBalance || 0
      const diff = creditBalance - previousBalance

      const result = await usersCollection.updateOne(
        { id: userId, deletedAt: { $exists: false } },
        {
          $set: {
            creditBalance,
            updatedAt: new Date(),
            updatedBy,
          },
        },
      )

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: ["User not found"],
        }
      }

      // Create a transaction record for the manual update
      const now = new Date()
      const transactionId = `tx-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`
      const transactionCode = `ADM-${now.getTime().toString().substring(7)}`

      await transactionsCollection.insertOne({
        id: transactionId,
        userId: userId,
        type: "CREDIT_UPDATE",
        amount: 0, // No monetary cost for manual update
        currency: "IDR",
        status: "COMPLETED",
        transactionCode: transactionCode,
        notes: `Manual credit update: ${previousBalance} -> ${creditBalance} (Delta: ${diff > 0 ? "+" : ""}${diff})`,
        credits: diff,
        createdAt: now,
        updatedAt: now,
        createdBy: updatedBy,
      })

      const updatedUserDoc = await usersCollection.findOne({ id: userId })
      return {
        success: true,
        data: updatedUserDoc ? this.mapUser(updatedUserDoc) : undefined,
      }
    } catch (error) {
      logger.error("Error updating user credit:", error as any)
      return {
        success: false,
        error: ["Failed to update user credit"],
      }
    }
  }
}
