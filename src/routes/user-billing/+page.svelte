<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type { UserWithBilling, UserBillingQuery, UserBillingStats } from "$lib/types/user-billing"
  import InlineCreditEditor from "$lib/components/InlineCreditEditor.svelte"
  import "./user-billing.css"
  
  // State
  let users: UserWithBilling[] = []
  let stats: UserBillingStats | null = null
  let loading = false
  let error = ""
  let currentPage = 1
  let totalPages = 1
  let totalUsers = 0

  // Filters
  let searchQuery = ""
  let billingPlanFilter = ""
  let billingStatusFilter = ""
  let isActiveFilter = ""
  let sortBy = "createdAt"
  let sortOrder = "desc"

  // Load users
  async function loadUsers() {
    loading = true
    error = ""

    try {
      const query: UserBillingQuery = {
        search: searchQuery || undefined,
        page: currentPage,
        limit: 20,
        billingPlan: (billingPlanFilter as any) || undefined,
        billingStatus: (billingStatusFilter as any) || undefined,
        isActive: isActiveFilter ? isActiveFilter === "true" : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      }

      const queryString = apiClient.buildQueryString(query)
      const response = await apiClient.get(`/api/user-billing${queryString}`)

      if (response.status === 200 && response.data?.status === "success") {
        users = response.data.data.items
        stats = response.data.data.stats
        totalPages = response.data.data.pagination.totalPages
        totalUsers = response.data.data.pagination.total
      } else {
        error = response.data?.message || "Failed to load users"
      }
    } catch (err) {
      error = "An error occurred while loading users"
      console.error("Error loading users:", err)
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
    })
  }

  // Get status badge class
  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case "active": return "badge-success"
      case "expired": return "badge-danger"
      case "pending": return "badge-warning"
      default: return "badge-secondary"
    }
  }

  // Get plan badge class
  function getPlanBadgeClass(plan: string): string {
    switch (plan) {
      case "basic": return "badge-secondary"
      case "pro": return "badge-primary"
      case "enterprise": return "badge-premium"
      default: return "badge-secondary"
    }
  }

  // Handle search
  function handleSearch() {
    currentPage = 1
    loadUsers()
  }

  // Handle filter change
  function handleFilterChange() {
    currentPage = 1
    loadUsers()
  }

  // Handle page change
  function changePage(page: number) {
    currentPage = page
    loadUsers()
  }

  // Handle credit update
  function handleCreditUpdate(event: CustomEvent) {
    const { userId, newCredit } = event.detail
    // Update the user in the local array
    users = users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          creditBalance: newCredit,
          billingSummary: user.billingSummary ? {
            ...user.billingSummary,
            creditBalance: newCredit
          } : undefined
        }
      }
      return user
    })
  }

  // Load data on mount
  onMount(() => {
    loadUsers()
  })
</script>

