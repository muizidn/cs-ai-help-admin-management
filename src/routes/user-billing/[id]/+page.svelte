<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { apiClient } from "$lib/api-client"
  import type { UserWithBilling, UserUpdateInput, Transaction } from "$lib/types/user-billing"
  import "./user-detail.css"
  
  // State
  let user: UserWithBilling | null = null
  let loading = false
  let error = ""
  let saving = false
  let saveError = ""
  let saveSuccess = false

  // Edit mode
  let editMode = false
  let editData: UserUpdateInput = {}

  // Get user ID from route params
  $: userId = $page.params.id

  // Load user data
  async function loadUser() {
    if (!userId) return

    loading = true
    error = ""

    try {
      const response = await apiClient.get(`/api/user-billing/${userId}`)

      if (response.status === 200 && response.data?.status === "success") {
        user = response.data.data
        // Initialize edit data
        editData = {
          name: user.name,
          isActive: user.isActive,
          billingPlan: user.billingPlan,
          billingStatus: user.billingStatus,
          billingExpiresAt: user.billingExpiresAt ? new Date(user.billingExpiresAt).toISOString().split('T')[0] : undefined,
          isLifetimeBilling: user.isLifetimeBilling,
          creditBalance: user.creditBalance,
          tags: user.tags || [],
        }
      } else {
        error = response.data?.message || "Failed to load user"
      }
    } catch (err) {
      error = "An error occurred while loading user"
      console.error("Error loading user:", err)
    } finally {
      loading = false
    }
  }

  // Save user changes
  async function saveUser() {
    if (!userId || !user) return

    saving = true
    saveError = ""
    saveSuccess = false

    try {
      const response = await apiClient.put(`/api/user-billing/${userId}`, editData)

      if (response.status === 200 && response.data?.status === "success") {
        saveSuccess = true
        editMode = false
        // Reload user data
        await loadUser()
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          saveSuccess = false
        }, 3000)
      } else {
        saveError = response.data?.message || "Failed to save user"
      }
    } catch (err) {
      saveError = "An error occurred while saving user"
      console.error("Error saving user:", err)
    } finally {
      saving = false
    }
  }

  // Cancel edit
  function cancelEdit() {
    editMode = false
    saveError = ""
    // Reset edit data
    if (user) {
      editData = {
        name: user.name,
        isActive: user.isActive,
        billingPlan: user.billingPlan,
        billingStatus: user.billingStatus,
        billingExpiresAt: user.billingExpiresAt ? new Date(user.billingExpiresAt).toISOString().split('T')[0] : undefined,
        isLifetimeBilling: user.isLifetimeBilling,
        creditBalance: user.creditBalance,
        tags: user.tags || [],
      }
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  // Get transaction status badge class
  function getTransactionStatusBadgeClass(status: string): string {
    switch (status) {
      case "COMPLETED": return "badge-success"
      case "PENDING": return "badge-warning"
      case "FAILED": return "badge-danger"
      default: return "badge-secondary"
    }
  }

  // Load data on mount
  onMount(() => {
    loadUser()
  })
</script>

<svelte:head>
  <title>User Details - {user?.name || 'Loading...'} - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  <!-- Header -->
  <div class="page-header">
    <div class="header-content">
      <div>
        <a href="/user-billing" class="back-link">← Back to Users</a>
        <h1>User Details</h1>
        {#if user}
          <p>Manage billing and account information for {user.name}</p>
        {/if}
      </div>
      
      {#if user && !editMode}
        <button on:click={() => editMode = true} class="btn btn-primary">
          Edit User
        </button>
      {/if}
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading user details...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="error-container">
      <p class="error-message">{error}</p>
      <button on:click={loadUser} class="retry-btn">Retry</button>
    </div>
  {/if}

  <!-- User Details -->
  {#if !loading && !error && user}
    <!-- Success Message -->
    {#if saveSuccess}
      <div class="success-message">
        User updated successfully!
      </div>
    {/if}

    <!-- Save Error -->
    {#if saveError}
      <div class="error-message">
        {saveError}
      </div>
    {/if}

    <div class="content-grid">
      <!-- User Information Card -->
      <div class="info-card">
        <div class="card-header">
          <h2>User Information</h2>
        </div>
        <div class="card-content">
          {#if editMode}
            <!-- Edit Form -->
            <div class="form-group">
              <label for="name">Name</label>
              <input
                id="name"
                type="text"
                bind:value={editData.name}
                placeholder="User name"
              />
            </div>

            <div class="form-group">
              <label for="isActive">Account Status</label>
              <select id="isActive" bind:value={editData.isActive}>
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>

            <div class="form-group">
              <label for="billingPlan">Billing Plan</label>
              <select id="billingPlan" bind:value={editData.billingPlan}>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div class="form-group">
              <label for="billingStatus">Billing Status</label>
              <select id="billingStatus" bind:value={editData.billingStatus}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div class="form-group">
              <label for="billingExpiresAt">Billing Expires At</label>
              <input
                id="billingExpiresAt"
                type="date"
                bind:value={editData.billingExpiresAt}
              />
            </div>

            <div class="form-group">
              <label>
                <input
                  type="checkbox"
                  bind:checked={editData.isLifetimeBilling}
                />
                Lifetime Billing
              </label>
            </div>

            <div class="form-group">
              <label for="creditBalance">Credit Balance (IDR)</label>
              <input
                id="creditBalance"
                type="number"
                bind:value={editData.creditBalance}
                min="0"
                step="1000"
              />
            </div>

            <div class="form-actions">
              <button 
                on:click={saveUser} 
                disabled={saving}
                class="btn btn-primary"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button 
                on:click={cancelEdit}
                disabled={saving}
                class="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          {:else}
            <!-- View Mode -->
            <div class="info-grid">
              <div class="info-item">
                <label>Name</label>
                <div class="value">{user.name}</div>
              </div>

              <div class="info-item">
                <label>Email</label>
                <div class="value">{user.email}</div>
              </div>

              <div class="info-item">
                <label>User ID</label>
                <div class="value code">{user.id}</div>
              </div>

              <div class="info-item">
                <label>Account Status</label>
                <div class="value">
                  <span class="badge {user.isActive ? 'badge-success' : 'badge-danger'}">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div class="info-item">
                <label>Email Verified</label>
                <div class="value">
                  <span class="badge {user.emailVerified ? 'badge-success' : 'badge-warning'}">
                    {user.emailVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
              </div>

              <div class="info-item">
                <label>Created At</label>
                <div class="value">{formatDate(user.createdAt)}</div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Billing Information Card -->
      <div class="info-card">
        <div class="card-header">
          <h2>Billing Information</h2>
        </div>
        <div class="card-content">
          {#if user.billingSummary}
            <div class="billing-grid">
              <div class="billing-item">
                <label>Plan</label>
                <div class="value">
                  <span class="badge {getPlanBadgeClass(user.billingSummary.plan)}">
                    {user.billingSummary.plan.toUpperCase()}
                  </span>
                </div>
              </div>

              <div class="billing-item">
                <label>Status</label>
                <div class="value">
                  <span class="badge {getStatusBadgeClass(user.billingSummary.status)}">
                    {user.billingSummary.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div class="billing-item">
                <label>Credit Balance</label>
                <div class="value credit-amount">
                  {formatCurrency(user.billingSummary.creditBalance)}
                </div>
              </div>

              <div class="billing-item">
                <label>Total Spent</label>
                <div class="value">
                  {formatCurrency(user.billingSummary.totalSpent)}
                </div>
              </div>

              <div class="billing-item">
                <label>Expires At</label>
                <div class="value">
                  {#if user.billingSummary.isLifetime}
                    <span class="lifetime-badge">Lifetime</span>
                  {:else if user.billingSummary.expiresAt}
                    {formatDate(user.billingSummary.expiresAt)}
                    {#if user.billingSummary.daysUntilExpiry !== null && user.billingSummary.daysUntilExpiry !== undefined}
                      <div class="expiry-info">
                        {user.billingSummary.daysUntilExpiry > 0 
                          ? `${user.billingSummary.daysUntilExpiry} days left`
                          : user.billingSummary.daysUntilExpiry === 0
                          ? "Expires today"
                          : `Expired ${Math.abs(user.billingSummary.daysUntilExpiry)} days ago`
                        }
                      </div>
                    {/if}
                  {:else}
                    <span class="no-expiry">No expiry</span>
                  {/if}
                </div>
              </div>

              <div class="billing-item">
                <label>Last Payment</label>
                <div class="value">
                  {#if user.billingSummary.lastPayment}
                    <div>{formatCurrency(user.billingSummary.lastPayment.amount)}</div>
                    <div class="payment-date">{formatDate(user.billingSummary.lastPayment.date)}</div>
                    <div class="payment-type">{user.billingSummary.lastPayment.type}</div>
                  {:else}
                    <span class="no-payment">No payments</span>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Transaction History -->
    {#if user.recentTransactions && user.recentTransactions.length > 0}
      <div class="info-card">
        <div class="card-header">
          <h2>Transaction History</h2>
          <a href="/transactions?userId={user.id}" class="view-all-link">View All</a>
        </div>
        <div class="card-content">
          <div class="transactions-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Transaction Code</th>
                </tr>
              </thead>
              <tbody>
                {#each user.recentTransactions as transaction}
                  <tr>
                    <td>{formatDate(transaction.createdAt)}</td>
                    <td>
                      <span class="transaction-type">
                        {transaction.type === "CREDIT_PURCHASE" ? "Credit Purchase" : "Plan Upgrade"}
                      </span>
                    </td>
                    <td class="amount">{formatCurrency(transaction.amount)}</td>
                    <td>
                      <span class="badge {getTransactionStatusBadgeClass(transaction.status)}">
                        {transaction.status}
                      </span>
                    </td>
                    <td class="code">{transaction.transactionCode}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
