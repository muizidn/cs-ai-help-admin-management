<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type {
    Voucher,
    VoucherQuery,
    VoucherStats,
    VoucherCreateInput,
  } from "$lib/types/voucher"
  import {
    Plus,
    Search,
    Filter,
    Trash2,
    Power,
    PowerOff,
    Edit,
  } from "lucide-svelte"
  import "../global-admin.css"

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
  let showEditModal = false
  let editingVoucher: Voucher | null = null
  let editVoucherData: any = {}
  let isSubmitting = false
  
  // Owner Search
  let ownerSearchQuery = ""
  let ownerSearchType = "user" // "user" or "organization"
  let ownerCandidates: Array<{ id: string, name: string, type: string }> = []
  let isSearchingOwner = false

  let newVoucher: VoucherCreateInput = {
    code: "",
    ownerId: "",
    discountType: "PERCENTAGE",
    discountValue: 0,
    maxRedemptionGlobal: 0,
    maxRedemptionPerOwner: 1,
    isActive: true,
    showInSettings: true,
    expiresAt: null,
    targetType: "BOTH",
    applicablePlanType: "BOTH",
  }

  let searchTimeout: any
  async function searchOwners() {
    if (ownerSearchQuery.length < 2) {
      ownerCandidates = []
      return
    }

    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
      isSearchingOwner = true
      try {
        const endpoint = ownerSearchType === "user" ? "/api/users" : "/api/organizations"
        const response = await apiClient.get(`${endpoint}?search=${encodeURIComponent(ownerSearchQuery)}&limit=10`)
        
        if (response.status === 200 && response.data?.status === "success") {
          if (ownerSearchType === "user") {
            ownerCandidates = response.data.data.items.map((u: any) => ({
              id: u.id,
              name: `${u.name} (${u.email})`,
              type: "user"
            }))
          } else {
            ownerCandidates = response.data.data.items.map((o: any) => ({
              id: o.id,
              name: o.name,
              type: "organization"
            }))
          }
        }
      } catch (err) {
        console.error("Error searching owners:", err)
      } finally {
        isSearchingOwner = false
      }
    }, 300)
  }

  function selectOwner(owner: { id: string, name: string }) {
    if (showEditModal) {
      editVoucherData.ownerId = owner.id
    } else {
      newVoucher.ownerId = owner.id
    }
    ownerSearchQuery = owner.name
    ownerCandidates = []
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
      const payload = {
        ...newVoucher,
        ownerId: newVoucher.ownerId || undefined
      }
      const response = await apiClient.post("/api/vouchers", payload)
      if (response.status === 200 && response.data?.status === "success") {
        showCreateModal = false
        // Reset form
        newVoucher = {
          code: "",
          ownerId: "",
          discountType: "PERCENTAGE",
          discountValue: 0,
          maxRedemptionGlobal: 0,
          maxRedemptionPerOwner: 1,
          isActive: true,
          showInSettings: true,
          expiresAt: null,
          targetType: "BOTH",
          applicablePlanType: "BOTH",
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

  function openEditModal(voucher: Voucher) {
    editingVoucher = voucher
    editVoucherData = {
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxRedemptionGlobal: voucher.maxRedemptionGlobal ?? voucher.maxRedemption ?? 0,
      maxRedemptionPerOwner: voucher.maxRedemptionPerOwner ?? 1,
      isActive: voucher.isActive,
      showInSettings: voucher.showInSettings,
      expiresAt: voucher.expiresAt ? new Date(voucher.expiresAt).toISOString().split('T')[0] : null,
      targetType: voucher.targetType || "BOTH",
      applicablePlanType: voucher.applicablePlanType || "BOTH",
      ownerId: voucher.ownerId || ""
    }
    ownerSearchQuery = "" // Reset owner search
    showEditModal = true
  }

  async function handleUpdateVoucher() {
    if (!editingVoucher) return
    isSubmitting = true
    try {
      const payload = {
        ...editVoucherData,
        ownerId: editVoucherData.ownerId || null
      }
      const response = await apiClient.patch(`/api/vouchers/${editingVoucher.id}`, payload)
      if (response.status === 200 && response.data?.status === "success") {
        showEditModal = false
        loadVouchers()
      } else {
        alert(response.data?.message || "Failed to update voucher")
      }
    } catch (err) {
      console.error("Error updating voucher:", err)
      alert("An error occurred")
    } finally {
      isSubmitting = false
    }
  }

  // Toggle Status
  async function toggleStatus(voucher: Voucher) {
    try {
      const response = await apiClient.patch(`/api/vouchers/${voucher.id}`, {
        isActive: !voucher.isActive,
      })
      if (response.status === 200 && response.data?.status === "success") {
        loadVouchers()
      }
    } catch (err) {
      console.error("Error toggling status:", err)
    }
  }
  
  // Toggle Visibility in Settings
  async function toggleVisibility(voucher: Voucher) {
    try {
      const response = await apiClient.patch(`/api/vouchers/${voucher.id}`, {
        showInSettings: !voucher.showInSettings,
      })
      if (response.status === 200 && response.data?.status === "success") {
        loadVouchers()
      }
    } catch (err) {
      console.error("Error toggling visibility:", err)
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
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  function handleSearch() {
    currentPage = 1
    loadVouchers()
  }
  function handleFilterChange() {
    currentPage = 1
    loadVouchers()
  }
  function changePage(page: number) {
    currentPage = page
    loadVouchers()
  }

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
    <button
      class="btn btn-primary flex items-center gap-2"
      on:click={() => (showCreateModal = true)}
    >
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
            <th>Owner ID</th>
            <th>Discount</th>
            <th>Usage</th>
            <th>Settings Page</th>
            <th>Status</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each vouchers as voucher}
            {@const globalLimit = voucher.maxRedemptionGlobal ?? voucher.maxRedemption ?? 0}
            <tr>
              <td>
                <div class="font-mono font-bold text-lg">
                  <a href="/vouchers/{voucher.id}" class="text-blue-600 hover:underline">
                    {voucher.code}
                  </a>
                </div>
                <div class="text-xs text-gray-400">
                  Created: {formatDate(voucher.createdAt)}
                </div>
              </td>
              <td>
                {#if voucher.ownerId}
                  <span class="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded" title={voucher.ownerId}>
                    {voucher.ownerId.substring(0, 8)}...
                  </span>
                {:else}
                  <span class="text-xs text-gray-400">Public</span>
                {/if}
              </td>
              <td>
                <span class="badge badge-primary">
                  {voucher.discountType === "PERCENTAGE"
                    ? `${voucher.discountValue}%`
                    : `IDR ${voucher.discountValue.toLocaleString()}`}
                </span>
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="text-sm font-bold">{voucher.usedCount} / {globalLimit > 0 ? globalLimit : '∞'}</span>
                  <div class="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden shadow-inner">
                    <div class="bg-blue-500 h-full transition-all duration-500" style="width: {globalLimit > 0 ? Math.min(100, (voucher.usedCount / globalLimit) * 100) : 0}%"></div>
                  </div>
                  <div class="text-[9px] text-gray-400 mt-1 italic">
                    Limit: {voucher.maxRedemptionPerOwner > 0 ? `${voucher.maxRedemptionPerOwner} per user` : 'Unlimited per user'}
                  </div>
                </div>
              </td>
              <td class="text-center">
                <button 
                  class="btn btn-sm {voucher.showInSettings ? 'btn-success' : 'btn-ghost'}"
                  on:click={() => toggleVisibility(voucher)}
                  title={voucher.showInSettings ? "Shown in Settings" : "Hidden from Settings"}
                >
                  {voucher.showInSettings ? "VISIBLE" : "HIDDEN"}
                </button>
              </td>
              <td>
                <span
                  class="badge {voucher.isActive
                    ? 'badge-success'
                    : 'badge-danger'}"
                >
                  {voucher.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </td>
              <td>{formatDate(voucher.expiresAt)}</td>
              <td>
                <div class="actions">
                  <button
                    class="btn btn-sm {voucher.isActive
                      ? 'btn-warning'
                      : 'btn-success'}"
                    on:click={() => toggleStatus(voucher)}
                    title={voucher.isActive ? "Deactivate" : "Activate"}
                  >
                    {#if voucher.isActive}<PowerOff size={14} />{:else}<Power
                        size={14}
                      />{/if}
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    on:click={() => openEditModal(voucher)}
                    title="Edit Voucher"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    class="btn btn-sm btn-danger"
                    on:click={() => deleteVoucher(voucher.id)}
                  >
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
        <button
          on:click={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          class="btn btn-sm">Prev</button
        >
        {#each Array(totalPages) as _, i}
          <button
            on:click={() => changePage(i + 1)}
            class="btn btn-sm {currentPage === i + 1 ? 'btn-primary' : ''}"
            >{i + 1}</button
          >
        {/each}
        <button
          on:click={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          class="btn btn-sm">Next</button
        >
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
        <button class="close-btn" on:click={() => (showCreateModal = false)}
          >&times;</button
        >
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="voucherCode">Voucher Code</label>
          <input
            id="voucherCode"
            type="text"
            bind:value={newVoucher.code}
            placeholder="e.g. PROMO2024"
            class="form-input uppercase"
          />
        </div>

        <div class="form-group relative">
          <label for="ownerSearch">Target Owner (User or Organization)</label>
          <div class="owner-search-container">
            <select 
              bind:value={ownerSearchType} 
              class="search-type-select"
              on:change={() => { ownerSearchQuery = ""; ownerCandidates = []; newVoucher.ownerId = ""; }}
            >
              <option value="user">User</option>
              <option value="organization">Organization</option>
            </select>
            <input
              id="ownerSearch"
              type="text"
              bind:value={ownerSearchQuery}
              on:input={searchOwners}
              placeholder={ownerSearchType === "user" ? "Search user name or email..." : "Search organization name..."}
              class="form-input"
              autocomplete="off"
            />
          </div>
          
          {#if isSearchingOwner}
            <div class="search-results-dropdown flex items-center justify-center p-4">
              <div class="loading-spinner-sm mr-2"></div>
              <span class="text-sm text-gray-500">Searching...</span>
            </div>
          {:else if ownerCandidates.length > 0}
            <div class="search-results-dropdown">
              {#each ownerCandidates as owner}
                <button 
                  type="button"
                  class="search-result-item" 
                  on:click={() => selectOwner(owner)}
                >
                  <span class="result-name">{owner.name}</span>
                  <span class="result-id text-xs text-gray-500 font-mono">{owner.id}</span>
                </button>
              {/each}
            </div>
          {:else if ownerSearchQuery.length >= 2 && !isSearchingOwner}
             <!-- Optional: No results state -->
          {/if}

          {#if newVoucher.ownerId}
            <div class="selected-owner-badge mt-2">
              <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-2">
                Selected: {newVoucher.ownerId}
                <button on:click={() => { newVoucher.ownerId = ""; ownerSearchQuery = ""; }} class="text-blue-900 font-bold">&times;</button>
              </span>
            </div>
          {/if}
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="discountType">Discount Type</label>
            <select id="discountType" bind:value={newVoucher.discountType} class="form-input">
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="AMOUNT">Fixed Amount (IDR)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="discountValue">Value</label>
            <input
              id="discountValue"
              type="number"
              bind:value={newVoucher.discountValue}
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="maxRedemptionGlobal">Total Availability (Global Stock)</label>
            <input
              id="maxRedemptionGlobal"
              type="number"
              bind:value={newVoucher.maxRedemptionGlobal}
              class="form-input"
              placeholder="0 = Unlimited"
            />
          </div>
          <div class="form-group">
            <label for="maxRedemptionPerOwner">Max Limits Per Owner</label>
            <input
              id="maxRedemptionPerOwner"
              type="number"
              bind:value={newVoucher.maxRedemptionPerOwner}
              class="form-input"
              placeholder="0 = Unlimited"
            />
          </div>
        </div>

        <div class="form-group mt-4">
          <label for="expiresAt">Expires At (Optional)</label>
          <input
            id="expiresAt"
            type="date"
            bind:value={newVoucher.expiresAt}
            class="form-input"
          />
        </div>

        <div class="form-row mt-4">
          <div class="form-group flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              bind:checked={newVoucher.isActive}
            />
            <label for="isActive">Active</label>
          </div>
          <div class="form-group flex items-center gap-2">
            <input
              type="checkbox"
              id="showInSettings"
              bind:checked={newVoucher.showInSettings}
            />
            <label for="showInSettings">Show in Settings Page</label>
          </div>
        </div>

        <div class="form-row mt-4">
          <div class="form-group">
            <label for="targetType">Target Account Level</label>
            <select id="targetType" bind:value={newVoucher.targetType} class="form-input">
              <option value="BOTH">Personal & Organization (Both)</option>
              <option value="PERSONAL">Personal Only</option>
              <option value="ORGANIZATION">Organization Only</option>
            </select>
          </div>
          <div class="form-group">
            <label for="applicablePlanType">Applicable Plan Type</label>
            <select id="applicablePlanType" bind:value={newVoucher.applicablePlanType} class="form-input">
              <option value="BOTH">All Plan Types (Both)</option>
              <option value="SUBSCRIPTION">Subscriptions Only</option>
              <option value="CREDIT">Credits Only</option>
            </select>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-1 italic">
           * Restrictions ensure vouchers are used where intended (e.g., promo for credits only).
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn" on:click={() => (showCreateModal = false)}
          >Cancel</button
        >
        <button
          class="btn btn-primary"
          on:click={handleCreateVoucher}
          disabled={isSubmitting || !newVoucher.code}
        >
          {isSubmitting ? "Creating..." : "Create Voucher"}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Modal -->
{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Voucher: {editingVoucher?.code}</h2>
        <button class="close-btn" on:click={() => (showEditModal = false)}
          >&times;</button
        >
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="editVoucherCode">Voucher Code</label>
          <input
            id="editVoucherCode"
            type="text"
            bind:value={editVoucherData.code}
            class="form-input uppercase"
          />
        </div>

        <div class="form-group relative">
          <label for="editOwnerSearch">Target Owner (User or Organization)</label>
          <div class="owner-search-container">
            <select 
              bind:value={ownerSearchType} 
              class="search-type-select"
              on:change={() => { ownerSearchQuery = ""; ownerCandidates = []; editVoucherData.ownerId = ""; }}
            >
              <option value="user">User</option>
              <option value="organization">Organization</option>
            </select>
            <input
              id="editOwnerSearch"
              type="text"
              bind:value={ownerSearchQuery}
              on:input={searchOwners}
              placeholder={ownerSearchType === "user" ? "Search user name or email..." : "Search organization name..."}
              class="form-input"
              autocomplete="off"
            />
          </div>
          
          {#if isSearchingOwner}
            <div class="search-results-dropdown flex items-center justify-center p-4">
              <div class="loading-spinner-sm mr-2"></div>
              <span class="text-sm text-gray-500">Searching...</span>
            </div>
          {:else if ownerCandidates.length > 0}
            <div class="search-results-dropdown">
              {#each ownerCandidates as owner}
                <button 
                  type="button" 
                  class="search-result-item" 
                  on:click={() => selectOwner(owner)}
                >
                  <span class="result-name">{owner.name}</span>
                  <span class="result-id text-xs text-gray-500 font-mono">{owner.id}</span>
                </button>
              {/each}
            </div>
          {/if}

          {#if editVoucherData.ownerId}
            <div class="selected-owner-badge mt-2">
              <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-2">
                Selected: {editVoucherData.ownerId}
                <button on:click={() => { editVoucherData.ownerId = ""; ownerSearchQuery = ""; }} class="text-blue-900 font-bold">&times;</button>
              </span>
            </div>
          {/if}
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="editDiscountType">Discount Type</label>
            <select id="editDiscountType" bind:value={editVoucherData.discountType} class="form-input">
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="AMOUNT">Fixed Amount (IDR)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editDiscountValue">Value</label>
            <input
              id="editDiscountValue"
              type="number"
              bind:value={editVoucherData.discountValue}
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="editMaxRedemptionGlobal">Total Availability (Global Stock)</label>
            <input
              id="editMaxRedemptionGlobal"
              type="number"
              bind:value={editVoucherData.maxRedemptionGlobal}
              class="form-input"
              placeholder="0 = Unlimited"
            />
          </div>
          <div class="form-group">
            <label for="editMaxRedemptionPerOwner">Max Limits Per Owner</label>
            <input
              id="editMaxRedemptionPerOwner"
              type="number"
              bind:value={editVoucherData.maxRedemptionPerOwner}
              class="form-input"
              placeholder="0 = Unlimited"
            />
          </div>
        </div>

        <div class="form-group mt-4">
          <label for="editExpiresAt">Expires At (Optional)</label>
          <input
            id="editExpiresAt"
            type="date"
            bind:value={editVoucherData.expiresAt}
            class="form-input"
          />
        </div>

        <div class="form-row mt-4">
          <div class="form-group">
            <label for="editTargetType">Target Account Level</label>
            <select id="editTargetType" bind:value={editVoucherData.targetType} class="form-input">
              <option value="BOTH">Personal & Organization (Both)</option>
              <option value="PERSONAL">Personal Only</option>
              <option value="ORGANIZATION">Organization Only</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editApplicablePlanType">Applicable Plan Type</label>
            <select id="editApplicablePlanType" bind:value={editVoucherData.applicablePlanType} class="form-input">
              <option value="BOTH">All Plan Types (Both)</option>
              <option value="SUBSCRIPTION">Subscriptions Only</option>
              <option value="CREDIT">Credits Only</option>
            </select>
          </div>
        </div>

        <div class="form-row mt-4">
          <div class="form-group flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsActive"
              bind:checked={editVoucherData.isActive}
            />
            <label for="editIsActive">Active</label>
          </div>
          <div class="form-group flex items-center gap-2">
            <input
              type="checkbox"
              id="editShowInSettings"
              bind:checked={editVoucherData.showInSettings}
            />
            <label for="editShowInSettings">Show in Settings Page</label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" on:click={() => (showEditModal = false)}
          >Cancel</button
        >
        <button
          class="btn btn-primary"
          on:click={handleUpdateVoucher}
          disabled={isSubmitting || !editVoucherData.code}
        >
          {isSubmitting ? "Updating..." : "Update Voucher"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
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
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
  }

  .form-group {
    margin-bottom: 1rem;
  }
  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  .uppercase {
    text-transform: uppercase;
  }
  .text-success {
    color: #166534;
  }
  .text-primary {
    color: #1e40af;
  }

  /* Additional utilities since we use plain CSS */
  .flex {
    display: flex;
  }
  .items-center {
    align-items: center;
  }
  .justify-between {
    justify-content: space-between;
  }
  .gap-2 {
    gap: 0.5rem;
  }
  .font-mono {
    font-family: ui-monospace, monospace;
  }
  .font-bold {
    font-weight: 700;
  }
  .text-lg {
    font-size: 1.125rem;
  }
  .text-blue-600 {
    color: #2563eb;
  }
  .text-xs {
    font-size: 0.75rem;
  }
  .text-gray-400 {
    color: #9ca3af;
  }
  .font-bold {
    font-weight: 700;
  }
  .relative {
    position: relative;
  }
  
  .owner-search-container {
    display: flex;
    gap: 8px;
  }
  
  .search-type-select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #f9f9f9;
    font-size: 0.9rem;
  }
  
  .search-results-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 100;
    max-height: 200px;
    overflow-y: auto;
    margin-top: 4px;
  }
  
  .search-result-item {
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .search-result-item:hover {
    background: #f5f8ff;
  }
  
  .search-result-item:last-child {
    border-bottom: none;
  }
  
  .result-name {
    font-weight: 500;
    color: #333;
  }
  
  .selected-owner-badge {
    display: flex;
  }

  .loading-spinner-sm {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
</style>