<svelte:head>
  <title>User Billing Management - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  <div class="page-header">
    <h1>User Billing Management</h1>
    <p>Manage user accounts, billing plans, and payment status</p>
  </div>

  <!-- Statistics Cards -->
  {#if stats}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{stats.totalUsers}</div>
          <div class="stat-label">Total Users</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{stats.activeUsers}</div>
          <div class="stat-label">Active Users</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💳</div>
        <div class="stat-content">
          <div class="stat-value">{stats.billingStatus.active}</div>
          <div class="stat-label">Active Billing</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">{formatCurrency(stats.totalCredits)}</div>
          <div class="stat-label">Total Credits</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Filters -->
  <div class="filters-section">
    <div class="search-box">
      <input
        type="text"
        placeholder="Search users by name or email..."
        bind:value={searchQuery}
        on:keydown={(e) => e.key === "Enter" && handleSearch()}
      />
      <button on:click={handleSearch} class="search-btn">Search</button>
    </div>

    <div class="filters-row">
      <select bind:value={billingPlanFilter} on:change={handleFilterChange}>
        <option value="">All Plans</option>
        <option value="basic">Basic</option>
        <option value="pro">Pro</option>
        <option value="enterprise">Enterprise</option>
      </select>

      <select bind:value={billingStatusFilter} on:change={handleFilterChange}>
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="expired">Expired</option>
        <option value="pending">Pending</option>
      </select>

      <select bind:value={isActiveFilter} on:change={handleFilterChange}>
        <option value="">All Users</option>
        <option value="true">Active Users</option>
        <option value="false">Inactive Users</option>
      </select>

      <select bind:value={sortBy} on:change={handleFilterChange}>
        <option value="createdAt">Created Date</option>
        <option value="name">Name</option>
        <option value="email">Email</option>
        <option value="billingExpiresAt">Billing Expires</option>
        <option value="creditBalance">Credit Balance</option>
      </select>

      <select bind:value={sortOrder} on:change={handleFilterChange}>
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading users...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="error-container">
      <p class="error-message">{error}</p>
      <button on:click={loadUsers} class="retry-btn">Retry</button>
    </div>
  {/if}

  <!-- Users Table -->
  {#if !loading && !error && users.length > 0}
    <div class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Billing Plan</th>
            <th>Status</th>
            <th>Credits</th>
            <th>Expires</th>
            <th>Last Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user}
            <tr>
              <td>
                <div class="user-info">
                  <div class="user-name">{user.name}</div>
                  <div class="user-email">{user.email}</div>
                  <div class="user-meta">
                    ID: {user.id} • 
                    {user.isActive ? "Active" : "Inactive"} • 
                    Joined {formatDate(user.createdAt)}
                  </div>
                </div>
              </td>
              <td>
                <span class="badge {getPlanBadgeClass(user.billingSummary?.plan || 'basic')}">
                  {(user.billingSummary?.plan || 'basic').toUpperCase()}
                </span>
              </td>
              <td>
                <span class="badge {getStatusBadgeClass(user.billingSummary?.status || 'active')}">
                  {(user.billingSummary?.status || 'active').toUpperCase()}
                </span>
                {#if user.billingSummary?.daysUntilExpiry !== null && user.billingSummary?.daysUntilExpiry !== undefined}
                  <div class="expiry-info">
                    {user.billingSummary.daysUntilExpiry > 0 
                      ? `${user.billingSummary.daysUntilExpiry} days left`
                      : user.billingSummary.daysUntilExpiry === 0
                      ? "Expires today"
                      : `Expired ${Math.abs(user.billingSummary.daysUntilExpiry)} days ago`
                    }
                  </div>
                {/if}
              </td>
              <td>
                <InlineCreditEditor
                  userId={user.id}
                  currentCredit={user.billingSummary?.creditBalance || 0}
                  userName={user.name}
                  on:updated={handleCreditUpdate}
                />
              </td>
              <td>
                {#if user.billingSummary?.isLifetime}
                  <span class="lifetime-badge">Lifetime</span>
                {:else if user.billingSummary?.expiresAt}
                  {formatDate(user.billingSummary.expiresAt)}
                {:else}
                  <span class="no-expiry">No expiry</span>
                {/if}
              </td>
              <td>
                {#if user.billingSummary?.lastPayment}
                  <div class="payment-info">
                    <div>{formatCurrency(user.billingSummary.lastPayment.amount)}</div>
                    <div class="payment-date">{formatDate(user.billingSummary.lastPayment.date)}</div>
                  </div>
                {:else}
                  <span class="no-payment">No payments</span>
                {/if}
              </td>
              <td>
                <div class="actions">
                  <a href="/user-billing/{user.id}" class="btn btn-sm btn-primary">View Details</a>
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
        
        {#each Array(totalPages) as _, i}
          <button 
            on:click={() => changePage(i + 1)}
            class="btn btn-sm {currentPage === i + 1 ? 'btn-primary' : ''}"
          >
            {i + 1}
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
  {#if !loading && !error && users.length === 0}
    <div class="empty-state">
      <div class="empty-icon">👥</div>
      <h3>No users found</h3>
      <p>Try adjusting your search criteria or filters.</p>
    </div>
  {/if}
</div>
