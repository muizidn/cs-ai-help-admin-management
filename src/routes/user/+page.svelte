<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type { UserWithBilling } from "$lib/types/transactions"
  import {
    Users,
    UserCheck,
    UserMinus,
    Activity,
    Clock,
    Search,
    Filter,
    MoreVertical,
    Edit,
    ShieldAlert,
  } from "lucide-svelte"

  let users: UserWithBilling[] = []
  let stats: any = null
  let loading = false
  let error = ""
  let currentPage = 1
  let totalPages = 1
  let totalUsers = 0

  // Filters
  let searchQuery = ""
  let statusFilter = ""
  let sortBy = "createdAt"
  let sortOrder = "desc"

  async function loadUsers() {
    loading = true
    error = ""

    try {
      const query = {
        search: searchQuery || undefined,
        page: currentPage,
        limit: 20,
        isActive: statusFilter ? statusFilter === "true" : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      }

      const queryString = apiClient.buildQueryString(query)
      const response = await apiClient.get(`/api/users${queryString}`)

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
      console.error(err)
    } finally {
      loading = false
    }
  }

  function formatDate(date: string | Date | undefined): string {
    if (!date) return "-"
    const d = new Date(date)
    return d.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function getRelativeTime(date: string | Date | undefined): string {
    if (!date) return "Never"
    const now = new Date()
    const d = new Date(date)
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "Just now"
  }

  function handleSearch() {
    currentPage = 1
    loadUsers()
  }

  // Edit Modal State
  let showEditModal = false
  let selectedUser: UserWithBilling | null = null
  let editName = ""
  let editIsActive = true
  let isUpdating = false
  let updateError = ""
  let updateSuccess = ""

  function openEditModal(user: UserWithBilling) {
    selectedUser = user
    editName = user.name
    editIsActive = user.isActive
    showEditModal = true
    updateError = ""
    updateSuccess = ""
  }

  async function handleUpdateUser() {
    if (!selectedUser) return

    isUpdating = true
    updateError = ""
    updateSuccess = ""

    try {
      const response = await apiClient.put(`/api/users/${selectedUser.id}`, {
        name: editName,
        isActive: editIsActive,
      })

      if (response.status === 200 && response.data?.status === "success") {
        updateSuccess = "User updated successfully"
        setTimeout(() => {
          showEditModal = false
          loadUsers()
        }, 1500)
      } else {
        updateError = response.data?.message || "Failed to update user"
      }
    } catch (err) {
      updateError = "An error occurred while updating"
      console.error(err)
    } finally {
      isUpdating = false
    }
  }

  onMount(() => {
    loadUsers()
  })
</script>

<svelte:head>
  <title>User Management - CS AI Admin</title>
</svelte:head>

<div class="user-management-page">
  <header class="page-header">
    <div class="header-content">
      <h1>User Management</h1>
      <p>Manage user accounts, roles, and monitor system activity</p>
    </div>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon total"><Users size={24} /></div>
        <div class="stat-info">
          <span class="stat-value">{totalUsers}</span>
          <span class="stat-label">Total Users</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active"><UserCheck size={24} /></div>
        <div class="stat-info">
          <span class="stat-value">{stats?.activeUsers || 0}</span>
          <span class="stat-label">Active Now</span>
        </div>
      </div>
    </div>
  </header>

  <div class="actions-bar">
    <div class="search-box">
      <Search size={18} />
      <input
        type="text"
        placeholder="Search by name, email, or ID..."
        bind:value={searchQuery}
        on:keydown={(e) => e.key === "Enter" && handleSearch()}
      />
    </div>

    <div class="filter-row">
      <select bind:value={statusFilter} on:change={handleSearch}>
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>

      <select bind:value={sortBy} on:change={handleSearch}>
        <option value="createdAt">Joined Date</option>
        <option value="name">Name</option>
        <option value="email">Email</option>
      </select>

      <button class="btn-refresh" on:click={loadUsers}>
        <Activity size={18} />
        Refresh
      </button>
    </div>
  </div>

  {#if loading}
    <div class="loading-area">
      <div class="loader"></div>
      <p>Loading user directory...</p>
    </div>
  {:else if error}
    <div class="error-area">
      <ShieldAlert size={48} />
      <h3>Connection Error</h3>
      <p>{error}</p>
      <button class="btn-primary" on:click={loadUsers}>Retry</button>
    </div>
  {:else}
    <div class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Status</th>
            <th>Joined Date</th>
            <th>Last Activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user}
            <tr>
              <td>
                <div class="user-cell">
                  <div class="avatar-mini">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div class="user-details">
                    <span class="user-name">{user.name}</span>
                    <span class="user-email">{user.email}</span>
                  </div>
                </div>
              </td>
              <td>
                <span
                  class="status-badge {user.isActive ? 'active' : 'inactive'}"
                >
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td>
                <div class="date-cell">
                  <Clock size={14} />
                  <span>{formatDate(user.createdAt)}</span>
                </div>
              </td>
              <td>
                <div class="activity-cell">
                  <Activity size={14} />
                  <span class="activity-time"
                    >{getRelativeTime(user.updatedAt)}</span
                  >
                </div>
              </td>
              <td>
                <div class="table-actions">
                  <button
                    class="btn-icon"
                    title="Edit User"
                    on:click={() => openEditModal(user)}
                  >
                    <Edit size={18} />
                  </button>
                  <button class="btn-icon" title="More Options">
                    <MoreVertical size={18} />
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
          class="btn-nav"
          disabled={currentPage === 1}
          on:click={() => {
            currentPage--
            loadUsers()
          }}
        >
          Previous
        </button>
        <div class="page-numbers">
          {#each Array(Math.min(5, totalPages)) as _, i}
            <button
              class="page-num"
              class:active={currentPage === i + 1}
              on:click={() => {
                currentPage = i + 1
                loadUsers()
              }}
            >
              {i + 1}
            </button>
          {/each}
          {#if totalPages > 5}
            <span>...</span>
            <button
              class="page-num"
              class:active={currentPage === totalPages}
              on:click={() => {
                currentPage = totalPages
                loadUsers()
              }}
            >
              {totalPages}
            </button>
          {/if}
        </div>
        <button
          class="btn-nav"
          disabled={currentPage === totalPages}
          on:click={() => {
            currentPage++
            loadUsers()
          }}
        >
          Next
        </button>
      </div>
    {/if}
  {/if}

  {#if showEditModal && selectedUser}
    <div
      class="modal-overlay"
      on:click|self={() => (showEditModal = false)}
      on:keydown={(e) => e.key === "Escape" && (showEditModal = false)}
      role="none"
    >
      <div class="modal-container" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="header-main">
            <h2>Edit User Profile</h2>
            <p>Modify basic information for {selectedUser.name}</p>
          </div>
          <button class="close-btn" on:click={() => (showEditModal = false)}
            >×</button
          >
        </div>

        {#if updateError}
          <div class="alert alert-error">{updateError}</div>
        {/if}
        {#if updateSuccess}
          <div class="alert alert-success">{updateSuccess}</div>
        {/if}

        <div class="modal-body">
          <div class="user-preview-box">
            <div class="avatar-large">
              {editName.charAt(0).toUpperCase()}
            </div>
            <div class="preview-info">
              <h3>{editName || "New User"}</h3>
              <p>{selectedUser.email}</p>
            </div>
          </div>

          <div class="form-section">
            <div class="input-group">
              <label for="user-name">Full Name</label>
              <input
                id="user-name"
                type="text"
                bind:value={editName}
                placeholder="Enter user's name"
              />
            </div>

            <div class="input-group">
              <span class="label-text">Account Status</span>
              <div class="status-toggle-container">
                <span class="status-text" class:inactive={!editIsActive}>
                  {editIsActive
                    ? "Account is Active"
                    : "Account is Deactivated"}
                </span>
                <label class="switch">
                  <input type="checkbox" bind:checked={editIsActive} />
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="billing-link-box">
            <div class="box-icon"><Activity size={18} /></div>
            <div class="box-content">
              <h4>Advanced Billing Settings</h4>
              <p>
                To edit credits, top-up balance, or subscription plans, please
                use the billing manager.
              </p>
              <a href="/billing?search={selectedUser.email}" class="link-btn"
                >Go to Billing</a
              >
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" on:click={() => (showEditModal = false)}
            >Cancel</button
          >
          <button
            class="btn-primary"
            on:click={handleUpdateUser}
            disabled={isUpdating}
          >
            {isUpdating ? "Saving Changes..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .user-management-page {
    padding: 2.5rem;
    max-width: 1400px;
    margin: 0 auto;
    background: #f8fafc;
    min-height: 100vh;
    font-family: "Inter", system-ui, sans-serif;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2.5rem;
  }

  .header-content h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 0.5rem;
    letter-spacing: -0.03em;
  }

  .header-content p {
    color: #64748b;
    font-size: 1.125rem;
  }

  .stats-cards {
    display: flex;
    gap: 1.25rem;
  }

  .stat-card {
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
  }

  .stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-icon.total {
    background: #eff6ff;
    color: #2563eb;
  }
  .stat-icon.active {
    background: #f0fdf4;
    color: #16a34a;
  }

  .stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .actions-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1.5rem;
  }

  .search-box {
    flex: 1;
    background: white;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .search-box input {
    border: none;
    outline: none;
    width: 100%;
    font-size: 0.9375rem;
    color: #0f172a;
  }

  .filter-row {
    display: flex;
    gap: 0.75rem;
  }

  .filter-row select {
    padding: 0.625rem 1rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: white;
    font-weight: 500;
    font-size: 0.875rem;
    color: #334155;
    outline: none;
    cursor: pointer;
  }

  .btn-refresh {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.875rem;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-refresh:hover {
    background: #f8fafc;
  }

  .table-container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
    overflow: hidden;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .users-table th {
    padding: 1rem 1.5rem;
    background: #f8fafc;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #f1f5f9;
  }

  .users-table td {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .avatar-mini {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
  }

  .user-details {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .user-email {
    font-size: 0.8125rem;
    color: #64748b;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status-badge.active {
    background: #dcfce7;
    color: #166534;
  }
  .status-badge.inactive {
    background: #f1f5f9;
    color: #475569;
  }

  .date-cell,
  .activity-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #475569;
  }

  .activity-time {
    color: #2563eb;
    font-weight: 600;
  }

  .table-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    background: #f1f5f9;
    color: #0f172a;
    border-color: #cbd5e1;
  }

  .pagination {
    margin-top: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
  }

  .page-numbers {
    display: flex;
    gap: 0.5rem;
  }

  .page-num {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    font-weight: 600;
    font-size: 0.875rem;
    color: #334155;
    cursor: pointer;
  }

  .page-num.active {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .btn-nav {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    font-weight: 600;
    font-size: 0.875rem;
    color: #334155;
    cursor: pointer;
  }

  .btn-nav:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loader {
    width: 40px;
    height: 40px;
    border: 4px solid #f1f5f9;
    border-top-color: #2563eb;
    border-radius: 50%;
    margin: 0 auto 1.5rem;
    animation: rotation 1s linear infinite;
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-area,
  .error-area {
    background: white;
    padding: 4rem;
    border-radius: 16px;
    text-align: center;
    border: 1px solid #f1f5f9;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-container {
    background: white;
    width: 100%;
    max-width: 550px;
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    animation: modalScale 0.3s ease-out;
  }

  @keyframes modalScale {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .modal-header {
    padding: 1.5rem 2rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .header-main h2 {
    font-size: 1.25rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }

  .header-main p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0.25rem 0 0 0;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.75rem;
    color: #94a3b8;
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }

  .modal-body {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .user-preview-box {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.25rem;
    background: #f1f5f9;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
  }

  .avatar-large {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.5rem;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }

  .preview-info h3 {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0;
    color: #0f172a;
  }

  .preview-info p {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-group label {
    font-size: 0.875rem;
    font-weight: 700;
    color: #334155;
  }

  .input-group input {
    padding: 0.75rem 1rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    font-size: 1rem;
    color: #0f172a;
    transition: all 0.2s;
  }

  .input-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  /* Status Toggle */
  .status-toggle-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .status-text {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #059669;
  }

  .status-text.inactive {
    color: #dc2626;
  }

  /* Switch Component */
  .switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    transition: 0.4s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
  }

  input:checked + .slider {
    background-color: #2563eb;
  }

  input:checked + .slider:before {
    transform: translateX(24px);
  }

  .slider.round {
    border-radius: 34px;
  }

  .slider.round:before {
    border-radius: 50%;
  }

  .billing-link-box {
    display: flex;
    gap: 1rem;
    padding: 1.25rem;
    background: #f0f9ff;
    border-radius: 16px;
    border: 1px solid #bae6fd;
  }

  .box-icon {
    width: 36px;
    height: 36px;
    background: white;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0284c7;
    flex-shrink: 0;
    border: 1px solid #e0f2fe;
  }

  .box-content h4 {
    font-size: 0.875rem;
    font-weight: 700;
    margin: 0;
    color: #0369a1;
  }

  .box-content p {
    font-size: 0.8125rem;
    color: #075985;
    margin: 0.25rem 0 0.75rem 0;
    line-height: 1.4;
  }

  .link-btn {
    display: inline-block;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #2563eb;
    text-decoration: none;
    padding: 0.5rem 1rem;
    background: white;
    border-radius: 8px;
    border: 1px solid #bae6fd;
    transition: all 0.2s;
  }

  .link-btn:hover {
    background: #f8fafc;
    transform: translateY(-1px);
  }

  .modal-footer {
    padding: 1.5rem 2rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  .alert {
    margin: 1.5rem 2rem 0;
    padding: 1rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .alert-error {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fee2e2;
  }

  .alert-success {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #dcfce7;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }

  .btn-secondary {
    background: white;
    color: #334155;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 700;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #f8fafc;
  }

  .modal-overlay[role="none"] {
    cursor: default;
  }
</style>
