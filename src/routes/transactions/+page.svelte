<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { apiClient } from "$lib/api-client"
  import type { Transaction, TransactionQuery, TransactionStats } from "$lib/types/user-billing"
  import "./transactions.css"
  
  // State
  let transactions: (Transaction & { user?: any })[] = []
  let stats: TransactionStats | null = null
  let loading = false
  let error = ""
  let currentPage = 1
  let totalPages = 1
  let totalTransactions = 0

  // Filters
  let searchQuery = ""
  let userIdFilter = ""
  let typeFilter = ""
  let statusFilter = ""
  let dateFromFilter = ""
  let dateToFilter = ""
  let sortBy = "createdAt"
  let sortOrder = "desc"

  // Get initial filters from URL params
  $: {
    const urlParams = $page.url.searchParams
    userIdFilter = urlParams.get("userId") || ""
  }

  // Load transactions
  async function loadTransactions() {
    loading = true
    error = ""

    try {
      const query: TransactionQuery = {
        search: searchQuery || undefined,
        page: currentPage,
        limit: 20,
        userId: userIdFilter || undefined,
        type: (typeFilter as any) || undefined,
        status: (statusFilter as any) || undefined,
        dateFrom: dateFromFilter || undefined,
        dateTo: dateToFilter || undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      }

      const queryString = apiClient.buildQueryString(query)
      const response = await apiClient.get(`/api/transactions${queryString}`)

      if (response.status === 200 && response.data?.status === "success") {
        transactions = response.data.data.items
        stats = response.data.data.stats
        totalPages = response.data.data.pagination.totalPages
        totalTransactions = response.data.data.pagination.total
      } else {
        error = response.data?.message || "Failed to load transactions"
      }
    } catch (err) {
      error = "An error occurred while loading transactions"
      console.error("Error loading transactions:", err)
    } finally {
      loading = false
    }
  }

  // Format currency
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get status badge class
  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case "COMPLETED": return "badge-success"
      case "PENDING": return "badge-warning"
      case "FAILED": return "badge-danger"
      default: return "badge-secondary"
    }
  }

  // Get type badge class
  function getTypeBadgeClass(type: string): string {
    switch (type) {
      case "CREDIT_PURCHASE": return "badge-primary"
      case "PLAN_UPGRADE": return "badge-premium"
      default: return "badge-secondary"
    }
  }

  // Handle search
  function handleSearch() {
    currentPage = 1
    loadTransactions()
  }

  // Handle filter change
  function handleFilterChange() {
    currentPage = 1
    loadTransactions()
  }

  // Handle page change
  function changePage(page: number) {
    currentPage = page
    loadTransactions()
  }

  // Clear filters
  function clearFilters() {
    searchQuery = ""
    userIdFilter = ""
    typeFilter = ""
    statusFilter = ""
    dateFromFilter = ""
    dateToFilter = ""
    sortBy = "createdAt"
    sortOrder = "desc"
    currentPage = 1
    loadTransactions()
  }

  // Load data on mount
  onMount(() => {
    loadTransactions()
  })
</script>

