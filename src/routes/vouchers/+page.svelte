<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type { Voucher, VoucherQuery, VoucherStats, VoucherCreateInput } from "$lib/types/voucher"
  import { Plus, Search, Filter, Trash2, Power, PowerOff, Edit } from "lucide-svelte"
  import "../user-billing/user-billing.css"
  
  // State
  let vouchers: Voucher[] = []
  let stats: VoucherStats | null = null
  let loading = false
  let error = ""
  let currentPage = 1
  let totalPages = 1
  let totalItems = 0

  // Filters
  let searchQuery = ""
  let isActiveFilter = ""
  let sortBy = "createdAt"
  let sortOrder = "desc"

  // Modal State
  let showCreateModal = false
  let isSubmitting = false
  let newVoucher: VoucherCreateInput = {
    code: "",
    discountType: "PERCENTAGE",
    discountValue: 0,
    limitUse: 1,
    isActive: true,
    expiresAt: null
  }

  // Load vouchers
  async function loadVouchers() {
    loading = true
    error = ""

    try {
      const query: VoucherQuery = {
        search: searchQuery || undefined,
        page: currentPage,
        limit: 20,
        isActive: isActiveFilter ? isActiveFilter === "true" : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      }

      const queryString = apiClient.buildQueryString(query)
      const response = await apiClient.get(`/api/vouchers${queryString}`)

      if (response.status === 200 && response.data?.status === "success") {
        vouchers = response.data.data.items
        stats = response.data.data.stats
        totalPages = response.data.data.pagination.totalPages
        totalItems = response.data.data.pagination.total
      } else {
        error = response.data?.message || "Failed to load vouchers"
      }
    } catch (err) {
      error = "An error occurred while loading vouchers"
      console.error("Error loading vouchers:", err)
    } finally {
      loading = false
    }
  }

  // Handle Create
  async function handleCreateVoucher() {
    isSubmitting = true
    try {
      const response = await apiClient.post("/api/vouchers", newVoucher)
      if (response.status === 200 && response.data?.status === "success") {
        showCreateModal = false
        // Reset form
        newVoucher = {
          code: "",
          discountType: "PERCENTAGE",
          discountValue: 0,
          limitUse: 1,
          isActive: true,
          expiresAt: null
        }
        loadVouchers()
      } else {
        alert(response.data?.message || "Failed to create voucher")
      }
    } catch (err) {
      console.error("Error creating voucher:", err)
      alert("An error occurred")
    } finally {
      isSubmitting = false
    }
  }

  // Toggle Status
  async function toggleStatus(voucher: Voucher) {
    try {
      const response = await apiClient.patch(`/api/vouchers/${voucher.id}`, {
        isActive: !voucher.isActive
      })
      if (response.status === 200 && response.data?.status === "success") {
        loadVouchers()
      }
    } catch (err) {
      console.error("Error toggling status:", err)
    }
  }

  // Delete Voucher
  async function deleteVoucher(id: string) {
    if (!confirm("Are you sure you want to delete this voucher?")) return
    
    try {
      const response = await apiClient.delete(`/api/vouchers/${id}`)
      if (response.status === 200 && response.data?.status === "success") {
        loadVouchers()
      }
    } catch (err) {
      console.error("Error deleting voucher:", err)
    }
  }

  // Format Helpers
  function formatDate(date: string | Date | null): string {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric", month: "short", day: "numeric"
    })
  }

  function handleSearch() { currentPage = 1; loadVouchers(); }
  function handleFilterChange() { currentPage = 1; loadVouchers(); }
  function changePage(page: number) { currentPage = page; loadVouchers(); }

  onMount(() => {
    loadVouchers()
  })
</script>

