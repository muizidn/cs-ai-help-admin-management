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
        users.map(async (user) => {
          const userTransactions = await transactionsCollection
            .find({ userId: user.id })
            .sort({ createdAt: -1 })
            .toArray()

          const completedTransactions = userTransactions.filter(
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
            : null

          return {
            ...user,
            billingSummary: {
              plan: user.billingPlan || "basic",
              status: user.billingStatus || "active",
              expiresAt: user.billingExpiresAt,
              isLifetime: user.isLifetimeBilling || false,
              creditBalance: user.creditBalance || 0,
              daysUntilExpiry,
              totalSpent,
              lastPayment: lastPayment
                ? {
                    date: lastPayment.createdAt,
                    amount: lastPayment.amount,
                    type: lastPayment.type,
                  }
                : undefined,
              transactionCount: userTransactions.length,
            },
            recentTransactions: userTransactions.slice(0, 3),
          }
        }),
      )

      // Calculate stats
      const stats: UserBillingStats = {
        totalUsers: total,
        activeUsers: users.filter((u) => u.isActive).length,
        billingPlans: {
          basic: users.filter((u) => u.billingPlan === "basic").length,
          pro: users.filter((u) => u.billingPlan === "pro").length,
          enterprise: users.filter((u) => u.billingPlan === "enterprise")
            .length,
        },
        billingStatus: {
          active: users.filter((u) => u.billingStatus === "active").length,
          expired: users.filter((u) => u.billingStatus === "expired").length,
          pending: users.filter((u) => u.billingStatus === "pending").length,
        },
        totalCredits: users.reduce((sum, u) => sum + (u.creditBalance || 0), 0),
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
      logger.error("Error getting users:", error)
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

      const user = await usersCollection.findOne({
        id: userId,
        deletedAt: { $exists: false },
      })
      if (!user) {
        return {
          success: false,
          error: ["User not found"],
        }
      }

      // Get all user transactions
      const transactions = await transactionsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray()

      const completedTransactions = transactions.filter(
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
        : null

      const enrichedUser: UserWithBilling = {
        ...user,
        billingSummary: {
          plan: user.billingPlan || "basic",
          status: user.billingStatus || "active",
          expiresAt: user.billingExpiresAt,
          isLifetime: user.isLifetimeBilling || false,
          creditBalance: user.creditBalance || 0,
          daysUntilExpiry,
          totalSpent,
          lastPayment: lastPayment
            ? {
                date: lastPayment.createdAt,
                amount: lastPayment.amount,
                type: lastPayment.type,
              }
            : undefined,
          transactionCount: transactions.length,
        },
        recentTransactions: transactions,
      }

      return {
        success: true,
        data: enrichedUser,
      }
    } catch (error) {
      logger.error("Error getting user by ID:", error)
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

      const updatedUser = await usersCollection.findOne({ id: userId })
      return {
        success: true,
        data: updatedUser,
      }
    } catch (error) {
      logger.error("Error updating user:", error)
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

      // Enrich transactions with user data
      const userIds = [...new Set(transactions.map((t) => t.userId))]
      const users = await usersCollection
        .find({ id: { $in: userIds } })
        .toArray()
      const userMap = new Map(users.map((u) => [u.id, u]))

      const enrichedTransactions = transactions.map((transaction) => ({
        ...transaction,
        user: userMap.get(transaction.userId)
          ? {
              id: userMap.get(transaction.userId)!.id,
              name: userMap.get(transaction.userId)!.name,
              email: userMap.get(transaction.userId)!.email,
            }
          : null,
      }))

      // Calculate stats
      const stats: TransactionStats = {
        totalTransactions: total,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        byStatus: {
          completed: transactions.filter((t) => t.status === "COMPLETED")
            .length,
          pending: transactions.filter((t) => t.status === "PENDING").length,
          failed: transactions.filter((t) => t.status === "FAILED").length,
        },
        byType: {
          creditPurchase: transactions.filter(
            (t) => t.type === "CREDIT_PURCHASE",
          ).length,
          planUpgrade: transactions.filter((t) => t.type === "PLAN_UPGRADE")
            .length,
        },
        completedAmount: transactions
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
      logger.error("Error getting transactions:", error)
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

      const updatedTransaction = await transactionsCollection.findOne({
        id: transactionId,
      })
      return {
        success: true,
        data: updatedTransaction,
      }
    } catch (error) {
      logger.error("Error updating transaction:", error)
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
      const transaction = await transactionsCollection.findOne({
        id: transactionId,
      })

      if (!transaction) {
        return {
          success: false,
          error: ["Transaction not found"],
        }
      }

      // Get user information
      const user = await usersCollection.findOne({ id: transaction.userId })

      const enrichedTransaction: Transaction = {
        id: transaction._id.toString(),
        userId: transaction.userId,
        type: transaction.type,
        plan: transaction.plan,
        amount: transaction.amount,
        status: transaction.status,
        transactionCode: transaction.transactionCode,
        notes: transaction.notes,
        paymentProof: transaction.paymentProof,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        expiredAt: transaction.expiredAt,
        createdBy: transaction.createdBy,
        updatedBy: transaction.updatedBy,
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

      const updatedUser = await usersCollection.findOne({ id: userId })
      return {
        success: true,
        data: updatedUser as unknown as User,
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
