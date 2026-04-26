<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type { BillingEntity, BillingQuery } from "$lib/types/billing"
  import {
    Users,
    Building,
    CreditCard,
    Calendar,
    Shield,
    Search,
    Filter,
    ArrowUpDown,
    AlertTriangle,
  } from "lucide-svelte"

  let entities: BillingEntity[] = []
  let loading = false
  let error = ""
  let currentPage = 1
  let totalPages = 1
  let totalEntities = 0

  // Filters
  let searchQuery = ""
  let typeFilter = ""
  let statusFilter = ""
  let sortBy = "updatedAt"
  let sortOrder = "desc"

  async function loadBilling() {
    loading = true
    error = ""

    try {
      const query: BillingQuery = {
        search: searchQuery || undefined,
        page: currentPage,
        limit: 20,
        type: (typeFilter as any) || undefined,
        subscriptionStatus: statusFilter || undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      }

      const queryString = apiClient.buildQueryString(query)
      const response = await apiClient.get(`/api/billing${queryString}`)

      if (response.status === 200 && response.data?.status === "success") {
        entities = response.data.data.items
        totalPages = response.data.data.pagination.totalPages
        totalEntities = response.data.data.pagination.total
      } else {
        error = response.data?.message || "Failed to load billing data"
      }
    } catch (err) {
      error = "An error occurred while loading billing data"
      console.error(err)
    } finally {
      loading = false
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function formatDate(date: string | Date | undefined): string {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  function getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  function getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case "active":
        return "status-active"
      case "expired":
        return "status-expired"
      case "canceled":
        return "status-canceled"
      case "pending":
        return "status-pending"
      default:
        return "status-unknown"
    }
  }

  function handleSearch() {
    currentPage = 1
    loadBilling()
  }

  function handleFilterChange() {
    currentPage = 1
    loadBilling()
  }

  // Edit Modal State
  let showEditModal = false
  let selectedEntity: BillingEntity | null = null
  let editSubscriptionCredit = 0
  let editPayAsYouGoCredit = 0
  let editRolloverCredit = 0
  let editTopupBalance = 0
  let editReason = ""
  let isUpdating = false
  let updateError = ""

  $: editCreditBalance = editSubscriptionCredit + editPayAsYouGoCredit + editRolloverCredit

  function openEditModal(entity: BillingEntity) {
    selectedEntity = entity
    editSubscriptionCredit = entity.billingState?.subscriptionCredit || 0
    editPayAsYouGoCredit = entity.billingState?.payAsYouGoCredit || 0
    editRolloverCredit = entity.billingState?.rolloverCredit || 0
    editTopupBalance = entity.billingState?.topupBalance || 0
    editReason = ""
    showEditModal = true
    updateError = ""
  }

  $: legacyCredits = selectedEntity && selectedEntity.billingState ? 
    Math.max(0, (selectedEntity.billingState.creditBalance || 0) - 
    ((selectedEntity.billingState.subscriptionCredit || 0) + 
     (selectedEntity.billingState.payAsYouGoCredit || 0) + 
     (selectedEntity.billingState.rolloverCredit || 0))) : 0

  function applyMigration() {
    if (legacyCredits > 0) {
      editPayAsYouGoCredit += legacyCredits
      // We also need to update the local 'total' in selectedEntity to prevent the notice from reappearing
      // if we want it to disappear immediately, but better to just let the reactive 'legacyCredits'
      // handle it if we compare against the INITIAL state.
    }
  }

  async function handleUpdateBilling() {
    if (!selectedEntity) return

    isUpdating = true
    updateError = ""

    try {
      const response = await apiClient.put(
        `/api/billing/${selectedEntity.id}`,
        {
          subscriptionCredit: Number(editSubscriptionCredit),
          payAsYouGoCredit: Number(editPayAsYouGoCredit),
          rolloverCredit: Number(editRolloverCredit),
          topupBalance: Number(editTopupBalance),
          reason: editReason
        },
      )

      if (response.status === 200 && response.data?.status === "success") {
        showEditModal = false
        // Refresh data
        loadBilling()
      } else {
        updateError = response.data?.message || "Failed to update billing state"
      }
    } catch (err) {
      updateError = "An error occurred while updating"
      console.error(err)
    } finally {
      isUpdating = false
    }
  }

  async function handleMigrate(entity: BillingEntity) {
    if (!confirm(`Are you sure you want to migrate legacy credits for ${entity.name}? This will assign unassigned credits to the Pay-As-You-Go bucket.`)) {
      return
    }

    isUpdating = true
    try {
      await apiClient.put(
        `/api/billing/${entity.id}`,
        {
          reason: "Manual legacy data migration"
        },
      )
      // Refresh data
      await loadBilling()
    } catch (e) {
      alert("Migration failed: " + (e as any).message)
    } finally {
      isUpdating = false
    }
  }


  onMount(() => {
    loadBilling()
  })
</script>

<svelte:head>
  <title>Billing Management - CS AI Admin</title>
</svelte:head>

<div class="billing-page">
  <header class="page-header">
    <div class="header-content">
      <h1>Billing Management</h1>
      <p>Monitor and manage billing states for users and organizations</p>
    </div>
    <div class="header-actions">
      <div class="stats-overview">
        <div class="stat-mini">
          <span class="label">Total Entities</span>
          <span class="value">{totalEntities}</span>
        </div>
      </div>
    </div>
  </header>

  <section class="filters-card">
    <div class="search-bar">
      <Search size={18} class="search-icon" />
      <input
        type="text"
        placeholder="Search name or email..."
        bind:value={searchQuery}
        on:keydown={(e) => e.key === "Enter" && handleSearch()}
      />
      <button class="btn-primary" on:click={handleSearch}>Search</button>
    </div>

    <div class="filters-row">
      <div class="filter-group">
        <label for="type">Type</label>
        <select
          id="type"
          bind:value={typeFilter}
          on:change={handleFilterChange}
        >
          <option value="">All Types</option>
          <option value="user">User</option>
          <option value="organization">Organization</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="status">Status</label>
        <select
          id="status"
          bind:value={statusFilter}
          on:change={handleFilterChange}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="canceled">Canceled</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="sort">Sort By</label>
        <select id="sort" bind:value={sortBy} on:change={handleFilterChange}>
          <option value="updatedAt">Last Updated</option>
          <option value="creditBalance">Credit Balance</option>
          <option value="ownerId">ID</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="order">Order</label>
        <select
          id="order"
          bind:value={sortOrder}
          on:change={handleFilterChange}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Fetching billing data...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>{error}</p>
      <button class="btn-secondary" on:click={loadBilling}>Try Again</button>
    </div>
  {:else if entities.length === 0}
    <div class="empty-state">
      <CreditCard size={48} />
      <h3>No billing records found</h3>
      <p>Try adjusting your filters or search query</p>
    </div>
  {:else}
    <div class="table-container">
      <table class="billing-table">
        <thead>
          <tr>
            <th>Entity</th>
            <th>Type</th>
            <th>Subscription</th>
            <th>Credit Balance</th>
            <th>Topup Balance</th>
            <th>Next Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each entities as entity}
            <tr>
              <td>
                <div class="entity-info">
                  <span class="entity-name">{entity.name}</span>
                  <span class="entity-sub">{entity.email || entity.id}</span>
                </div>
              </td>
              <td>
                <span class="type-badge {entity.type}">
                  {#if entity.type === "user"}
                    <Users size={14} />
                  {:else}
                    <Building size={14} />
                  {/if}
                  {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
                </span>
              </td>
              <td>
                <div class="subscription-info">
                  <span
                    class="status-badge {getStatusClass(
                      entity.billingState?.subscriptionStatus || '',
                    )}"
                  >
                    {getStatusLabel(
                      entity.billingState?.subscriptionStatus || "Unknown",
                    )}
                  </span>
                  <span class="plan-name"
                    >{entity.billingState?.planId || "Free"}</span
                  >
                </div>
              </td>
              <td>
                <div class="balance-cell">
                  <span class="balance-value">
                    {Math.max(
                      (entity.billingState?.subscriptionCredit || 0) +
                        (entity.billingState?.payAsYouGoCredit || 0) +
                        (entity.billingState?.rolloverCredit || 0),
                      entity.billingState?.creditBalance || 0,
                    )}
                  </span>
                  {#if (entity.billingState?.creditBalance || 0) > (entity.billingState?.subscriptionCredit || 0) + (entity.billingState?.payAsYouGoCredit || 0) + (entity.billingState?.rolloverCredit || 0)}
                    <span class="legacy-badge" title="Has unassigned legacy credits"
                      >Legacy</span
                    >
                  {/if}
                  <div class="balance-breakdown">
                    <span title="Subscription Credit">S: {entity.billingState?.subscriptionCredit || 0}</span>
                    <span title="Pay-As-You-Go Credit">P: {entity.billingState?.payAsYouGoCredit || 0}</span>
                    <span title="Rollover Credit">R: {entity.billingState?.rolloverCredit || 0}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="topup-value"
                  >{formatCurrency(
                    entity.billingState?.topupBalance || 0,
                  )}</span
                >
              </td>
              <td>
                <div class="date-cell">
                  <Calendar size={14} />
                  <span
                    >{formatDate(entity.billingState?.currentPeriodEnd)}</span
                  >
                </div>
              </td>
              <td>
                <div class="table-actions">
                  <button
                    class="btn-icon"
                    title="Edit Billing"
                    on:click={() => openEditModal(entity)}
                  >
                    <Shield size={18} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if totalPages > 1}
      <div class="pagination">
        <button
          class="btn-page"
          disabled={currentPage === 1}
          on:click={() => {
            currentPage--
            loadBilling()
          }}
        >
          Previous
        </button>
        <span class="page-info">Page {currentPage} of {totalPages}</span>
        <button
          class="btn-page"
          disabled={currentPage === totalPages}
          on:click={() => {
            currentPage++
            loadBilling()
          }}
        >
          Next
        </button>
      </div>
    {/if}
  {/if}

  {#if showEditModal && selectedEntity}
    <div
      class="modal-backdrop"
      on:click={() => (showEditModal = false)}
      role="button"
      tabindex="-1"
      on:keydown={(e) => e.key === "Escape" && (showEditModal = false)}
    >
      <div
        class="modal-content"
        on:click|stopPropagation
        role="dialog"
        aria-modal="true"
      >
        <div class="modal-header">
          <h2>Edit Billing State</h2>
          <button class="btn-close" on:click={() => (showEditModal = false)}
            >×</button
          >
        </div>

        <div class="entity-preview">
          <div class="preview-avatar">
            {#if selectedEntity.type === "user"}
              <Users size={20} />
            {:else}
              <Building size={20} />
            {/if}
          </div>
          <div class="preview-details">
            <strong>{selectedEntity.name}</strong>
            <span>{selectedEntity.email || selectedEntity.id}</span>
          </div>
          {#if legacyCredits > 0}
            <div class="legacy-notice">
              <AlertTriangle size={14} />
              <span>{legacyCredits} legacy credits found</span>
              <button class="btn-migrate-inline" on:click={applyMigration}>Migrate</button>
            </div>
          {/if}
        </div>

        {#if updateError}
          <div class="modal-error">{updateError}</div>
        {/if}

        <div class="modal-body">
          <div class="credit-buckets-grid">
            <div class="form-group-modal">
              <label for="edit-sub-credits">Subscription Credit</label>
              <div class="input-with-icon">
                <Calendar size={18} />
                <input
                  id="edit-sub-credits"
                  type="number"
                  bind:value={editSubscriptionCredit}
                  placeholder="0"
                />
              </div>
              <span class="help-text">Monthly quota credits</span>
            </div>

            <div class="form-group-modal">
              <label for="edit-payg-credits">Pay-As-You-Go Credit</label>
              <div class="input-with-icon">
                <CreditCard size={18} />
                <input
                  id="edit-payg-credits"
                  type="number"
                  bind:value={editPayAsYouGoCredit}
                  placeholder="0"
                />
              </div>
              <span class="help-text">Purchased top-up credits</span>
            </div>

            <div class="form-group-modal">
              <label for="edit-roll-credits">Rollover Credit</label>
              <div class="input-with-icon">
                <ArrowUpDown size={18} />
                <input
                  id="edit-roll-credits"
                  type="number"
                  bind:value={editRolloverCredit}
                  placeholder="0"
                />
              </div>
              <span class="help-text">Credits rolled from previous period</span>
            </div>
          </div>

          <div class="form-group-modal total-credits-group">
            <label for="edit-credits">Total Credit Balance (Calculated)</label>
            <div class="input-with-icon disabled">
              <Shield size={18} />
              <div class="calculated-value">
                {editCreditBalance}
              </div>
            </div>
            <span class="help-text">Sum of all credit buckets</span>
          </div>

          <div class="form-group-modal">
            <label for="edit-topup">Topup Balance (IDR)</label>
            <div class="input-with-icon">
              <span class="currency-label">IDR</span>
              <input
                id="edit-topup"
                type="number"
                bind:value={editTopupBalance}
                placeholder="0"
              />
            </div>
            <span class="help-text"
              >Manual topup balance for future payments</span
            >
          </div>

          <div class="form-group-modal">
            <label for="edit-reason">Reason for Change <span class="required">*</span></label>
            <textarea
              id="edit-reason"
              bind:value={editReason}
              placeholder="Explain why you are making this adjustment..."
              rows="3"
              required
            ></textarea>
            <span class="help-text">This will be recorded in the credit ledger</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" on:click={() => (showEditModal = false)}
            >Cancel</button
          >
          <button
            class="btn-save"
            on:click={handleUpdateBilling}
            disabled={isUpdating || !editReason.trim()}
          >
            {isUpdating ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .billing-page {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    font-family:
      "Inter",
      system-ui,
      -apple-system,
      sans-serif;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2rem;
  }

  .header-content h1 {
    font-size: 2.25rem;
    font-weight: 800;
    color: #111827;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.025em;
  }

  .header-content p {
    color: #6b7280;
    font-size: 1.125rem;
    margin: 0;
  }

  .stat-mini {
    background: white;
    padding: 0.75rem 1.25rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    border: 1px solid #e5e7eb;
  }

  .stat-mini .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9ca3af;
    font-weight: 600;
  }

  .stat-mini .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2563eb;
  }

  .filters-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    margin-bottom: 2rem;
    border: 1px solid #f3f4f6;
  }

  .search-bar {
    display: flex;
    gap: 1rem;
    align-items: center;
    background: #f9fafb;
    padding: 0.5rem 1rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    margin-bottom: 1.5rem;
    transition: all 0.2s;
  }

  .search-bar:focus-within {
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .search-bar input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.5rem;
    font-size: 1rem;
    outline: none;
    color: #111827;
  }

  .search-icon {
    color: #9ca3af;
  }

  .filters-row {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 160px;
  }

  .filter-group label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .filter-group select {
    padding: 0.625rem;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    background: white;
    font-size: 0.875rem;
    color: #111827;
    cursor: pointer;
    outline: none;
    transition: all 0.2s;
  }

  .filter-group select:hover {
    border-color: #d1d5db;
  }

  .filter-group select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .table-container {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border: 1px solid #f3f4f6;
  }

  .billing-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .billing-table th {
    background: #f9fafb;
    padding: 1rem 1.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    border-bottom: 1px solid #f3f4f6;
  }

  .billing-table td {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: middle;
  }

  .entity-info {
    display: flex;
    flex-direction: column;
  }

  .entity-name {
    font-weight: 600;
    color: #111827;
    font-size: 1rem;
  }

  .entity-sub {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .type-badge.user {
    background: #eff6ff;
    color: #1e40af;
  }
  .type-badge.organization {
    background: #fdf2f8;
    color: #9d174d;
  }

  .status-badge {
    display: inline-block;
    padding: 0.125rem 0.625rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status-active {
    background: #dcfce7;
    color: #166534;
  }
  .status-expired {
    background: #fee2e2;
    color: #991b1b;
  }
  .status-canceled {
    background: #f3f4f6;
    color: #374151;
  }
  .status-pending {
    background: #fef9c3;
    color: #854d0e;
  }

  .subscription-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .plan-name {
    font-size: 0.875rem;
    color: #4b5563;
    font-weight: 500;
  }

  .balance-cell {
    display: flex;
    flex-direction: column;
  }

  .balance-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
  }

  .balance-breakdown {
    display: flex;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: #6b7280;
    font-weight: 500;
  }

  .balance-breakdown span {
    background: #f3f4f6;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
  }

  .legacy-badge {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    background: #fff7ed;
    color: #c2410c;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    border: 1px solid #ffedd5;
    margin-top: 0.25rem;
  }

  .legacy-notice {
    margin-left: auto;
    background: #fff7ed;
    border: 1px solid #ffedd5;
    padding: 0.4rem 0.75rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #c2410c;
    font-weight: 600;
  }

  .btn-migrate-inline {
    background: #c2410c;
    color: white;
    border: none;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
  }

  .btn-migrate-inline:hover {
    background: #9a3412;
  }

  .credit-buckets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
    background: #f9fafb;
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }

  .total-credits-group {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .input-with-icon.disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }

  .calculated-value {
    width: 100%;
    padding: 0.75rem 0.75rem 0.75rem 2.75rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e40af;
    background: #eff6ff;
  }

  .balance-label {
    font-size: 0.75rem;
    color: #9ca3af;
    font-weight: 500;
    text-transform: uppercase;
  }

  .topup-value {
    font-weight: 600;
    color: #059669;
  }

  .date-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #4b5563;
    font-size: 0.875rem;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-icon {
    background: #f3f4f6;
    color: #4b5563;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e5e7eb;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    background: #e5e7eb;
    color: #111827;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .btn-page {
    background: white;
    border: 1px solid #e5e7eb;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-page:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .btn-page:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-state,
  .error-state,
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 16px;
    border: 1px dashed #e5e7eb;
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    border-radius: 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: #111827;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #9ca3af;
    cursor: pointer;
    line-height: 1;
  }

  .entity-preview {
    padding: 1rem 1.5rem;
    background: #f9fafb;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .preview-avatar {
    width: 40px;
    height: 40px;
    background: white;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    border: 1px solid #e5e7eb;
  }

  .preview-details {
    display: flex;
    flex-direction: column;
  }

  .preview-details strong {
    font-size: 0.9375rem;
    color: #111827;
  }

  .preview-details span {
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .form-group-modal {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group-modal label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-with-icon :global(svg),
  .currency-label {
    position: absolute;
    left: 1rem;
    color: #9ca3af;
  }

  .currency-label {
    font-weight: 700;
    font-size: 0.75rem;
  }

  .input-with-icon input {
    width: 100%;
    padding: 0.75rem 0.75rem 0.75rem 2.75rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    font-size: 1rem;
    font-weight: 600;
    outline: none;
  }

  .input-with-icon input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .form-group-modal textarea {
    padding: 0.75rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    font-size: 0.875rem;
    outline: none;
    resize: none;
    font-weight: 500;
  }

  .form-group-modal textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .help-text {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .modal-error {
    margin: 1rem 1.5rem 0;
    padding: 0.75rem;
    background: #fef2f2;
    color: #991b1b;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .modal-footer {
    padding: 1.25rem 1.5rem;
    background: #f9fafb;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  .btn-cancel {
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    background: white;
    color: #374151;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-save {
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    border: none;
    background: #2563eb;
    color: white;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-save:hover {
    background: #1d4ed8;
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .required {
    color: #ef4444;
    margin-left: 2px;
  }
</style>
