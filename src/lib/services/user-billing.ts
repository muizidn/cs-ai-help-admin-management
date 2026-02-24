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

    const metadata = { ...(transaction.metadata || {}) }
    const gatewayId = transaction.gatewayTransactionId || ""
    const appCode = transaction.transactionCode || ""
    const paymentGateway = transaction.paymentGateway || ""

    if (
      paymentGateway === "manual" ||
      gatewayId.toLowerCase().includes("manual") ||
      appCode.toLowerCase().includes("manual")
    ) {
      metadata.isManual = true
    }

    return {
      ...rest,
      id: transaction.id || (_id ? _id.toString() : ""),
      type,
      status,
      metadata,
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
        metadata,
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

      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          filter[`metadata.${key}`] = value
        }
      }

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

      // Get current transaction to check for status change
      const currentTxDoc = await transactionsCollection.findOne({ id: transactionId })
      if (!currentTxDoc) {
        return {
          success: false,
          error: ["Transaction not found"],
        }
      }

      const currentTx = this.mapTransaction(currentTxDoc)

      // Update the transaction
      const { metadata, ...restData } = updateData
      const updateFields: any = {
        ...restData,
        updatedAt: new Date(),
      }

      // Use dot notation to merge metadata instead of overwriting the whole object
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          updateFields[`metadata.${key}`] = value
        })
      }

      const result = await transactionsCollection.updateOne(
        { id: transactionId },
        {
          $set: updateFields,
        },
      )

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: ["Transaction not found"],
        }
      }

      // Special handling for manual approval via webhook simulation
      const isManualApproval = currentTx.status === "PENDING" &&
        updateData.status === "COMPLETED" &&
        (updateData.metadata?.manuallyApproved || currentTxDoc.metadata?.manuallyApproved);

      const callbackUrl = updateData.metadata?.manualCallbackUrl || currentTxDoc.metadata?.manualCallbackUrl;

      if (isManualApproval && callbackUrl) {
        logger.info({ transactionId, callbackUrl }, "Manual approval detected with webhook. Triggering simulation.")

        try {
          const response = await fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: currentTx.id,
              status: "completed",
              transactionCode: currentTx.transactionCode,
              amount: currentTx.amount,
              currency: currentTx.currency,
            }),
          })

          if (response.ok) {
            logger.info({ transactionId }, "Manual approval webhook triggered successfully")
            // The webhook should have processed the transaction and marked it as completed
            const updatedTxDoc = await transactionsCollection.findOne({ id: transactionId })
            return {
              success: true,
              data: this.mapTransaction(updatedTxDoc),
            }
          } else {
            const errorText = await response.text()
            logger.warn({ transactionId, status: response.status, errorText }, "Manual approval webhook failed, falling back to local approval")
          }
        } catch (error) {
          logger.error({ transactionId, error: error as any }, "Error triggering manual approval webhook, falling back to local approval")
        }
      }

      const updatedTxDoc = await transactionsCollection.findOne({ id: transactionId })
      const updatedTx = this.mapTransaction(updatedTxDoc)

      // If status changed to COMPLETED, apply side effects (credits/plan)
      if (currentTx.status !== "COMPLETED" && updatedTx.status === "COMPLETED") {
        await this.applyTransactionSideEffects(updatedTx)
      }

      return {
        success: true,
        data: updatedTx,
      }
    } catch (error) {
      logger.error("Error updating transaction:", error as any)
      return {
        success: false,
        error: ["Failed to update transaction"],
      }
    }
  }

  // Apply side effects of a completed transaction (credits, subscription, etc.)
  private async applyTransactionSideEffects(transaction: Transaction) {
    const ownerId = transaction.organizationId || transaction.userId
    const ownerType = transaction.organizationId ? "organization" : "user"

    logger.info({
      transactionId: transaction.id,
      ownerId,
      ownerType,
      type: transaction.type
    }, "Applying transaction side effects")

    const billingStatesCollection = await this.getCollection("billing_states")
    const usersCollection = await this.getCollection("users")

    // 1. Update Credits Ledger if it's a credit purchase
    if (transaction.type === "CREDIT_PURCHASE") {
      let creditsToAdd = 0

      // Map known plan IDs to credit amounts
      if (transaction.planId === "credits_100") {
        creditsToAdd = 100 * (transaction.quantity || 1)
      } else if (transaction.credits) {
        creditsToAdd = transaction.credits
      }

      if (creditsToAdd > 0) {
        // Record in credit_ledger
        const ledgerCollection = await this.getCollection("credit_ledger")
        await ledgerCollection.insertOne({
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          organizationId: transaction.organizationId || "",
          userId: transaction.userId,
          amount: creditsToAdd,
          source: "purchase",
          description: `Manual approval: ${transaction.transactionCode}`,
          createdAt: new Date(),
          createdBy: "admin",
          metadata: {
            transactionId: transaction.id,
            planId: transaction.planId
          }
        })

        // Update billing state
        const state = await billingStatesCollection.findOne({ ownerId })
        const currentBalance = state?.creditBalance || 0
        const newBalance = currentBalance + creditsToAdd

        await billingStatesCollection.updateOne(
          { ownerId },
          {
            $set: {
              creditBalance: newBalance,
              updatedAt: new Date()
            },
            $setOnInsert: { ownerType }
          },
          { upsert: true }
        )

        // Sync to user doc if user-based
        if (ownerType === "user") {
          await usersCollection.updateOne(
            { id: ownerId },
            { $set: { creditBalance: newBalance, updatedAt: new Date() } }
          )
        }
      }
    }

    // 2. Update Plan if it's a plan upgrade
    if (transaction.type === "PLAN_UPGRADE") {
      const planId = transaction.planId || "pro_1m"
      let durationMonths = 1
      if (planId.includes("_3m")) durationMonths = 3
      else if (planId.includes("_1y")) durationMonths = 12

      const currentPeriodStart = new Date()
      const currentPeriodEnd = new Date()
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + durationMonths)

      await billingStatesCollection.updateOne(
        { ownerId },
        {
          $set: {
            planId: planId.startsWith("pro") ? "pro" : planId,
            subscriptionStatus: "active",
            currentPeriodStart,
            currentPeriodEnd,
            updatedAt: new Date()
          },
          $setOnInsert: { ownerType }
        },
        { upsert: true }
      )

      // Sync to user/org if needed (legacy or UI purposes)
      if (ownerType === "user") {
        await usersCollection.updateOne(
          { id: ownerId },
          {
            $set: {
              billingPlan: planId.split("_")[0],
              billingStatus: "active",
              billingExpiresAt: currentPeriodEnd,
              updatedAt: new Date()
            }
          }
        )
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

      // Find transaction by internal ID, transaction code, or gateway ID
      const transactionDoc = await transactionsCollection.findOne({
        $or: [
          { id: transactionId },
          { transactionCode: transactionId },
          { gatewayTransactionId: transactionId }
        ]
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
