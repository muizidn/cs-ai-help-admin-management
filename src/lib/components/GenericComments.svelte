<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    MessageSquare, 
    Plus, 
    Pencil, 
    Trash2, 
    Save, 
    X, 
    Clock,
    CircleCheck,
    TriangleAlert,
    CircleAlert
  } from 'lucide-svelte'

  export let entityType: 'execution-log' | 'ai-response-feedback'
  export let entityId: string
  export let entityLogId: string | null = null

  interface Comment {
    id: string
    entityType: string
    entityId: string
    entityLogId?: string
    comment: string
    reviewStatus: 'NEEDS_REVIEW' | 'REVIEWED_GOOD' | 'REVIEWED_ISSUES' | 'REVIEWED_CRITICAL'
    isActive: boolean
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy?: string
  }

  let comments: Comment[] = []
  let loading = false
  let error = ''
  let showAddForm = false
  let newComment = ''
  let newReviewStatus: Comment['reviewStatus'] = 'NEEDS_REVIEW'
  let editingCommentId: string | null = null
  let editComment = ''
  let editReviewStatus: Comment['reviewStatus'] = 'NEEDS_REVIEW'

  const reviewStatusOptions = [
    { value: 'NEEDS_REVIEW', label: 'Needs Review', icon: Clock, class: 'text-yellow-600 bg-yellow-100' },
    { value: 'REVIEWED_GOOD', label: 'Good', icon: CircleCheck, class: 'text-green-600 bg-green-100' },
    { value: 'REVIEWED_ISSUES', label: 'Has Issues', icon: TriangleAlert, class: 'text-orange-600 bg-orange-100' },
    { value: 'REVIEWED_CRITICAL', label: 'Critical Issues', icon: CircleAlert, class: 'text-red-600 bg-red-100' }
  ]

  function getReviewStatusConfig(status: Comment['reviewStatus']) {
    return reviewStatusOptions.find(option => option.value === status) || reviewStatusOptions[0]
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  async function loadComments() {
    loading = true
    error = ''
    
    try {
      const url = `/api/generic-comments?entityType=${entityType}&entityId=${entityId}${entityLogId ? `&entityLogId=${entityLogId}` : ''}`
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.status === 'success') {
        comments = result.data || []
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

  async function addComment() {
    if (!newComment.trim()) return

    try {
      const response = await fetch('/api/generic-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType,
          entityId,
          entityLogId,
          comment: newComment.trim(),
          reviewStatus: newReviewStatus
        })
      })

      const result = await response.json()
      
      if (result.status === 'success') {
        await loadComments()
        newComment = ''
        newReviewStatus = 'NEEDS_REVIEW'
        showAddForm = false
      } else {
        error = result.message || 'Failed to add comment'
      }
    } catch (err) {
      error = 'Failed to add comment'
      console.error('Error adding comment:', err)
    }
  }

  async function updateComment(commentId: string) {
    if (!editComment.trim()) return

    try {
      const response = await fetch(`/api/generic-comments/${commentId}`, {
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
        await loadComments()
        editingCommentId = null
        editComment = ''
        editReviewStatus = 'NEEDS_REVIEW'
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
      const response = await fetch(`/api/generic-comments/${commentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (result.status === 'success') {
        await loadComments()
      } else {
        error = result.message || 'Failed to delete comment'
      }
    } catch (err) {
      error = 'Failed to delete comment'
      console.error('Error deleting comment:', err)
    }
  }

  function startEdit(comment: Comment) {
    editingCommentId = comment.id
    editComment = comment.comment
    editReviewStatus = comment.reviewStatus
  }

  function cancelEdit() {
    editingCommentId = null
    editComment = ''
    editReviewStatus = 'NEEDS_REVIEW'
  }

  onMount(() => {
    loadComments()
  })
</script>

<div class="comments-section">
  <div class="comments-header">
    <h3>
      <MessageSquare class="h-5 w-5" />
      Review Comments ({comments.length})
    </h3>
    <button class="add-comment-btn" on:click={() => showAddForm = !showAddForm}>
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

  {#if showAddForm}
    <div class="add-comment-form">
      <div class="form-group">
        <label for="new-comment">Comment</label>
        <textarea
          id="new-comment"
          bind:value={newComment}
          placeholder="Enter your review comment..."
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="new-status">Review Status</label>
        <select id="new-status" bind:value={newReviewStatus}>
          {#each reviewStatusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-actions">
        <button class="save-btn" on:click={addComment} disabled={!newComment.trim()}>
          <Save class="h-4 w-4" />
          Save Comment
        </button>
        <button class="cancel-btn" on:click={() => showAddForm = false}>
          <X class="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  {/if}

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
        <div class="comment-item">
          <div class="comment-header">
            <div class="comment-meta">
              {#each [getReviewStatusConfig(comment.reviewStatus)] as statusConfig}
                <div class="review-status {statusConfig.class}">
                  <svelte:component this={statusConfig.icon} class="h-4 w-4" />
                  {statusConfig.label}
                </div>
              {/each}
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
          
          {#if editingCommentId === comment.id}
            <div class="edit-form">
              <div class="form-group">
                <textarea
                  bind:value={editComment}
                  placeholder="Enter your review comment..."
                  rows="3"
                ></textarea>
              </div>
              
              <div class="form-group">
                <select bind:value={editReviewStatus}>
                  {#each reviewStatusOptions as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </div>
              
              <div class="form-actions">
                <button class="save-btn" on:click={() => updateComment(comment.id)} disabled={!editComment.trim()}>
                  <Save class="h-4 w-4" />
                  Update
                </button>
                <button class="cancel-btn" on:click={cancelEdit}>
                  <X class="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <div class="comment-content">
              <p>{comment.comment}</p>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .comments-section {
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .comments-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .comments-header h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .add-comment-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
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
    padding: 1rem;
    background: #fef2f2;
    color: #dc2626;
    border-bottom: 1px solid #fecaca;
  }

  .add-comment-form, .edit-form {
    padding: 1rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group:last-of-type {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    resize: vertical;
    min-height: 80px;
  }

  .form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .save-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .save-btn:hover:not(:disabled) {
    background: #059669;
  }

  .save-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .cancel-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .cancel-btn:hover {
    background: #4b5563;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
    text-align: center;
    color: #6b7280;
  }

  .comment-item {
    border-bottom: 1px solid #e5e7eb;
  }

  .comment-item:last-child {
    border-bottom: none;
  }

  .comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #fafafa;
  }

  .comment-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .review-status {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .comment-author {
    font-size: 0.875rem;
    color: #374151;
  }

  .comment-date {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .comment-actions {
    display: flex;
    gap: 0.5rem;
  }

  .edit-btn, .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .edit-btn {
    background: #f3f4f6;
    color: #374151;
  }

  .edit-btn:hover {
    background: #e5e7eb;
  }

  .delete-btn {
    background: #fef2f2;
    color: #dc2626;
  }

  .delete-btn:hover {
    background: #fecaca;
  }

  .comment-content {
    padding: 0 1rem 1rem 1rem;
  }

  .comment-content p {
    margin: 0;
    line-height: 1.5;
    color: #374151;
  }
</style>
