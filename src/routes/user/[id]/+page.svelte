<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { goto } from "$app/navigation"
  import { apiClient } from "$lib/api-client"
  import type {
    UserWithBilling,
    UserUpdateInput,
    Transaction,
  } from "$lib/types/transactions"
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
      const response = await apiClient.get(`/api/users/${userId}`)

      if (response.status === 200 && response.data?.status === "success") {
        const userData = response.data.data
        user = userData
        // Initialize edit data
        editData = {
          name: userData.name,
          isActive: userData.isActive,
          tags: userData.tags || [],
          reason: "",
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
      const response = await apiClient.put(`/api/users/${userId}`, editData)

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
        tags: user.tags || [],
        reason: "",
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



  // Get transaction status badge class
  function getTransactionStatusBadgeClass(status: string): string {
    switch (status) {
      case "COMPLETED":
        return "badge-success"
      case "PENDING":
        return "badge-warning"
      case "FAILED":
        return "badge-danger"
      default:
        return "badge-secondary"
    }
  }

  // Approve manual transaction
  async function handleApproveTransaction(tx: Transaction) {
    if (
      !confirm(
        `Are you sure you want to approve manual payment ${tx.transactionCode}?`,
      )
    )
      return

    saving = true
    try {
      const response = await apiClient.put(`/api/transactions/${tx.id}`, {
        status: "COMPLETED",
        notes:
          (tx.notes ? tx.notes + "\n" : "") +
          "Approved manually by admin from user record.",
      })

      if (response.status === 200 && response.data?.status === "success") {
        saveSuccess = true
        await loadUser()
        setTimeout(() => (saveSuccess = false), 3000)
      } else {
        saveError = response.data?.message || "Failed to approve transaction"
      }
    } catch (err) {
      saveError = "An error occurred while approving transaction"
    } finally {
      saving = false
    }
  }

  // Load data on mount
  onMount(() => {
    loadUser()
  })
</script>

<svelte:head>
  <title>User Details - {user?.name || "Loading..."} - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  <!-- Header -->
  <div class="page-header">
    <div class="header-content">
      <div>
        <a href="/user" class="back-link">← Back to Users</a>
        <h1>User Details</h1>
        {#if user}
          <p>Manage billing and account information for {user.name}</p>
        {/if}
      </div>

      {#if user && !editMode}
        <button on:click={() => (editMode = true)} class="btn btn-primary">
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
      <div class="success-message">User updated successfully!</div>
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
              <label for="reason">Reason for Change <span class="required">*</span></label>
              <textarea
                id="reason"
                bind:value={editData.reason}
                placeholder="Explain why you are making these changes..."
                rows="3"
                required
              ></textarea>
            </div>

            <div class="form-actions">
              <button
                on:click={saveUser}
                disabled={saving || !editData.reason?.trim()}
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
                <span class="label">Name</span>
                <div class="value">{user.name}</div>
              </div>

              <div class="info-item">
                <span class="label">Email</span>
                <div class="value">{user.email}</div>
              </div>

              <div class="info-item">
                <span class="label">User ID</span>
                <div class="value code">{user.id}</div>
              </div>

              <div class="info-item">
                <span class="label">Account Status</span>
                <div class="value">
                  <span
                    class="badge {user.isActive
                      ? 'badge-success'
                      : 'badge-danger'}"
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div class="info-item">
                <span class="label">Email Verified</span>
                <div class="value">
                  <span
                    class="badge {user.emailVerified
                      ? 'badge-success'
                      : 'badge-warning'}"
                  >
                    {user.emailVerified ? "Verified" : "Not Verified"}
                  </span>
                </div>
              </div>

              <div class="info-item">
                <span class="label">Created At</span>
                <div class="value">{formatDate(user.createdAt)}</div>
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
          <a href="/transactions?userId={user.id}" class="view-all-link"
            >View All</a
          >
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
                  <th>App Code</th>
                  <th>Gateway Code</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each user.recentTransactions as transaction}
                  <tr
                    on:click={() => goto(`/transactions/${transaction.id}`)}
                    class="clickable-row"
                  >
                    <td>{formatDate(transaction.createdAt)}</td>
                    <td>
                      <span class="transaction-type">
                        {transaction.type === "CREDIT_PURCHASE"
                          ? "Credit Purchase"
                          : "Plan Upgrade"}
                      </span>
                    </td>
                    <td class="amount">{formatCurrency(transaction.amount)}</td>
                    <td>
                      <span
                        class="badge {getTransactionStatusBadgeClass(
                          transaction.status,
                        )}"
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td class="code">{transaction.id}</td>
                    <td class="code">{transaction.transactionCode}</td>
                    <td>
                      {#if transaction.status === "PENDING" && transaction.metadata?.isManual}
                        <button
                          class="btn btn-sm btn-success"
                          on:click|stopPropagation={() =>
                            handleApproveTransaction(transaction)}
                          disabled={saving}
                        >
                          {saving ? "..." : "Approve"}
                        </button>
                      {/if}
                    </td>
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
