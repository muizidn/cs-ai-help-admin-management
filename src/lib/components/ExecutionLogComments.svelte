<script lang="ts">
  import { onMount } from 'svelte'
  import {
    MessageSquare,
    Plus,
    Pencil,
    Trash2,
    Save,
    X,
    TriangleAlert,
    CircleCheck,
    CircleAlert,
    Clock
  } from 'lucide-svelte'
  import type { 
    ExecutionLogComment, 
    ReviewStatus,
    CreateExecutionLogCommentRequest 
  } from '$lib/types/execution-log-comments'

  export let executionId: string
  export let executionLogId: string

  let comments: ExecutionLogComment[] = []
  let loading = true
  let error = ''
  let showAddForm = false
  let editingCommentId: string | null = null

  // Form data
  let newComment = ''
  let newReviewStatus: ReviewStatus = 'NEEDS_REVIEW'
  let editComment = ''
  let editReviewStatus: ReviewStatus = 'NEEDS_REVIEW'

  const reviewStatusOptions = [
    { value: 'NEEDS_REVIEW', label: 'Needs Review', icon: Clock, class: 'text-yellow-600 bg-yellow-100' },
    { value: 'REVIEWED_GOOD', label: 'Good', icon: CircleCheck, class: 'text-green-600 bg-green-100' },
    { value: 'REVIEWED_ISSUES', label: 'Has Issues', icon: TriangleAlert, class: 'text-orange-600 bg-orange-100' },
    { value: 'REVIEWED_CRITICAL', label: 'Critical Issues', icon: CircleAlert, class: 'text-red-600 bg-red-100' }
  ]

  async function loadComments() {
    loading = true
    error = ''
    
    try {
      const response = await fetch(`/api/execution-log-comments/by-execution/${executionId}`)
      const result = await response.json()
      
      if (result.status === 'success') {
        comments = result.data
      } else {
        error = result.message || 'Failed to load comments'
      }
    } catch (err) {
      error = 'Failed to load comments'
      console.error('Error loading comments:', err)
    } finally {
      loading = false
    }
  }

  async function createComment() {
    if (!newComment.trim()) return

    try {
      const request: CreateExecutionLogCommentRequest = {
        executionLogId,
        executionId,
        comment: newComment.trim(),
        reviewStatus: newReviewStatus
      }

      const response = await fetch('/api/execution-log-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      const result = await response.json()

      if (result.status === 'success') {
        comments = [result.data, ...comments]
        newComment = ''
        newReviewStatus = 'NEEDS_REVIEW'
        showAddForm = false
      } else {
        error = result.message || 'Failed to create comment'
      }
    } catch (err) {
      error = 'Failed to create comment'
      console.error('Error creating comment:', err)
    }
  }

  async function updateComment(commentId: string) {
    if (!editComment.trim()) return

    try {
      const response = await fetch(`/api/execution-log-comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: editComment.trim(),
          reviewStatus: editReviewStatus
        })
      })

      const result = await response.json()

      if (result.status === 'success') {
        const index = comments.findIndex(c => c.id === commentId)
        if (index !== -1) {
          comments[index] = result.data
          comments = [...comments]
        }
        editingCommentId = null
      } else {
        error = result.message || 'Failed to update comment'
      }
    } catch (err) {
      error = 'Failed to update comment'
      console.error('Error updating comment:', err)
    }
  }

  async function deleteComment(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(`/api/execution-log-comments/${commentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.status === 'success') {
        comments = comments.filter(c => c.id !== commentId)
      } else {
        error = result.message || 'Failed to delete comment'
      }
    } catch (err) {
      error = 'Failed to delete comment'
      console.error('Error deleting comment:', err)
    }
  }

  function startEdit(comment: ExecutionLogComment) {
    editingCommentId = comment.id
    editComment = comment.comment
    editReviewStatus = comment.reviewStatus
  }

  function cancelEdit() {
    editingCommentId = null
    editComment = ''
    editReviewStatus = 'NEEDS_REVIEW'
  }

  function getReviewStatusConfig(status: ReviewStatus) {
    return reviewStatusOptions.find(option => option.value === status) || reviewStatusOptions[0]
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleString()
  }

  onMount(() => {
    loadComments()
  })
</script>

<div class="execution-log-comments">
  <div class="comments-header">
    <div class="flex items-center gap-2">
      <MessageSquare class="h-5 w-5 text-gray-600" />
      <h4 class="font-semibold text-gray-900">Review Comments ({comments.length})</h4>
    </div>
    
    <button
      on:click={() => showAddForm = !showAddForm}
      class="add-comment-btn"
      title="Add review comment"
    >
      <Plus class="h-4 w-4" />
      Add Comment
    </button>
  </div>

  {#if error}
    <div class="error-message">
      <CircleAlert class="h-4 w-4" />
      {error}
    </div>
  {/if}

  <!-- Add Comment Form -->
  {#if showAddForm}
    <div class="comment-form">
      <div class="form-header">
        <h5>Add Review Comment</h5>
        <button on:click={() => showAddForm = false} class="close-btn">
          <X class="h-4 w-4" />
        </button>
      </div>
      
      <div class="form-content">
        <div class="form-group">
          <label for="review-status">Review Status</label>
          <select id="review-status" bind:value={newReviewStatus} class="form-select">
            {#each reviewStatusOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="comment-text">Comment</label>
          <textarea
            id="comment-text"
            bind:value={newComment}
            placeholder="Enter your review comment..."
            rows="3"
            class="form-textarea"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button on:click={createComment} class="save-btn" disabled={!newComment.trim()}>
            <Save class="h-4 w-4" />
            Save Comment
          </button>
          <button on:click={() => showAddForm = false} class="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Comments List -->
  <div class="comments-list">
    {#if loading}
      <div class="loading">Loading comments...</div>
    {:else if comments.length === 0}
      <div class="empty-state">
        <MessageSquare class="h-8 w-8 text-gray-400" />
        <p>No review comments yet</p>
      </div>
    {:else}
      {#each comments as comment}
        {@const statusConfig = getReviewStatusConfig(comment.reviewStatus)}
        <div class="comment-item">
          <div class="comment-header">
            <div class="comment-meta">
              <div class="review-status {statusConfig.class}">
                <svelte:component this={statusConfig.icon} class="h-4 w-4" />
                {statusConfig.label}
              </div>
              <span class="comment-author">by {comment.createdBy}</span>
              <span class="comment-date">{formatDate(comment.createdAt)}</span>
            </div>
            
            <div class="comment-actions">
              {#if editingCommentId !== comment.id}
                <button on:click={() => startEdit(comment)} class="edit-btn" title="Edit comment">
                  <Pencil class="h-4 w-4" />
                </button>
                <button on:click={() => deleteComment(comment.id)} class="delete-btn" title="Delete comment">
                  <Trash2 class="h-4 w-4" />
                </button>
              {/if}
            </div>
          </div>
          
          <div class="comment-content">
            {#if editingCommentId === comment.id}
              <!-- Edit Form -->
              <div class="edit-form">
                <div class="form-group">
                  <select bind:value={editReviewStatus} class="form-select">
                    {#each reviewStatusOptions as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </div>
                
                <div class="form-group">
                  <textarea
                    bind:value={editComment}
                    rows="3"
                    class="form-textarea"
                  ></textarea>
                </div>
                
                <div class="form-actions">
                  <button on:click={() => updateComment(comment.id)} class="save-btn" disabled={!editComment.trim()}>
                    <Save class="h-4 w-4" />
                    Save
                  </button>
                  <button on:click={cancelEdit} class="cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            {:else}
              <!-- Display Comment -->
              <p class="comment-text">{comment.comment}</p>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .execution-log-comments {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 1rem;
  }

  .comments-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .add-comment-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .add-comment-btn:hover {
    background: #2563eb;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    color: #dc2626;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .comment-form {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
  }

  .form-header h5 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  .form-content {
    padding: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-select,
  .form-textarea {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.5rem;
    font-size: 0.875rem;
    transition: border-color 0.2s;
  }

  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-textarea {
    resize: vertical;
    min-height: 4rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .save-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .save-btn:hover:not(:disabled) {
    background: #059669;
  }

  .save-btn:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  .cancel-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    color: #6b7280;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn:hover {
    background: #f9fafb;
    color: #374151;
  }



  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .empty-state p {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
  }

  .comment-item {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .comment-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .review-status {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .comment-author {
    color: #374151;
    font-weight: 500;
  }

  .comment-date {
    color: #6b7280;
  }

  .comment-actions {
    display: flex;
    gap: 0.5rem;
  }

  .edit-btn,
  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .edit-btn {
    color: #3b82f6;
  }

  .edit-btn:hover {
    background: #eff6ff;
  }

  .delete-btn {
    color: #ef4444;
  }

  .delete-btn:hover {
    background: #fef2f2;
  }

  .comment-content {
    padding: 1rem;
  }

  .comment-text {
    margin: 0;
    color: #374151;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .edit-form .form-group {
    margin-bottom: 1rem;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .comments-header {
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }

    .comment-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: stretch;
    }

    .comment-meta {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .form-actions {
      flex-direction: column;
    }
  }
</style>
