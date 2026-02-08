<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type { OrganizationWithStats } from "$lib/types/organization"
  import { Search, Building, Users, Calendar, ArrowUp, ArrowDown, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-svelte"
  import "../user-billing/user-billing.css"

  // State
  let organizations: OrganizationWithStats[] = []
  let loading = true
  let error = ""
  
  // Pagination & Filters
  let search = ""
  let currentPage = 1
  let totalPages = 1
  let totalItems = 0
  let limit = 20
  let sortBy = "createdAt"
  let sortOrder: "asc" | "desc" = "desc"

  async function loadOrganizations() {
    loading = true
    error = ""
    try {
      const params = new URLSearchParams({
        search,
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      })
      
      const response = await apiClient.get(`/api/organizations?${params.toString()}`)
      
      if (response.status === 200 && response.data?.status === "success") {
        organizations = response.data.data.items
        const pagination = response.data.data.pagination
        totalPages = pagination.totalPages
        totalItems = pagination.total
      } else {
        error = response.data?.message || "Failed to load organizations"
      }
    } catch (err) {
      error = "An error occurred while loading organizations"
      console.error(err)
    } finally {
      loading = false
    }
  }

  function handleSearch() {
    currentPage = 1
    loadOrganizations()
  }

  function handleSort(field: string) {
    if (sortBy === field) {
      sortOrder = sortOrder === "asc" ? "desc" : "asc"
    } else {
      sortBy = field
      sortOrder = "desc"
    }
    loadOrganizations()
  }

  function handlePageChange(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page
      loadOrganizations()
    }
  }

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  onMount(loadOrganizations)
</script>

