import { getDatabase } from '../mongodb'
import { logger } from '../logger'
import { nanoid } from 'nanoid'
import type {
  ExecutionLogComment,
  CreateExecutionLogCommentRequest,
  UpdateExecutionLogCommentRequest,
  ExecutionLogCommentQuery,
  ExecutionLogCommentResponse,
  ExecutionLogCommentStats,
  ReviewStatus,
  ApiResponse
} from '../types/execution-log-comments'

export class ExecutionLogCommentService {
  private readonly collectionName = 'execution-log-comments'

  async createComment(
    request: CreateExecutionLogCommentRequest,
    createdBy: string
  ): Promise<ApiResponse<ExecutionLogComment>> {
    try {
      logger.info({ request, createdBy }, 'Creating execution log comment')

      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const comment: ExecutionLogComment = {
        id: nanoid(),
        executionLogId: request.executionLogId,
        executionId: request.executionId,
        comment: request.comment,
        reviewStatus: request.reviewStatus,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
      }

      await collection.insertOne(comment)

      logger.info(
        { commentId: comment.id, executionId: request.executionId },
        'Execution log comment created successfully'
      )

      return {
        status: 'success',
        data: comment,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, request },
        'Failed to create execution log comment'
      )
      return {
        status: 'error',
        message: 'Failed to create comment',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  async updateComment(
    request: UpdateExecutionLogCommentRequest,
    updatedBy: string
  ): Promise<ApiResponse<ExecutionLogComment>> {
    try {
      logger.info({ request, updatedBy }, 'Updating execution log comment')

      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const updateData: Partial<ExecutionLogComment> = {
        updatedAt: new Date(),
        updatedBy,
      }

      if (request.comment !== undefined) {
        updateData.comment = request.comment
      }

      if (request.reviewStatus !== undefined) {
        updateData.reviewStatus = request.reviewStatus
      }

      const result = await collection.findOneAndUpdate(
        { id: request.id, isActive: true },
        { $set: updateData },
        { returnDocument: 'after' }
      )

      if (!result) {
        return {
          status: 'error',
          message: 'Comment not found',
          errors: ['Comment not found'],
        }
      }

      logger.info(
        { commentId: request.id },
        'Execution log comment updated successfully'
      )

      return {
        status: 'success',
        data: result as ExecutionLogComment,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, request },
        'Failed to update execution log comment'
      )
      return {
        status: 'error',
        message: 'Failed to update comment',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  async getCommentsByExecutionId(
    executionId: string
  ): Promise<ApiResponse<ExecutionLogComment[]>> {
    try {
      logger.info({ executionId }, 'Getting comments for execution log')

      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const comments = await collection
        .find({ executionId, isActive: true })
        .sort({ createdAt: -1 })
        .toArray()

      logger.info(
        { executionId, count: comments.length },
        'Execution log comments retrieved successfully'
      )

      return {
        status: 'success',
        data: comments as ExecutionLogComment[],
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, executionId },
        'Failed to get execution log comments'
      )
      return {
        status: 'error',
        message: 'Failed to retrieve comments',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  async getComments(
    query: ExecutionLogCommentQuery
  ): Promise<ApiResponse<ExecutionLogCommentResponse>> {
    try {
      logger.info({ query }, 'Getting execution log comments')

      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const page = query.page || 1
      const limit = query.limit || 20
      const skip = (page - 1) * limit

      // Build filter
      const filter: any = { isActive: true }

      if (query.search) {
        filter.$or = [
          { comment: { $regex: query.search, $options: 'i' } },
          { executionId: { $regex: query.search, $options: 'i' } },
          { createdBy: { $regex: query.search, $options: 'i' } },
        ]
      }

      if (query.executionLogId) {
        filter.executionLogId = query.executionLogId
      }

      if (query.executionId) {
        filter.executionId = query.executionId
      }

      if (query.reviewStatus && query.reviewStatus !== 'all') {
        filter.reviewStatus = query.reviewStatus
      }

      if (query.createdBy) {
        filter.createdBy = { $regex: query.createdBy, $options: 'i' }
      }

      if (query.start_date || query.end_date) {
        filter.createdAt = {}
        if (query.start_date) {
          filter.createdAt.$gte = new Date(query.start_date)
        }
        if (query.end_date) {
          filter.createdAt.$lte = new Date(query.end_date)
        }
      }

      // Build sort
      const sortField = query.sort_by || 'createdAt'
      const sortOrder = query.sort_order === 'asc' ? 1 : -1
      const sort = { [sortField]: sortOrder }

      // Execute queries
      const [items, total] = await Promise.all([
        collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter),
      ])

      const totalPages = Math.ceil(total / limit)

      const response: ExecutionLogCommentResponse = {
        items: items as ExecutionLogComment[],
        total,
        page,
        limit,
        total_pages: totalPages,
      }

      logger.info(
        { total, page, limit },
        'Execution log comments retrieved successfully'
      )

      return {
        status: 'success',
        data: response,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, query },
        'Failed to get execution log comments'
      )
      return {
        status: 'error',
        message: 'Failed to retrieve comments',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  async getCommentStats(): Promise<ApiResponse<ExecutionLogCommentStats>> {
    try {
      logger.info('Getting execution log comment stats')

      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [
        total,
        needsReview,
        reviewedGood,
        reviewedIssues,
        reviewedCritical,
        todayCount,
        weekCount,
        monthCount,
      ] = await Promise.all([
        collection.countDocuments({ isActive: true }),
        collection.countDocuments({ isActive: true, reviewStatus: 'NEEDS_REVIEW' }),
        collection.countDocuments({ isActive: true, reviewStatus: 'REVIEWED_GOOD' }),
        collection.countDocuments({ isActive: true, reviewStatus: 'REVIEWED_ISSUES' }),
        collection.countDocuments({ isActive: true, reviewStatus: 'REVIEWED_CRITICAL' }),
        collection.countDocuments({ isActive: true, createdAt: { $gte: today } }),
        collection.countDocuments({ isActive: true, createdAt: { $gte: thisWeek } }),
        collection.countDocuments({ isActive: true, createdAt: { $gte: thisMonth } }),
      ])

      const stats: ExecutionLogCommentStats = {
        total,
        needsReview,
        reviewedGood,
        reviewedIssues,
        reviewedCritical,
        byReviewStatus: {
          NEEDS_REVIEW: needsReview,
          REVIEWED_GOOD: reviewedGood,
          REVIEWED_ISSUES: reviewedIssues,
          REVIEWED_CRITICAL: reviewedCritical,
        },
        recentActivity: {
          today: todayCount,
          thisWeek: weekCount,
          thisMonth: monthCount,
        },
      }

      logger.info({ stats }, 'Execution log comment stats retrieved successfully')

      return {
        status: 'success',
        data: stats,
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error },
        'Failed to get execution log comment stats'
      )
      return {
        status: 'error',
        message: 'Failed to retrieve comment statistics',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  async deleteComment(
    id: string,
    deletedBy: string
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      logger.info({ id, deletedBy }, 'Deleting execution log comment')

      const db = await getDatabase()
      const collection = db.collection(this.collectionName)

      const result = await collection.findOneAndUpdate(
        { id, isActive: true },
        {
          $set: {
            isActive: false,
            deletedAt: new Date(),
            updatedBy: deletedBy,
            updatedAt: new Date(),
          },
        }
      )

      if (!result) {
        return {
          status: 'error',
          message: 'Comment not found',
          errors: ['Comment not found'],
        }
      }

      logger.info({ id }, 'Execution log comment deleted successfully')

      return {
        status: 'success',
        data: { message: 'Comment deleted successfully' },
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, id },
        'Failed to delete execution log comment'
      )
      return {
        status: 'error',
        message: 'Failed to delete comment',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }
}

// Singleton instance
export const executionLogCommentService = new ExecutionLogCommentService()

export async function getExecutionLogCommentService(): Promise<ExecutionLogCommentService> {
  return executionLogCommentService
}
