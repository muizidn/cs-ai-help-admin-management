<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    ThumbsUp, 
    ThumbsDown, 
    Eye, 
    Search, 
    Filter, 
    ChevronDown, 
    ChevronLeft, 
    ChevronRight,
    Calendar,
    MessageSquare,
    User,
    Building
  } from 'lucide-svelte'
  import type { 
    AIResponseFeedbackResponse, 
    AIResponseFeedbackQuery, 
    AIResponseFeedbackStats,
    FeedbackType 
  } from '$lib/types/ai-response-feedback'

  export let searchQuery = ''
  export let feedbackTypeFilter: FeedbackType | 'all' = 'all'
  export let conversationIdFilter = ''
  export let organizationIdFilter = ''
  export let createdByFilter = ''
  export let dateRangeFilter = { start: '', end: '' }

  let feedbackData: AIResponseFeedbackResponse | null = null
  let stats: AIResponseFeedbackStats | null = null
  let loading = true
  let error = ''
  let currentPage = 1
  let showFilters = false

  const feedbackTypeOptions = [
    { value: 'all', label: 'All Types', icon: null },
    { value: 'THUMBS_UP', label: 'Thumbs Up', icon: ThumbsUp },
    { value: 'THUMBS_DOWN', label: 'Thumbs Down', icon: ThumbsDown }
  ]

  async function loadFeedbackData() {
    loading = true
    error = ''
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort_by: 'createdAt',
        sort_order: 'desc'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      
      if (feedbackTypeFilter && feedbackTypeFilter !== 'all') {
        params.append('feedbackType', feedbackTypeFilter)
      }
      
      if (conversationIdFilter.trim()) {
        params.append('conversationId', conversationIdFilter.trim())
      }
      
      if (organizationIdFilter.trim()) {
        params.append('organizationId', organizationIdFilter.trim())
      }
      
      if (createdByFilter.trim()) {
        params.append('createdBy', createdByFilter.trim())
      }
      
      if (dateRangeFilter.start) {
        params.append('start_date', dateRangeFilter.start)
      }
      
      if (dateRangeFilter.end) {
        params.append('end_date', dateRangeFilter.end)
      }
      
      const response = await fetch(`/api/ai-response-feedback?${params}`)
      const result = await response.json()
      
      if (result.status === 'success') {
        feedbackData = result.data
      } else {
        error = result.message || 'Failed to load AI response feedback'
      }
    } catch (err) {
      error = 'Failed to load AI response feedback'
      console.error('Error loading AI response feedback:', err)
    } finally {
      loading = false
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/ai-response-feedback/stats')
      const result = await response.json()
      
      if (result.status === 'success') {
        stats = result.data
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  function handleSearch() {
    currentPage = 1
    loadFeedbackData()
  }

  function handleFilterChange() {
    currentPage = 1
    loadFeedbackData()
  }

  function goToPage(page: number) {
    currentPage = page
    loadFeedbackData()
  }

  function clearFilters() {
    searchQuery = ''
    feedbackTypeFilter = 'all'
    conversationIdFilter = ''
    organizationIdFilter = ''
    createdByFilter = ''
    dateRangeFilter = { start: '', end: '' }
    currentPage = 1
    loadFeedbackData()
  }

  function getFeedbackTypeIcon(type: FeedbackType) {
    return type === 'THUMBS_UP' ? ThumbsUp : ThumbsDown
  }

  function getFeedbackTypeClass(type: FeedbackType) {
    return type === 'THUMBS_UP' 
      ? 'text-green-600 bg-green-50' 
      : 'text-red-600 bg-red-50'
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleString()
  }

  function truncateText(text: string, maxLength: number = 100) {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  onMount(() => {
    loadFeedbackData()
    loadStats()
  })

  // Reactive statements for filter changes
  $: if (feedbackTypeFilter) handleFilterChange()
</script>

<div class="p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">AI Response Feedback</h1>
    <p class="text-gray-600">Monitor and analyze feedback on AI-generated responses</p>
  </div>

  <!-- Stats Cards -->
  {#if stats}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-blue-50 rounded-lg">
            <MessageSquare class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Feedback</p>
            <p class="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-green-50 rounded-lg">
            <ThumbsUp class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Positive</p>
            <p class="text-2xl font-bold text-gray-900">{stats.thumbsUp}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-red-50 rounded-lg">
            <ThumbsDown class="h-6 w-6 text-red-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Negative</p>
            <p class="text-2xl font-bold text-gray-900">{stats.thumbsDown}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-purple-50 rounded-lg">
            <Calendar class="h-6 w-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Today</p>
            <p class="text-2xl font-bold text-gray-900">{stats.recentActivity.today}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Search and Filters -->
  <div class="bg-white rounded-lg shadow mb-6">
    <div class="p-4 border-b border-gray-200">
      <div class="flex flex-col sm:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reason, message ID, conversation ID, or creator..."
              bind:value={searchQuery}
              on:input={handleSearch}
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- Filter Toggle -->
        <button
          on:click={() => showFilters = !showFilters}
          class="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter class="h-4 w-4" />
          Filters
          <ChevronDown class="h-4 w-4 transform transition-transform {showFilters ? 'rotate-180' : ''}" />
        </button>
      </div>
    </div>

    <!-- Expanded Filters -->
    {#if showFilters}
      <div class="p-4 bg-gray-50 border-b border-gray-200">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Feedback Type Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
            <select
              bind:value={feedbackTypeFilter}
              on:change={handleFilterChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {#each feedbackTypeOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <!-- Conversation ID Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Conversation ID</label>
            <input
              type="text"
              placeholder="Filter by conversation ID"
              bind:value={conversationIdFilter}
              on:input={handleFilterChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Organization ID Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
            <input
              type="text"
              placeholder="Filter by organization ID"
              bind:value={organizationIdFilter}
              on:input={handleFilterChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Creator Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Created By</label>
            <input
              type="text"
              placeholder="Filter by creator"
              bind:value={createdByFilter}
              on:input={handleFilterChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Date Range -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              bind:value={dateRangeFilter.start}
              on:change={handleFilterChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              bind:value={dateRangeFilter.end}
              on:change={handleFilterChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- Clear Filters -->
        <div class="mt-4 flex justify-end">
          <button
            on:click={clearFilters}
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="bg-white rounded-lg shadow p-8">
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading AI response feedback...</span>
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
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
        <p class="text-gray-600 mb-4">{error}</p>
        <button
          on:click={loadFeedbackData}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  {:else if feedbackData}
    <!-- Feedback Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      {#if feedbackData.items.length === 0}
        <!-- Empty State -->
        <div class="p-8 text-center">
          <div class="text-gray-400 mb-4">
            <MessageSquare class="mx-auto h-12 w-12" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Feedback Found</h3>
          <p class="text-gray-600">No AI response feedback matches your current filters.</p>
        </div>
      {:else}
        <!-- Table Header -->
        <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">
              Feedback ({feedbackData.total} total)
            </h3>
            <span class="text-sm text-gray-500">
              Page {feedbackData.page} of {feedbackData.totalPages}
            </span>
          </div>
        </div>

        <!-- Table Content -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message Info
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Context
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each feedbackData.items as feedback}
                <tr class="hover:bg-gray-50">
                  <!-- Feedback Type -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="p-2 rounded-full {getFeedbackTypeClass(feedback.feedbackType)}">
                        <svelte:component this={getFeedbackTypeIcon(feedback.feedbackType)} class="h-4 w-4" />
                      </div>
                      <span class="ml-3 text-sm font-medium text-gray-900">
                        {feedback.feedbackType === 'THUMBS_UP' ? 'Positive' : 'Negative'}
                      </span>
                    </div>
                  </td>

                  <!-- Message Info -->
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">
                      <div class="font-medium">Message: {feedback.messageId.substring(0, 8)}...</div>
                      <div class="text-gray-500">Conversation: {feedback.conversationId.substring(0, 8)}...</div>
                      {#if feedback.organizationId}
                        <div class="text-gray-500 text-xs">Org: {feedback.organizationId.substring(0, 8)}...</div>
                      {/if}
                    </div>
                  </td>

                  <!-- Reason -->
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">
                      {#if feedback.reason}
                        <span class="text-gray-700">{truncateText(feedback.reason, 80)}</span>
                      {:else}
                        <span class="text-gray-400 italic">No reason provided</span>
                      {/if}
                    </div>
                  </td>

                  <!-- Context -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {feedback.contextMessageCount} message{feedback.contextMessageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>

                  <!-- Created -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      <div>{formatDate(feedback.createdAt)}</div>
                      <div class="text-gray-500 text-xs">by {feedback.createdBy}</div>
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href="/ai-response-feedback/{feedback.id}"
                      class="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <Eye class="h-4 w-4 mr-1" />
                      View
                    </a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        {#if feedbackData.totalPages > 1}
          <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-700">
                Showing {((feedbackData.page - 1) * 20) + 1} to {Math.min(feedbackData.page * 20, feedbackData.total)} of {feedbackData.total} results
              </div>

              <div class="flex items-center space-x-2">
                <!-- Previous Page -->
                <button
                  on:click={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  class="p-2 border border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft class="h-4 w-4" />
                </button>

                <!-- Page Numbers -->
                {#each Array.from({length: Math.min(5, feedbackData.totalPages)}, (_, i) => {
                  const start = Math.max(1, currentPage - 2)
                  const end = Math.min(feedbackData.totalPages, start + 4)
                  return start + i
                }).filter(page => page <= feedbackData.totalPages) as page}
                  <button
                    on:click={() => goToPage(page)}
                    class="px-3 py-2 border rounded-md text-sm transition-colors {
                      page === currentPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }"
                  >
                    {page}
                  </button>
                {/each}

                <!-- Next Page -->
                <button
                  on:click={() => goToPage(currentPage + 1)}
                  disabled={currentPage === feedbackData.totalPages}
                  class="p-2 border border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