<svelte:head>
  <title>Voucher Management - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  <div class="page-header flex justify-between items-center">
    <div>
      <h1>Voucher Management</h1>
      <p>Create and manage discount vouchers for your users</p>
    </div>
    <button class="btn btn-primary flex items-center gap-2" on:click={() => showCreateModal = true}>
      <Plus size={18} />
      Create Voucher
    </button>
  </div>

  <!-- Stats -->
  {#if stats}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🎟️</div>
        <div class="stat-content">
          <div class="stat-value">{stats.totalVouchers}</div>
          <div class="stat-label">Total Vouchers</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon text-success">✅</div>
        <div class="stat-content">
          <div class="stat-value">{stats.activeVouchers}</div>
          <div class="stat-label">Active Vouchers</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon text-primary">📊</div>
        <div class="stat-content">
          <div class="stat-value">{stats.totalUsedCount}</div>
          <div class="stat-label">Total Redemptions</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Filters -->
  <div class="filters-section">
    <div class="search-box">
      <input
        type="text"
        placeholder="Search vouchers by code..."
        bind:value={searchQuery}
        on:keydown={(e) => e.key === "Enter" && handleSearch()}
      />
      <button on:click={handleSearch} class="search-btn">Search</button>
    </div>

    <div class="filters-row">
      <select bind:value={isActiveFilter} on:change={handleFilterChange}>
        <option value="">All Status</option>
        <option value="true">Active Only</option>
        <option value="false">Inactive Only</option>
      </select>

      <select bind:value={sortBy} on:change={handleFilterChange}>
        <option value="createdAt">Created Date</option>
        <option value="code">Code</option>
        <option value="usedCount">Usage Count</option>
        <option value="expiresAt">Expiration</option>
      </select>

      <select bind:value={sortOrder} on:change={handleFilterChange}>
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </div>
  </div>

  <!-- Loading/Error -->
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading vouchers...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <p class="error-message">{error}</p>
      <button on:click={loadVouchers} class="retry-btn">Retry</button>
    </div>
  {:else if vouchers.length > 0}
    <div class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>Voucher Code</th>
            <th>Discount</th>
            <th>Usage Limit</th>
            <th>Redemptions</th>
            <th>Status</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each vouchers as voucher}
            <tr>
              <td>
                <div class="font-mono font-bold text-lg text-blue-600">{voucher.code}</div>
                <div class="text-xs text-gray-400">Created: {formatDate(voucher.createdAt)}</div>
              </td>
              <td>
                <span class="badge badge-primary">
                  {voucher.discountType === 'PERCENTAGE' ? `${voucher.discountValue}%` : `IDR ${voucher.discountValue.toLocaleString()}`}
                </span>
              </td>
              <td>{voucher.limitUse}</td>
              <td>
                <div class="flex flex-col">
                  <span>{voucher.usedCount} used</span>
                  {#if voucher.lastUsedBy}
                    <span class="text-xs text-gray-400">Last: {voucher.lastUsedBy}</span>
                  {/if}
                </div>
              </td>
              <td>
                <span class="badge {voucher.isActive ? 'badge-success' : 'badge-danger'}">
                  {voucher.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </td>
              <td>{formatDate(voucher.expiresAt)}</td>
              <td>
                <div class="actions">
                  <button 
                    class="btn btn-sm {voucher.isActive ? 'btn-warning' : 'btn-success'}" 
                    on:click={() => toggleStatus(voucher)}
                    title={voucher.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {#if voucher.isActive}<PowerOff size={14} />{:else}<Power size={14} />{/if}
                  </button>
                  <button class="btn btn-sm btn-danger" on:click={() => deleteVoucher(voucher.id)}>
                    <Trash2 size={14} />
                  </button>
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
        <button on:click={() => changePage(currentPage - 1)} disabled={currentPage === 1} class="btn btn-sm">Prev</button>
        {#each Array(totalPages) as _, i}
          <button on:click={() => changePage(i + 1)} class="btn btn-sm {currentPage === i + 1 ? 'btn-primary' : ''}">{i + 1}</button>
        {/each}
        <button on:click={() => changePage(currentPage + 1)} disabled={currentPage === totalPages} class="btn btn-sm">Next</button>
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <div class="empty-icon">🎟️</div>
      <h3>No vouchers found</h3>
      <p>Create your first discount voucher to get started.</p>
    </div>
  {/if}
</div>

<!-- Create Modal -->
{#if showCreateModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create New Voucher</h2>
        <button class="close-btn" on:click={() => showCreateModal = false}>&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Voucher Code</label>
          <input type="text" bind:value={newVoucher.code} placeholder="e.g. PROMO2024" class="form-input uppercase" />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Discount Type</label>
            <select bind:value={newVoucher.discountType} class="form-input">
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="AMOUNT">Fixed Amount (IDR)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Value</label>
            <input type="number" bind:value={newVoucher.discountValue} class="form-input" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Usage Limit</label>
            <input type="number" bind:value={newVoucher.limitUse} class="form-input" />
          </div>
          <div class="form-group">
            <label>Expires At (Optional)</label>
            <input type="date" bind:value={newVoucher.expiresAt} class="form-input" />
          </div>
        </div>

        <div class="form-group flex items-center gap-2">
          <input type="checkbox" id="isActive" bind:checked={newVoucher.isActive} />
          <label for="isActive">Voucher is Active</label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" on:click={() => showCreateModal = false}>Cancel</button>
        <button class="btn btn-primary" on:click={handleCreateVoucher} disabled={isSubmitting || !newVoucher.code}>
          {isSubmitting ? 'Creating...' : 'Create Voucher'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1.5rem;
  }
  .modal-header h2 { margin: 0; font-size: 1.5rem; }
  .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
  
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
  }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 1rem;
    margin-top: 2rem;
  }
  .uppercase { text-transform: uppercase; }
  .text-success { color: #166534; }
  .text-primary { color: #1e40af; }
  
  /* Additional utilities since we use plain CSS */
  .flex { display: flex; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .gap-2 { gap: 0.5rem; }
  .font-mono { font-family: ui-monospace, monospace; }
  .font-bold { font-weight: 700; }
  .text-lg { font-size: 1.125rem; }
  .text-blue-600 { color: #2563eb; }
  .text-xs { font-size: 0.75rem; }
  .text-gray-400 { color: #9ca3af; }
  .font-bold { font-weight: 700; }
</style>
