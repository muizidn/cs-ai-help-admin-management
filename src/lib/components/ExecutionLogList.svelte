<script lang="ts">
  import { onMount } from 'svelte'
  import { Clock, CheckCircle, XCircle, AlertCircle, Eye, Search, Filter } from 'lucide-svelte'
  import type { ExecutionLogResponse, ExecutionLogQuery, ExecutionLogStats } from '$lib/types/execution-logs'

  export let searchQuery = ''
  export let statusFilter = 'all'
  export let contextFilter = ''
  export let dateRangeFilter = { start: '', end: '' }

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
      <table class="logs-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Execution ID</th>
            <th>Context</th>
            <th>Message</th>
            <th>Duration</th>
            <th>Start Time</th>
            <th>Steps</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each executionLogs.items as log}
            <tr>
              <td>
                <div class="status-badge {getStatusClass(log.status)}">
                  <svelte:component this={getStatusIcon(log.status)} size={16} />
                  {log.status}
                </div>
              </td>
              <td>
                <div class="execution-id">{log.execution_id}</div>
                <div class="conversation-id">Conv: {log.conversation_id}</div>
              </td>
              <td>{log.context}</td>
              <td>
                <div class="message" title={log.original_message}>
                  {truncateMessage(log.original_message)}
                </div>
              </td>
              <td>{formatDuration(log.total_duration_ms)}</td>
              <td>{formatDateTime(log.start_time)}</td>
              <td>{log.steps.length}</td>
              <td>
                <a href="/ai-execution-log/{log.id}" class="view-btn">
                  <Eye size={16} />
                  View
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

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
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .logs-table {
    width: 100%;
    border-collapse: collapse;
  }

  .logs-table th {
    background: #f9fafb;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.875rem;
  }

  .logs-table td {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.875rem;
  }

  .logs-table tr:hover {
    background: #f9fafb;
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
</style>
