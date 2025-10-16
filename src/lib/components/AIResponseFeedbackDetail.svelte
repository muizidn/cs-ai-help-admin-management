<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    ThumbsUp, 
    ThumbsDown, 
    ArrowLeft, 
    MessageSquare, 
    User, 
    Calendar, 
    Building,
    Hash,
    FileText,
    Clock,
    Bot,
    UserIcon
  } from 'lucide-svelte'
  import type { AIResponseFeedback } from '$lib/types/ai-response-feedback'

  export let feedbackId: string

  let feedback: AIResponseFeedback | null = null
  let loading = true
  let error = ''

  async function loadFeedbackDetail() {
    loading = true
    error = ''
    
    try {
      const response = await fetch(`/api/ai-response-feedback/${feedbackId}`)
      const result = await response.json()
      
      if (result.status === 'success') {
        feedback = result.data
      } else {
        error = result.message || 'Failed to load feedback details'
      }
    } catch (err) {
      error = 'Failed to load feedback details'
      console.error('Error loading feedback details:', err)
    } finally {
      loading = false
    }
  }

  function getFeedbackTypeIcon(type: string) {
    return type === 'THUMBS_UP' ? ThumbsUp : ThumbsDown
  }

  function getFeedbackTypeClass(type: string) {
    return type === 'THUMBS_UP' 
      ? 'text-green-600 bg-green-50 border-green-200' 
      : 'text-red-600 bg-red-50 border-red-200'
  }

  function getFeedbackTypeLabel(type: string) {
    return type === 'THUMBS_UP' ? 'Positive Feedback' : 'Negative Feedback'
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleString()
  }

  function formatRelativeTime(date: Date) {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    }
  }

  onMount(() => {
    loadFeedbackDetail()
  })
</script>

