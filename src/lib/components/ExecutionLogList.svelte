<script lang="ts">
  import { onMount } from 'svelte'
  import { Clock, CheckCircle, XCircle, AlertCircle, Eye, Search, Filter, ChevronDown, ChevronRight, Expand, Minimize } from 'lucide-svelte'
  import type { ExecutionLogResponse, ExecutionLogQuery, ExecutionLogStats } from '$lib/types/execution-logs'
  import { extractFinalDecision, extractAiResponseText, getFinalDecisionLabel, getFinalDecisionClass } from '$lib/utils/final-decision-extractor'
  import GenericComments from './GenericComments.svelte'

  export let searchQuery = ''
  export let statusFilter = 'all'
  export let contextFilter = ''
  export let dateRangeFilter = { start: '', end: '' }
  export let finalDecisionFilter = 'all'
  export let customerMessageFilter = ''
  export let aiResponseFilter = ''

  // Expandable rows state
  let expandedRows = new Set<string>()
  let showAllExpanded = false

  let executionLogs: ExecutionLogResponse | null = null
  let stats: ExecutionLogStats | null = null
  let loading = true
  let error = ''
  let currentPage = 1
  let showFilters = false

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'running', label: 'Running' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' }
  ]

  const finalDecisionOptions = [
    { value: 'all', label: 'All Decisions' },
    { value: 'DIRECT_REPLY', label: 'Direct Reply' },
    { value: 'REQUEST_HUMAN_ASSISTANCE', label: 'Human Assistance' },
    { value: 'NO_ANSWER_GIVEN', label: 'No Answer' },
    { value: 'FALLBACK_REPLY', label: 'Fallback Reply' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'RUNNING', label: 'Running' }
  ]

  async function loadExecutionLogs() {
    loading = true
    error = ''
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort_by: 'start_time',
        sort_order: 'desc'
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      if (contextFilter.trim()) {
        params.append('context', contextFilter.trim())
      }
      
      if (dateRangeFilter.start) {
        params.append('start_date', dateRangeFilter.start)
      }
      
      if (dateRangeFilter.end) {
        params.append('end_date', dateRangeFilter.end)
      }

      if (finalDecisionFilter && finalDecisionFilter !== 'all') {
        params.append('final_decision', finalDecisionFilter)
      }

      if (customerMessageFilter.trim()) {
        params.append('customer_message', customerMessageFilter.trim())
      }

      if (aiResponseFilter.trim()) {
        params.append('ai_response', aiResponseFilter.trim())
      }
      
      const response = await fetch(`/api/ai-execution-log?${params}`)
      const result = await response.json()
      
      if (result.status === 'success') {
        executionLogs = result.data
      } else {
        error = result.message || 'Failed to load execution logs'
      }
    } catch (err) {
      error = 'Failed to load execution logs'
      console.error('Error loading execution logs:', err)
    } finally {
      loading = false
    }
  }

  async function loadStats() {
    try {
      const params = new URLSearchParams()
      
      if (contextFilter.trim()) {
        params.append('context', contextFilter.trim())
      }
      
      if (dateRangeFilter.start) {
        params.append('start_date', dateRangeFilter.start)
      }
      
      if (dateRangeFilter.end) {
        params.append('end_date', dateRangeFilter.end)
      }
      
      const response = await fetch(`/api/ai-execution-log/stats?${params}`)
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
    loadExecutionLogs()
  }

  function handleFilterChange() {
    currentPage = 1
    loadExecutionLogs()
    loadStats()
  }

  // Expandable row functions
  function toggleRow(executionId: string) {
    if (expandedRows.has(executionId)) {
      expandedRows.delete(executionId)
    } else {
      expandedRows.add(executionId)
    }
    expandedRows = expandedRows // Trigger reactivity
  }

  function toggleAllRows() {
    showAllExpanded = !showAllExpanded
    if (showAllExpanded) {
      // Expand all current rows
      expandedRows = new Set(executionLogs?.items.map(log => log.execution_id) || [])
    } else {
      // Collapse all rows
      expandedRows = new Set()
    }
  }

  function handlePageChange(page: number) {
    currentPage = page
    loadExecutionLogs()
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'running':
        return Clock
      case 'completed':
        return CheckCircle
      case 'failed':
        return XCircle
      default:
        return AlertCircle
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-100'
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  function formatDuration(durationMs?: number) {
    if (!durationMs) return 'N/A'
    
    if (durationMs < 1000) {
      return `${durationMs}ms`
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  function truncateMessage(message: string, maxLength = 100) {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message
  }

  onMount(() => {
    loadExecutionLogs()
    loadStats()
  })
</script>

<div class="execution-logs">
  <!-- Header with Stats -->
  <div class="header">
    <div class="title-section">
      <h1>AI Execution Logs</h1>
      <p>Monitor and review AI inference execution logs and performance</p>
    </div>
    
    {#if stats}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{stats.total.toLocaleString()}</div>
          <div class="stat-label">Total Executions</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-green-600">{stats.completed.toLocaleString()}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-blue-600">{stats.running.toLocaleString()}</div>
          <div class="stat-label">Running</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-red-600">{stats.failed.toLocaleString()}</div>
          <div class="stat-label">Failed</div>
        </div>
        {#if stats.avgDurationMs}
          <div class="stat-card">
            <div class="stat-value">{formatDuration(stats.avgDurationMs)}</div>
            <div class="stat-label">Avg Duration</div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Search and Filters -->
  <div class="filters-section">
    <div class="search-bar">
      <Search size={20} />
      <input
        type="text"
        placeholder="Search by message, execution ID, conversation ID..."
        bind:value={searchQuery}
        on:keydown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button class="search-btn" on:click={handleSearch}>Search</button>
    </div>
    
    <button class="filter-toggle" on:click={() => showFilters = !showFilters}>
      <Filter size={20} />
      Filters
    </button>
  </div>

  {#if showFilters}
    <div class="filters-panel">
      <div class="filter-row">
        <div class="filter-group">
          <label>Status</label>
          <select bind:value={statusFilter} on:change={handleFilterChange}>
            {#each statusOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
        
        <div class="filter-group">
          <label>Context</label>
          <input
            type="text"
            placeholder="Filter by context..."
            bind:value={contextFilter}
            on:change={handleFilterChange}
          />
        </div>
        
        <div class="filter-group">
          <label>Start Date</label>
          <input
            type="datetime-local"
            bind:value={dateRangeFilter.start}
            on:change={handleFilterChange}
          />
        </div>
        
        <div class="filter-group">
          <label>End Date</label>
          <input
            type="datetime-local"
            bind:value={dateRangeFilter.end}
            on:change={handleFilterChange}
          />
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label>Final Decision</label>
          <select bind:value={finalDecisionFilter} on:change={handleFilterChange}>
            {#each finalDecisionOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="filter-group">
          <label>Customer Message</label>
          <input
            type="text"
            placeholder="Filter by customer message..."
            bind:value={customerMessageFilter}
            on:change={handleFilterChange}
          />
        </div>

        <div class="filter-group">
          <label>AI Response</label>
          <input
            type="text"
            placeholder="Filter by AI response..."
            bind:value={aiResponseFilter}
            on:change={handleFilterChange}
          />
        </div>
      </div>
    </div>
  {/if}

  <!-- Execution Logs Table -->
  <div class="table-container">
    {#if loading}
      <div class="loading">Loading execution logs...</div>
    {:else if error}
      <div class="error">
        <AlertCircle size={20} />
        {error}
      </div>
    {:else if executionLogs && executionLogs.items.length > 0}
      <!-- Table Controls -->
      <div class="table-controls">
        <div class="table-info">
          <span class="results-count">
            Showing {executionLogs.items.length} of {executionLogs.total} results
          </span>
        </div>
        <div class="table-actions">
          <button
            class="expand-toggle-btn"
            on:click={toggleAllRows}
            title={showAllExpanded ? 'Collapse all AI responses' : 'Expand all AI responses'}
          >
            {#if showAllExpanded}
              <Minimize size={16} />
              Hide All Responses
            {:else}
              <Expand size={16} />
              Show All Responses
            {/if}
          </button>
        </div>
      </div>

      <div class="table-scroll-wrapper">
        <table class="logs-table">
        <thead>
          <tr>
            <th class="expand-col"></th>
            <th class="status-col">Status</th>
            <th class="id-col">Execution ID</th>
            <th class="context-col">Context</th>
            <th class="message-col">Message</th>
            <th class="decision-col">Final Decision</th>
            <th class="duration-col">Duration</th>
            <th class="time-col">Start Time</th>
            <th class="steps-col">Steps</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each executionLogs.items as log}
            {@const finalDecision = extractFinalDecision(log)}
            {@const aiResponse = extractAiResponseText(log)}
            {@const isExpanded = expandedRows.has(log.execution_id)}

            <!-- Main row -->
            <tr class="main-row" class:expanded={isExpanded}>
              <td class="expand-col">
                <button
                  class="expand-btn"
                  on:click={() => toggleRow(log.execution_id)}
                  title={isExpanded ? 'Hide AI response' : 'Show AI response'}
                >
                  {#if isExpanded}
                    <ChevronDown size={16} />
                  {:else}
                    <ChevronRight size={16} />
                  {/if}
                </button>
              </td>
              <td class="status-col">
                <div class="status-badge {getStatusClass(log.status)}">
                  <svelte:component this={getStatusIcon(log.status)} size={16} />
                  {log.status}
                </div>
              </td>
              <td class="id-col">
                <div class="execution-id">{log.execution_id}</div>
                <div class="conversation-id">Conv: {log.conversation_id}</div>
              </td>
              <td class="context-col">{log.context}</td>
              <td class="message-col">
                <div class="message" title={log.original_message}>
                  {truncateMessage(log.original_message)}
                </div>
              </td>
              <td class="decision-col">
                <div class="decision-badge {getFinalDecisionClass(finalDecision)}">
                  {getFinalDecisionLabel(finalDecision)}
                </div>
              </td>
              <td class="duration-col">{formatDuration(log.total_duration_ms)}</td>
              <td class="time-col">{formatDateTime(log.start_time)}</td>
              <td class="steps-col">{log.steps.length}</td>
              <td class="actions-col">
                <a href="/ai-execution-log/{log.id}" class="view-btn">
                  <Eye size={16} />
                  View
                </a>
              </td>
            </tr>

            <!-- Expandable AI response row -->
            {#if isExpanded}
              <tr class="expanded-row">
                <td colspan="10" class="ai-response-cell">
                  <div class="ai-response-content">
                    <div class="ai-response-header">
                      <h4>AI Response</h4>
                    </div>
                    <div class="ai-response-text">
                      {aiResponse || 'No AI response available'}
                    </div>

                    <!-- Comments Section -->
                    <GenericComments
                      entityType="execution-log"
                      entityId={log.execution_id}
                      entityLogId={log.id}
                    />
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
      </div>

      <!-- Pagination -->
      {#if executionLogs.total_pages > 1}
        <div class="pagination">
          <button
            disabled={currentPage === 1}
            on:click={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </button>

          <span class="page-info">
            Page {currentPage} of {executionLogs.total_pages}
            ({executionLogs.total.toLocaleString()} total)
          </span>

          <button
            disabled={currentPage === executionLogs.total_pages}
            on:click={() => handlePageChange(currentPage + 1)}
          >
            Next
          </button>
        </div>
      {/if}
    {:else}
      <div class="empty-state">
        <AlertCircle size={48} />
        <h3>No execution logs found</h3>
        <p>Try adjusting your search criteria or filters</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .execution-logs {
    padding: 2rem;
    max-width: 100%;
  }

  .header {
    margin-bottom: 2rem;
  }

  .title-section h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .title-section p {
    color: #6b7280;
    font-size: 1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .stat-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .filters-section {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  .search-bar {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    flex: 1;
    max-width: 500px;
  }

  .search-bar input {
    border: none;
    outline: none;
    flex: 1;
    margin-left: 0.5rem;
    font-size: 0.875rem;
  }

  .search-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    margin-left: 0.5rem;
  }

  .search-btn:hover {
    background: #2563eb;
  }

  .filter-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .filter-toggle:hover {
    background: #f9fafb;
  }

  .filters-panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .filter-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .filter-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .filter-group input,
  .filter-group select {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .table-container {
    background: white;
    border-radius: 0.5rem;
  }

  /* Table Controls */
  .table-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1rem;
  }

  .table-info .results-count {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .expand-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .expand-toggle-btn:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  /* Table Scroll Wrapper */
  .table-scroll-wrapper {
    overflow-x: auto;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    /* Smooth scrolling */
    scroll-behavior: smooth;
    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: #d1d5db #f9fafb;
  }

  .table-scroll-wrapper::-webkit-scrollbar {
    height: 8px;
  }

  .table-scroll-wrapper::-webkit-scrollbar-track {
    background: #f9fafb;
    border-radius: 4px;
  }

  .table-scroll-wrapper::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  .table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  .logs-table {
    width: 100%;
    min-width: 1200px; /* Minimum width for horizontal scroll */
    border-collapse: collapse;
    background: white;
  }

  .logs-table th,
  .logs-table td {
    padding: 0.75rem;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.875rem;
    text-align: left;
    vertical-align: top;
  }

  /* Column widths */
  .expand-col { width: 50px; min-width: 50px; }
  .status-col { width: 120px; min-width: 120px; }
  .id-col { width: 200px; min-width: 200px; }
  .context-col { width: 120px; min-width: 120px; }
  .message-col { width: 300px; min-width: 300px; }
  .decision-col { width: 150px; min-width: 150px; }
  .duration-col { width: 100px; min-width: 100px; }
  .time-col { width: 180px; min-width: 180px; }
  .steps-col { width: 80px; min-width: 80px; }
  .actions-col { width: 100px; min-width: 100px; }

  .logs-table th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
  }

  .main-row {
    transition: background-color 0.2s ease;
  }

  .main-row:hover {
    background: #f9fafb;
  }

  .main-row.expanded {
    background: #f0f9ff;
  }

  /* Expand Button */
  .expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .expand-btn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
    color: #374151;
  }

  /* Expandable Row */
  .expanded-row {
    background: #f8fafc;
    border-top: none;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .ai-response-cell {
    padding: 0 !important;
    border-bottom: 2px solid #e5e7eb;
  }

  .ai-response-content {
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-left: 4px solid #3b82f6;
    margin: 0.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .ai-response-header {
    margin-bottom: 1rem;
  }

  .ai-response-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ai-response-header h4::before {
    content: "🤖";
    font-size: 1.2rem;
  }

  .ai-response-text {
    background: white;
    padding: 1rem;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
    font-size: 0.875rem;
    line-height: 1.6;
    color: #374151;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 300px;
    overflow-y: auto;
    /* Custom scrollbar for AI response */
    scrollbar-width: thin;
    scrollbar-color: #d1d5db #f9fafb;
  }

  .ai-response-text::-webkit-scrollbar {
    width: 6px;
  }

  .ai-response-text::-webkit-scrollbar-track {
    background: #f9fafb;
    border-radius: 3px;
  }

  .ai-response-text::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }

  .ai-response-text::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .table-controls {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .expand-toggle-btn {
      justify-content: center;
    }

    .logs-table {
      min-width: 800px; /* Reduced minimum width for mobile */
    }

    .ai-response-content {
      margin: 0.25rem;
      padding: 1rem;
    }

    .ai-response-text {
      max-height: 200px; /* Reduced height on mobile */
    }
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .execution-id {
    font-family: monospace;
    font-size: 0.75rem;
    color: #1f2937;
  }

  .conversation-id {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .message {
    max-width: 300px;
    word-break: break-word;
  }



  .view-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
  }

  .view-btn:hover {
    background: #eff6ff;
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .pagination button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .pagination button:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  .pagination button:not(:disabled):hover {
    background: #2563eb;
  }

  .page-info {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .loading,
  .error {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #dc2626;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .empty-state h3 {
    margin: 1rem 0 0.5rem;
    color: #374151;
  }

  .decision-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .decision-badge.decision-success {
    background: #dcfce7;
    color: #16a34a;
  }

  .decision-badge.decision-warning {
    background: #fef3c7;
    color: #d97706;
  }

  .decision-badge.decision-info {
    background: #dbeafe;
    color: #2563eb;
  }

  .decision-badge.decision-error {
    background: #fee2e2;
    color: #dc2626;
  }

  .decision-badge.decision-pending {
    background: #f3f4f6;
    color: #6b7280;
  }

  .decision-badge.decision-unknown {
    background: #f9fafb;
    color: #9ca3af;
  }
</style>