<svelte:head>
  <title>Organizations - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  <div class="page-header">
    <h1>Organizations</h1>
    <p>Manage all organizations and view member statistics</p>
  </div>

  <div class="filters-section">
    <div class="search-box">
      <div class="relative flex-1">
        <input
          type="text"
          bind:value={search}
          placeholder="Search organizations by name or ID..."
          on:keydown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <button class="search-btn flex items-center gap-2" on:click={handleSearch}>
        <Search size={18} />
        Search
      </button>
      <button class="clear-btn" on:click={() => { search = ""; handleSearch(); }}>Clear</button>
    </div>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading organizations...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <div class="flex items-center gap-2 text-danger mb-4 justify-center">
        <AlertCircle size={24} />
        <span>{error}</span>
      </div>
      <button on:click={loadOrganizations} class="retry-btn">Retry</button>
    </div>
  {:else if organizations.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🏢</div>
      <h3>No organizations found</h3>
      <p>Try adjusting your search filters.</p>
    </div>
  {:else}
    <div class="table-container">
      <table class="transactions-table">
        <thead>
          <tr>
            <th on:click={() => handleSort("name")} class="cursor-pointer">
              <div class="flex items-center gap-2">
                Organization Name
                {#if sortBy === "name"}
                  {#if sortOrder === "asc"}
                    <ArrowUp size={14} />
                  {:else}
                    <ArrowDown size={14} />
                  {/if}
                {/if}
              </div>
            </th>
            <th>ID</th>
            <th on:click={() => handleSort("memberCount")} class="cursor-pointer">
              <div class="flex items-center gap-2">
                Active Members
                {#if sortBy === "memberCount"}
                  {#if sortOrder === "asc"}
                    <ArrowUp size={14} />
                  {:else}
                    <ArrowDown size={14} />
                  {/if}
                {/if}
              </div>
            </th>
            <th>Status</th>
            <th on:click={() => handleSort("createdAt")} class="cursor-pointer">
              <div class="flex items-center gap-2">
                Created Date
                {#if sortBy === "createdAt"}
                  {#if sortOrder === "asc"}
                    <ArrowUp size={14} />
                  {:else}
                    <ArrowDown size={14} />
                  {/if}
                {/if}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each organizations as org}
            <tr>
              <td>
                <div class="org-name-cell">
                  <div class="p-2 bg-blue-50 rounded-lg">
                    <Building size={20} class="text-blue-600" />
                  </div>
                  <span class="font-bold text-gray-900 text-base">{org.name}</span>
                </div>
              </td>
              <td>
                <span class="transaction-code">{org.id}</span>
              </td>
              <td>
                <div class="member-count-cell">
                  <Users size={14} />
                  <span>{org.memberCount}</span>
                </div>
              </td>
              <td>
                <span class="badge {org.isActive ? 'badge-success' : 'badge-secondary'}">
                  {org.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-1 text-gray-500 text-sm">
                  <Calendar size={14} />
                  <span class="font-medium">{formatDate(org.createdAt)}</span>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pagination flex items-center justify-between">
        <div class="text-sm text-gray-500">
          Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalItems)} of {totalItems} organizations
        </div>
        <div class="flex gap-2">
          <button
            class="btn btn-sm"
            disabled={currentPage === 1}
            on:click={() => handlePageChange(currentPage - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          
          {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            if (totalPages <= 5) return i + 1;
            if (currentPage <= 3) return i + 1;
            if (currentPage >= totalPages - 2) return totalPages - 4 + i;
            return currentPage - 2 + i;
          }) as page}
            <button
              class="btn btn-sm {currentPage === page ? 'btn-primary' : ''}"
              on:click={() => handlePageChange(page)}
            >
              {page}
            </button>
          {/each}

          <button
            class="btn btn-sm"
            disabled={currentPage === totalPages}
            on:click={() => handlePageChange(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Premium Styles for Organization List */
  :global(.page-container) {
    background-color: #f8fafc;
    min-height: calc(100vh - 40px);
    font-family: 'Inter', sans-serif;
  }

  .cursor-pointer { cursor: pointer; }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-size: 2.75rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin-bottom: 0.5rem;
  }

  .page-header p {
    color: #64748b;
    font-size: 1.1rem;
    max-width: 600px;
  }

  .filters-section {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.05),
      0 2px 4px -1px rgba(0, 0, 0, 0.03),
      inset 0 0 0 1px rgba(255, 255, 255, 0.5);
  }

  .search-box {
    display: flex;
    gap: 1rem;
    align-items: center;
    width: 100%;
  }

  .search-box .relative {
    flex-grow: 1;
  }

  .search-box input {
    width: 100%;
    padding: 0.875rem 1.25rem;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    background: white;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .search-box input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .search-btn, .clear-btn {
    padding: 0.875rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    transition: all 0.2s;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .search-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
  }

  .search-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 8px -1px rgba(37, 99, 235, 0.3);
  }

  .search-btn:active {
    transform: translateY(0);
  }

  .clear-btn {
    background: white;
    border: 1px solid #e2e8f0;
    color: #64748b;
  }

  .clear-btn:hover {
    background: #f8fafc;
    color: #475569;
    border-color: #cbd5e1;
  }

  .table-container {
    background: white;
    border-radius: 16px;
    box-shadow: 
      0 20px 25px -5px rgba(0, 0, 0, 0.05),
      0 10px 10px -5px rgba(0, 0, 0, 0.02);
    border: 1px solid #f1f5f9;
    overflow: hidden;
  }

  .transactions-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  .transactions-table th {
    background: #f8fafc;
    padding: 1rem 1.5rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  .transactions-table td {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .transactions-table tr:last-child td {
    border-bottom: none;
  }

  .transactions-table tr {
    transition: all 0.2s ease;
  }

  .transactions-table tr:hover {
    background-color: #f8fafc;
  }

  .org-name-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .transaction-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .member-count-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    color: #1e40af;
    background: #dbeafe;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    width: fit-content;
    font-size: 0.9rem;
  }

  .badge {
    padding: 0.35rem 0.8rem;
    font-weight: 700;
    border-radius: 8px;
    font-size: 0.8rem;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .badge::before {
    content: '';
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.6;
  }

  .badge-success {
    background: #dcfce7;
    color: #166534;
  }

  .badge-secondary {
    background: #f1f5f9;
    color: #475569;
  }

  .pagination {
    margin-top: 2rem;
    padding: 1rem;
    background: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .btn-sm {
    width: 36px;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
    transition: all 0.2s;
  }

  .btn-sm:hover:not(:disabled) {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #eff6ff;
  }

  .btn-sm.btn-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .btn-sm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f8fafc;
  }
</style>