<svelte:head>
  <title>Transaction Management - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  <div class="page-header">
    <h1>Transaction Management</h1>
    <p>Monitor and manage all user transactions and payments</p>
  </div>

  <!-- Statistics Cards -->
  {#if stats}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{stats.totalTransactions}</div>
          <div class="stat-label">Total Transactions</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">{formatCurrency(stats.totalAmount)}</div>
          <div class="stat-label">Total Amount</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{stats.byStatus.completed}</div>
          <div class="stat-label">Completed</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-value">{stats.byStatus.pending}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Filters -->
  <div class="filters-section">
    <div class="search-box">
      <input
        type="text"
        placeholder="Search by transaction code or notes..."
        bind:value={searchQuery}
        on:keydown={(e) => e.key === "Enter" && handleSearch()}
      />
      <button on:click={handleSearch} class="search-btn">Search</button>
    </div>

    <div class="filters-row">
      <input
        type="text"
        placeholder="User ID"
        bind:value={userIdFilter}
        on:input={handleFilterChange}
      />

      <select bind:value={typeFilter} on:change={handleFilterChange}>
        <option value="">All Types</option>
        <option value="CREDIT_PURCHASE">Credit Purchase</option>
        <option value="PLAN_UPGRADE">Plan Upgrade</option>
      </select>

      <select bind:value={statusFilter} on:change={handleFilterChange}>
        <option value="">All Status</option>
        <option value="COMPLETED">Completed</option>
        <option value="PENDING">Pending</option>
        <option value="FAILED">Failed</option>
      </select>

      <input
        type="date"
        placeholder="From Date"
        bind:value={dateFromFilter}
        on:change={handleFilterChange}
      />

      <input
        type="date"
        placeholder="To Date"
        bind:value={dateToFilter}
        on:change={handleFilterChange}
      />

      <select bind:value={sortBy} on:change={handleFilterChange}>
        <option value="createdAt">Created Date</option>
        <option value="amount">Amount</option>
        <option value="status">Status</option>
        <option value="type">Type</option>
      </select>

      <select bind:value={sortOrder} on:change={handleFilterChange}>
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>

      <button on:click={clearFilters} class="clear-btn">Clear Filters</button>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading transactions...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="error-container">
      <p class="error-message">{error}</p>
      <button on:click={loadTransactions} class="retry-btn">Retry</button>
    </div>
  {/if}

  <!-- Transactions Table -->
  {#if !loading && !error && transactions.length > 0}
    <div class="table-container">
      <table class="transactions-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>User</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Transaction Code</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each transactions as transaction}
            <tr>
              <td>
                <div class="date-info">
                  {formatDate(transaction.createdAt)}
                </div>
              </td>
              <td>
                {#if transaction.user}
                  <div class="user-info">
                    <div class="user-name">{transaction.user.name}</div>
                    <div class="user-email">{transaction.user.email}</div>
                    <div class="user-id">ID: {transaction.user.id}</div>
                  </div>
                {:else}
                  <div class="user-info">
                    <div class="user-id">ID: {transaction.userId}</div>
                  </div>
                {/if}
              </td>
              <td>
                <span class="badge {getTypeBadgeClass(transaction.type)}">
                  {transaction.type === "CREDIT_PURCHASE" ? "Credit Purchase" : "Plan Upgrade"}
                </span>
                {#if transaction.plan}
                  <div class="plan-info">{transaction.plan}</div>
                {/if}
              </td>
              <td>
                <div class="amount-info">
                  {formatCurrency(transaction.amount)}
                </div>
              </td>
              <td>
                <span class="badge {getStatusBadgeClass(transaction.status)}">
                  {transaction.status}
                </span>
                {#if transaction.expiredAt && transaction.status === "PENDING"}
                  <div class="expiry-info">
                    Expires: {formatDate(transaction.expiredAt)}
                  </div>
                {/if}
              </td>
              <td>
                <div class="transaction-code">{transaction.transactionCode}</div>
              </td>
              <td>
                <div class="notes">
                  {transaction.notes || "-"}
                </div>
                {#if transaction.paymentProof}
                  <div class="payment-proof">
                    <a href={transaction.paymentProof} target="_blank" class="proof-link">
                      View Proof
                    </a>
                  </div>
                {/if}
              </td>
              <td>
                <div class="actions">
                  <a href="/transactions/{transaction.id}" class="btn btn-sm btn-primary">
                    Edit
                  </a>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pagination">
        <button 
          on:click={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          class="btn btn-sm"
        >
          Previous
        </button>
        
        {#each Array(Math.min(totalPages, 10)) as _, i}
          {@const pageNum = i + 1}
          <button 
            on:click={() => changePage(pageNum)}
            class="btn btn-sm {currentPage === pageNum ? 'btn-primary' : ''}"
          >
            {pageNum}
          </button>
        {/each}
        
        <button 
          on:click={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          class="btn btn-sm"
        >
          Next
        </button>
      </div>
    {/if}
  {/if}

  <!-- Empty State -->
  {#if !loading && !error && transactions.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>No transactions found</h3>
      <p>Try adjusting your search criteria or filters.</p>
    </div>
  {/if}
</div>
