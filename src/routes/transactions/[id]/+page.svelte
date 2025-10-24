<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { apiClient } from "$lib/api-client"
  import type { Transaction, TransactionUpdateInput } from "$lib/types/user-billing"
  import "./transaction-detail.css"
  
  // State
  let transaction: Transaction | null = null
  let loading = false
  let error = ""
  let saving = false
  let saveError = ""
  let saveSuccess = false

  // Edit mode
  let editMode = false
  let editData: TransactionUpdateInput = {}

  // Get transaction ID from route params
  $: transactionId = $page.params.id

  // Load transaction data
  async function loadTransaction() {
    if (!transactionId) return

    loading = true
    error = ""

    try {
      const response = await apiClient.get(`/api/transactions/${transactionId}`)

      if (response.status === 200 && response.data?.status === "success") {
        transaction = response.data.data
        // Initialize edit data
        editData = {
          status: transaction.status,
          notes: transaction.notes || "",
          paymentProof: transaction.paymentProof || "",
        }
      } else {
        error = response.data?.message || "Failed to load transaction"
      }
    } catch (err) {
      error = "An error occurred while loading transaction"
      console.error("Error loading transaction:", err)
    } finally {
      loading = false
    }
  }

  // Save transaction changes
  async function saveTransaction() {
    if (!transactionId || !transaction) return

    saving = true
    saveError = ""
    saveSuccess = false

    try {
      const response = await apiClient.put(`/api/transactions/${transactionId}`, editData)

      if (response.status === 200 && response.data?.status === "success") {
        saveSuccess = true
        editMode = false
        // Reload transaction data
        await loadTransaction()
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          saveSuccess = false
        }, 3000)
      } else {
        saveError = response.data?.message || "Failed to save transaction"
      }
    } catch (err) {
      saveError = "An error occurred while saving transaction"
      console.error("Error saving transaction:", err)
    } finally {
      saving = false
    }
  }

  // Cancel edit
  function cancelEdit() {
    editMode = false
    saveError = ""
    // Reset edit data
    if (transaction) {
      editData = {
        status: transaction.status,
        notes: transaction.notes || "",
        paymentProof: transaction.paymentProof || "",
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

  // Load data on mount
  onMount(() => {
    loadTransaction()
  })
</script>

<svelte:head>
  <title>Transaction Details - {transaction?.transactionCode || 'Loading...'} - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  <!-- Header -->
  <div class="page-header">
    <div class="header-content">
      <div>
        <a href="/transactions" class="back-link">← Back to Transactions</a>
        <h1>Transaction Details</h1>
        {#if transaction}
          <p>Manage transaction {transaction.transactionCode}</p>
        {/if}
      </div>
      
      {#if transaction && !editMode}
        <button on:click={() => editMode = true} class="btn btn-primary">
          Edit Transaction
        </button>
      {/if}
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading transaction details...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="error-container">
      <p class="error-message">{error}</p>
      <button on:click={loadTransaction} class="retry-btn">Retry</button>
    </div>
  {/if}

  <!-- Transaction Details -->
  {#if !loading && !error && transaction}
    <!-- Success Message -->
    {#if saveSuccess}
      <div class="success-message">
        Transaction updated successfully!
      </div>
    {/if}

    <!-- Save Error -->
    {#if saveError}
      <div class="error-message">
        {saveError}
      </div>
    {/if}

    <div class="content-grid">
      <!-- Transaction Information Card -->
      <div class="info-card">
        <div class="card-header">
          <h2>Transaction Information</h2>
        </div>
        <div class="card-content">
          <div class="info-grid">
            <div class="info-item">
              <label>Transaction Code</label>
              <div class="value code">{transaction.transactionCode}</div>
            </div>

            <div class="info-item">
              <label>Type</label>
              <div class="value">
                <span class="badge {getTypeBadgeClass(transaction.type)}">
                  {transaction.type === "CREDIT_PURCHASE" ? "Credit Purchase" : "Plan Upgrade"}
                </span>
              </div>
            </div>

            <div class="info-item">
              <label>Amount</label>
              <div class="value amount">{formatCurrency(transaction.amount)}</div>
            </div>

            <div class="info-item">
              <label>Status</label>
              <div class="value">
                {#if editMode}
                  <select bind:value={editData.status}>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                {:else}
                  <span class="badge {getStatusBadgeClass(transaction.status)}">
                    {transaction.status}
                  </span>
                {/if}
              </div>
            </div>

            <div class="info-item">
              <label>Created At</label>
              <div class="value">{formatDate(transaction.createdAt)}</div>
            </div>

            <div class="info-item">
              <label>Updated At</label>
              <div class="value">{formatDate(transaction.updatedAt)}</div>
            </div>

            {#if transaction.expiredAt}
              <div class="info-item">
                <label>Expires At</label>
                <div class="value">{formatDate(transaction.expiredAt)}</div>
              </div>
            {/if}

            {#if transaction.plan}
              <div class="info-item">
                <label>Plan</label>
                <div class="value">{transaction.plan}</div>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- User Information Card -->
      {#if transaction.user}
        <div class="info-card">
          <div class="card-header">
            <h2>User Information</h2>
          </div>
          <div class="card-content">
            <div class="info-grid">
              <div class="info-item">
                <label>Name</label>
                <div class="value">{transaction.user.name}</div>
              </div>

              <div class="info-item">
                <label>Email</label>
                <div class="value">{transaction.user.email}</div>
              </div>

              <div class="info-item">
                <label>User ID</label>
                <div class="value code">{transaction.user.id}</div>
              </div>

              <div class="info-item">
                <label>Actions</label>
                <div class="value">
                  <a href="/user-billing/{transaction.user.id}" class="btn btn-sm btn-secondary">
                    View User Details
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Notes and Payment Proof -->
    <div class="info-card">
      <div class="card-header">
        <h2>Additional Information</h2>
      </div>
      <div class="card-content">
        {#if editMode}
          <!-- Edit Form -->
          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea
              id="notes"
              bind:value={editData.notes}
              placeholder="Add notes about this transaction..."
              rows="4"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="paymentProof">Payment Proof URL</label>
            <input
              id="paymentProof"
              type="url"
              bind:value={editData.paymentProof}
              placeholder="https://example.com/payment-proof.jpg"
            />
          </div>

          <div class="form-actions">
            <button 
              on:click={saveTransaction} 
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
            <div class="info-item full-width">
              <label>Notes</label>
              <div class="value">
                {transaction.notes || "No notes available"}
              </div>
            </div>

            {#if transaction.paymentProof}
              <div class="info-item full-width">
                <label>Payment Proof</label>
                <div class="value">
                  <a href={transaction.paymentProof} target="_blank" class="proof-link">
                    View Payment Proof
                  </a>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