<div class="p-6 max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <div class="flex items-center gap-4 mb-4">
      <a
        href="/ai-response-feedback"
        class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft class="h-4 w-4 mr-2" />
        Back to List
      </a>
    </div>
    
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Feedback Details</h1>
    <p class="text-gray-600">Detailed view of AI response feedback</p>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="bg-white rounded-lg shadow p-8">
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading feedback details...</span>
      </div>
    </div>
  {:else if error}
    <!-- Error State -->
    <div class="bg-white rounded-lg shadow p-8">
      <div class="text-center">
        <div class="text-red-600 mb-2">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Feedback</h3>
        <p class="text-gray-600 mb-4">{error}</p>
        <button
          on:click={loadFeedbackDetail}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  {:else if feedback}
    <!-- Feedback Details -->
    <div class="space-y-6">
      <!-- Main Feedback Card -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-full border-2 {getFeedbackTypeClass(feedback.feedbackType)}">
                <svelte:component this={getFeedbackTypeIcon(feedback.feedbackType)} class="h-6 w-6" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-gray-900">{getFeedbackTypeLabel(feedback.feedbackType)}</h2>
                <p class="text-sm text-gray-500">Feedback ID: {feedback.id}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Created {formatRelativeTime(feedback.createdAt)}</p>
              <p class="text-xs text-gray-400">{formatDate(feedback.createdAt)}</p>
            </div>
          </div>
        </div>

        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Basic Information -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              
              <div class="flex items-center gap-3">
                <Hash class="h-5 w-5 text-gray-400" />
                <div>
                  <p class="text-sm font-medium text-gray-700">Message ID</p>
                  <p class="text-sm text-gray-600 font-mono">{feedback.messageId}</p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <MessageSquare class="h-5 w-5 text-gray-400" />
                <div>
                  <p class="text-sm font-medium text-gray-700">Conversation ID</p>
                  <p class="text-sm text-gray-600 font-mono">{feedback.conversationId}</p>
                </div>
              </div>

              {#if feedback.organizationId}
                <div class="flex items-center gap-3">
                  <Building class="h-5 w-5 text-gray-400" />
                  <div>
                    <p class="text-sm font-medium text-gray-700">Organization ID</p>
                    <p class="text-sm text-gray-600 font-mono">{feedback.organizationId}</p>
                  </div>
                </div>
              {/if}

              <div class="flex items-center gap-3">
                <User class="h-5 w-5 text-gray-400" />
                <div>
                  <p class="text-sm font-medium text-gray-700">Created By</p>
                  <p class="text-sm text-gray-600">{feedback.createdBy}</p>
                </div>
              </div>
            </div>

            <!-- Metadata -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
              
              <div class="flex items-center gap-3">
                <Calendar class="h-5 w-5 text-gray-400" />
                <div>
                  <p class="text-sm font-medium text-gray-700">Created At</p>
                  <p class="text-sm text-gray-600">{formatDate(feedback.createdAt)}</p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <Clock class="h-5 w-5 text-gray-400" />
                <div>
                  <p class="text-sm font-medium text-gray-700">Last Updated</p>
                  <p class="text-sm text-gray-600">{formatDate(feedback.updatedAt)}</p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <FileText class="h-5 w-5 text-gray-400" />
                <div>
                  <p class="text-sm font-medium text-gray-700">Context Messages</p>
                  <p class="text-sm text-gray-600">{feedback.contextMessageCount} message{feedback.contextMessageCount !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="h-5 w-5 rounded-full {feedback.isActive ? 'bg-green-500' : 'bg-gray-400'}"></div>
                <div>
                  <p class="text-sm font-medium text-gray-700">Status</p>
                  <p class="text-sm text-gray-600">{feedback.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reason Section -->
      {#if feedback.reason}
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Feedback Reason</h3>
          </div>
          <div class="p-6">
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-gray-700 whitespace-pre-wrap">{feedback.reason}</p>
            </div>
          </div>
        </div>
      {:else}
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Feedback Reason</h3>
          </div>
          <div class="p-6">
            <div class="bg-gray-50 rounded-lg p-4 text-center">
              <p class="text-gray-500 italic">No reason provided for this feedback</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Context Messages Section -->
      {#if feedback.contextMessages && feedback.contextMessages.length > 0}
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Context Messages</h3>
            <p class="text-sm text-gray-500 mt-1">
              {feedback.contextMessages.length} message{feedback.contextMessages.length !== 1 ? 's' : ''} included for context
            </p>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              {#each feedback.contextMessages as message, index}
                <div class="border border-gray-200 rounded-lg p-4 {message.isAiGenerated ? 'bg-purple-50' : 'bg-blue-50'}">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                      {#if message.isAiGenerated}
                        <div class="p-1 bg-purple-100 rounded">
                          <Bot class="h-4 w-4 text-purple-600" />
                        </div>
                        <span class="text-sm font-medium text-purple-700">AI Response</span>
                      {:else}
                        <div class="p-1 bg-blue-100 rounded">
                          <UserIcon class="h-4 w-4 text-blue-600" />
                        </div>
                        <span class="text-sm font-medium text-blue-700">Human Message</span>
                      {/if}
                      <span class="text-xs text-gray-500">#{index + 1}</span>
                    </div>
                    <div class="text-right">
                      <p class="text-xs text-gray-500">{formatDate(message.createdAt)}</p>
                      <p class="text-xs text-gray-400 font-mono">ID: {message.messageId.substring(0, 8)}...</p>
                    </div>
                  </div>

                  <div class="mb-2">
                    <p class="text-xs text-gray-500 mb-1">Sender: {message.senderId}</p>
                  </div>

                  <div class="bg-white rounded p-3 border">
                    <p class="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {:else}
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Context Messages</h3>
          </div>
          <div class="p-6">
            <div class="bg-gray-50 rounded-lg p-4 text-center">
              <p class="text-gray-500 italic">No context messages available</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- JSON Data Section (for debugging) -->
      <details class="bg-white rounded-lg shadow">
        <summary class="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50">
          <span class="text-lg font-medium text-gray-900">Raw Data (JSON)</span>
          <span class="text-sm text-gray-500 ml-2">Click to expand</span>
        </summary>
        <div class="p-6">
          <pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono">{JSON.stringify(feedback, null, 2)}</pre>
        </div>
      </details>
    </div>
  {/if}
</div>
