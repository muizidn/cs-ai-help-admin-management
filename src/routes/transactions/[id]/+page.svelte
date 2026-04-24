<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { apiClient } from "$lib/api-client"
  import type {
    Transaction,
    TransactionUpdateInput,
  } from "$lib/types/transactions"
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
        const txData = response.data.data
        transaction = txData
        // Initialize edit data
        editData = {
          status: txData.status,
          amount: txData.amount,
          credits: txData.credits,
          notes: txData.notes || "",
          paymentProof: txData.paymentProof || "",
          reason: "",
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
      const response = await apiClient.put(
        `/api/transactions/${transactionId}`,
        editData,
      )

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

  // Quick Approve for Manual Payments
  async function handleApprove() {
    if (!transaction) return
    if (!confirm("Are you sure you want to approve this manual payment?"))
      return

    saving = true
    try {
      const response = await apiClient.put(
        `/api/transactions/${transaction.id}`,
        {
          status: "COMPLETED",
          metadata: { ...transaction.metadata, manuallyApproved: true },
          reason: "Manual approval by admin.",
          notes:
            (transaction.notes ? transaction.notes + "\n" : "") +
            "Approved manually by admin.",
        },
      )

      if (response.status === 200 && response.data?.status === "success") {
        saveSuccess = true
        await loadTransaction()
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

  // Cancel edit
  function cancelEdit() {
    editMode = false
    saveError = ""
    // Reset edit data
    if (transaction) {
      editData = {
        status: transaction.status,
        amount: transaction.amount,
        credits: transaction.credits,
        notes: transaction.notes || "",
        paymentProof: transaction.paymentProof || "",
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

  // Get status badge class
  function getStatusBadgeClass(status: string): string {
    if (!status) return "badge-secondary"
    const s = status.toUpperCase()
    switch (s) {
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

  // Format status for display
  function formatStatus(status: string): string {
    if (!status) return "-"
    const s = status.toUpperCase()
    if (s === "COMPLETED") return "Completed"
    if (s === "PENDING") return "Pending"
    if (s === "FAILED") return "Failed"
    return s.charAt(0) + s.slice(1).toLowerCase()
  }

  // Get type badge class
  function getTypeBadgeClass(type: string): string {
    switch (type) {
      case "CREDIT_PURCHASE":
        return "badge-primary"
      case "PLAN_UPGRADE":
        return "badge-premium"
      default:
        return "badge-secondary"
    }
  }

  // Load data on mount
  onMount(() => {
    loadTransaction()
  })
</script>

<svelte:head>
  <title
    >Transaction Details - {transaction?.transactionCode || "Loading..."} - CS AI
    Admin</title
  >
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
        <div class="header-actions">
          {#if transaction.status === "PENDING" && transaction.metadata?.isManual}
            <button
              on:click={handleApprove}
              disabled={saving}
              class="btn btn-success"
            >
              {saving ? "Processing..." : "Approve Manual Payment"}
            </button>
          {/if}
          <button on:click={() => (editMode = true)} class="btn btn-primary">
            Edit Transaction
          </button>
        </div>
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
      <div class="success-message">Transaction updated successfully!</div>
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
              <span class="label">Transaction ID</span>
              <div class="value code">{transaction.id}</div>
            </div>

            <div class="info-item">
              <span class="label">Payment Provider Trx ID</span>
              <div class="value code">
                {transaction.gatewayTransactionId ||
                  transaction.transactionCode ||
                  "-"}
                {#if transaction.metadata?.isManual}
                  <span class="badge badge-warning ml-2">MANUAL</span>
                {/if}
              </div>
            </div>

            <div class="info-item">
              <span class="label">Type</span>
              <div class="value">
                <span class="badge {getTypeBadgeClass(transaction.type)}">
                  {transaction.type === "CREDIT_PURCHASE"
                    ? "Credit Purchase"
                    : "Plan Upgrade"}
                </span>
              </div>
            </div>

            <div class="info-item">
              <span class="label">Amount</span>
              <div class="value amount">
                {#if editMode}
                  <div class="amount-edit">
                    <span class="currency-prefix">IDR</span>
                    <input
                      type="number"
                      bind:value={editData.amount}
                      class="amount-input"
                    />
                  </div>
                {:else}
                  {formatCurrency(transaction.amount)}
                {/if}
              </div>
            </div>

            <div class="info-item">
              <span class="label">Status</span>
              <div class="value">
                {#if editMode}
                  <select bind:value={editData.status}>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                {:else}
                  <span class="badge {getStatusBadgeClass(transaction.status)}">
                    {formatStatus(transaction.status)}
                  </span>
                {/if}
              </div>
            </div>

            <div class="info-item">
              <span class="label">Created At</span>
              <div class="value">{formatDate(transaction.createdAt)}</div>
            </div>

            <div class="info-item">
              <span class="label">Updated At</span>
              <div class="value">{formatDate(transaction.updatedAt)}</div>
            </div>

            {#if transaction.expiredAt}
              <div class="info-item">
                <span class="label">Expires At</span>
                <div class="value">{formatDate(transaction.expiredAt)}</div>
              </div>
            {/if}

            {#if transaction.credits || editMode}
              <div class="info-item">
                <span class="label">Credits</span>
                <div class="value">
                  {#if editMode}
                    <input
                      id="edit-credits"
                      type="number"
                      bind:value={editData.credits}
                      placeholder="Number of credits..."
                    />
                  {:else}
                    {transaction.credits} Credits
                  {/if}
                </div>
              </div>
            {/if}

            {#if transaction.plan}
              <div class="info-item">
                <span class="label">Plan</span>
                <div class="value">{transaction.plan}</div>
              </div>
            {/if}

            {#if transaction.metadata?.voucherCode}
              <div class="info-item">
                <span class="label">Applied Voucher</span>
                <div class="value">
                  <span class="badge badge-secondary">🎟️ {transaction.metadata.voucherCode}</span>
                  {#if transaction.metadata.discountAmount}
                    <div class="text-xs text-green-600 font-bold mt-1">
                      Discount: -{formatCurrency(transaction.metadata.discountAmount)}
                    </div>
                  {/if}
                  {#if transaction.metadata.originalAmount}
                    <div class="text-xs text-muted-foreground line-through">
                      Original: {formatCurrency(transaction.metadata.originalAmount)}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- User Information Card -->
      <div class="info-card">
        <div class="card-header">
          <h2>User Information</h2>
        </div>
        <div class="card-content">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Name</span>
              <div class="value">
                {#if transaction.metadata?.customerName}
                  {transaction.metadata.customerName}
                  {#if transaction.organizationId || transaction.metadata?.orgId}
                    <span class="badge badge-primary text-xs ml-2">ORGANIZATION</span>
                  {/if}
                {:else if transaction.user}
                  {transaction.user.name}
                  {#if transaction.organizationId || transaction.metadata?.orgId}
                    <span class="badge badge-primary text-xs ml-2">ORGANIZATION</span>
                  {/if}
                {:else}
                  -
                {/if}
              </div>
            </div>

            <div class="info-item">
              <span class="label">Email</span>
              <div class="value">
                {#if transaction.metadata?.email}
                  {transaction.metadata.email}
                {:else if transaction.user}
                  {transaction.user.email}
                {:else}
                  -
                {/if}
              </div>
            </div>

            <div class="info-item">
              <span class="label">User ID</span>
              <div class="value code">{transaction.userId}</div>
            </div>

            {#if transaction.userId}
              <div class="info-item">
                <span class="label">Actions</span>
                <div class="value">
                  <a
                    href="/user/{transaction.userId}"
                    class="btn btn-sm btn-secondary"
                  >
                    View User Details
                  </a>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
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
            <label for="reason"
              >Reason for Change <span class="required">*</span></label
            >
            <textarea
              id="reason"
              bind:value={editData.reason}
              placeholder="Explain why you are modifying this transaction..."
              rows="3"
              required
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
            <div class="info-item full-width">
              <span class="label">Notes</span>
              <div class="value">
                {transaction.notes || "No notes available"}
              </div>
            </div>

            {#if transaction.paymentProof}
              <div class="info-item full-width">
                <span class="label">Payment Proof</span>
                <div class="value">
                  <a
                    href={transaction.paymentProof}
                    target="_blank"
                    class="proof-link"
                  >
                    View Full Image
                  </a>
                  <div class="proof-image-container">
                    <button
                      type="button"
                      class="btn-image-zoom"
                      on:click={() => {
                        if (transaction?.paymentProof) {
                          window.open(transaction.paymentProof, "_blank")
                        }
                      }}
                      aria-label="View payment proof full size"
                    >
                      <img
                        src={transaction.paymentProof}
                        alt="Payment Proof"
                        class="proof-image"
                      />
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
