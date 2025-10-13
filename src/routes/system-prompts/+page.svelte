<script lang="ts">
  import { onMount } from "svelte"
  import { api } from "../../lib/api"
  import SystemPromptsList from "../../lib/components/SystemPromptsList.svelte"
  import SystemPromptsForm from "../../lib/components/SystemPromptsForm.svelte"
  import SystemPromptsStats from "../../lib/components/SystemPromptsStats.svelte"
  import SystemPromptsFilters from "../../lib/components/SystemPromptsFilters.svelte"
  import type {
    SystemPrompt,
    SystemPromptFilter,
    SystemPromptStats as StatsType,
    SystemPromptCreateInput,
    SystemPromptUpdateInput,
  } from "../../lib/types/system-prompts"
  import { Plus, Settings, Search } from "lucide-svelte"

  let systemPrompts: SystemPrompt[] = []
  let stats: StatsType | null = null
  let loading = true
  let error: string | null = null
  let showForm = false
  let editingPrompt: SystemPrompt | null = null
  let selectedPrompts: string[] = []
  let searchQuery = ""
  let showFilters = false

  let filter: SystemPromptFilter = {
    limit: 20,
    offset: 0,
    sortBy: "updatedAt",
    sortOrder: "desc",
  }

  let pagination = {
    total: 0,
    hasMore: false,
  }

  async function loadSystemPrompts(): Promise<void> {
    try {
      loading = true
      error = null

      const response = await api.getSystemPrompts(filter)

      if (response.status === "success") {
        systemPrompts = response.data?.items || []
        pagination.total = response.data?.total || 0
        pagination.hasMore = response.data?.hasMore || false
      } else {
        error = response.message || "Failed to load system prompts"
      }
    } catch (err) {
      console.error("Error loading system prompts:", err)
      error =
        err instanceof Error ? err.message : "Failed to load system prompts"
    } finally {
      loading = false
    }
  }

  async function loadStats(): Promise<void> {
    try {
      const response = await api.getSystemPromptsStats()
      if (response.status === "success" && response.data) {
        stats = response.data
      }
    } catch (err) {
      console.error("Error loading stats:", err)
    }
  }

  async function handleCreate(
    event: CustomEvent<SystemPromptCreateInput>,
  ): Promise<void> {
    try {
      const response = await api.createSystemPrompt(event.detail)

      if (response.status === "success") {
        showForm = false
        await loadSystemPrompts()
        await loadStats()
      } else {
        error = response.message || "Failed to create system prompt"
      }
    } catch (err) {
      console.error("Error creating system prompt:", err)
      error =
        err instanceof Error ? err.message : "Failed to create system prompt"
    }
  }

  async function handleUpdate(
    event: CustomEvent<{ id: string; data: SystemPromptUpdateInput }>,
  ): Promise<void> {
    try {
      const { id, data } = event.detail
      const response = await api.updateSystemPrompt(id, data)

      if (response.status === "success") {
        showForm = false
        editingPrompt = null
        await loadSystemPrompts()
        await loadStats()
      } else {
        error = response.message || "Failed to update system prompt"
      }
    } catch (err) {
      console.error("Error updating system prompt:", err)
      error =
        err instanceof Error ? err.message : "Failed to update system prompt"
    }
  }

  async function handleDelete(
    event: CustomEvent<{ id: string }>,
  ): Promise<void> {
    try {
      const { id } = event.detail
      const response = await api.deleteSystemPrompt(id)

      if (response.status === "success") {
        await loadSystemPrompts()
        await loadStats()
        selectedPrompts = selectedPrompts.filter(
          (selectedId) => selectedId !== id,
        )
      } else {
        error = response.message || "Failed to delete system prompt"
      }
    } catch (err) {
      console.error("Error deleting system prompt:", err)
      error =
        err instanceof Error ? err.message : "Failed to delete system prompt"
    }
  }

  async function handleDuplicate(
    event: CustomEvent<{ id: string; newTitle?: string }>,
  ): Promise<void> {
    try {
      const { id, newTitle } = event.detail
      const response = await api.duplicateSystemPrompt(id, newTitle)

      if (response.status === "success") {
        await loadSystemPrompts()
        await loadStats()
      } else {
        error = response.message || "Failed to duplicate system prompt"
      }
    } catch (err) {
      console.error("Error duplicating system prompt:", err)
      error =
        err instanceof Error ? err.message : "Failed to duplicate system prompt"
    }
  }

  async function handleBulkToggle(isActive: boolean): Promise<void> {
    if (selectedPrompts.length === 0) return

    try {
      const response = await api.bulkToggleSystemPrompts(
        selectedPrompts,
        isActive,
      )

      if (response.status === "success") {
        await loadSystemPrompts()
        await loadStats()
        selectedPrompts = []
      } else {
        error = response.message || "Failed to update system prompts"
      }
    } catch (err) {
      console.error("Error bulk toggling system prompts:", err)
      error =
        err instanceof Error ? err.message : "Failed to update system prompts"
    }
  }

  async function handleBulkDelete(): Promise<void> {
    if (selectedPrompts.length === 0) return

    if (
      !confirm(
        `Are you sure you want to delete ${selectedPrompts.length} system prompt(s)?`,
      )
    ) {
      return
    }

    try {
      const response = await api.bulkDeleteSystemPrompts(selectedPrompts)

      if (response.status === "success") {
        await loadSystemPrompts()
        await loadStats()
        selectedPrompts = []
      } else {
        error = response.message || "Failed to delete system prompts"
      }
    } catch (err) {
      console.error("Error bulk deleting system prompts:", err)
      error =
        err instanceof Error ? err.message : "Failed to delete system prompts"
    }
  }

  function handleEdit(event: CustomEvent<SystemPrompt>): void {
    editingPrompt = event.detail
    showForm = true
  }

  function handleFilterChange(event: CustomEvent<SystemPromptFilter>): void {
    filter = { ...filter, ...event.detail, offset: 0 }
    loadSystemPrompts()
  }

  function handleSearch(): void {
    if (searchQuery.trim()) {
      filter = { ...filter, search: searchQuery.trim(), offset: 0 }
    } else {
      const { search, ...filterWithoutSearch } = filter
      filter = { ...filterWithoutSearch, offset: 0 }
    }
    loadSystemPrompts()
  }

  function handlePageChange(newOffset: number): void {
    filter = { ...filter, offset: newOffset }
    loadSystemPrompts()
  }

  function openCreateForm(): void {
    editingPrompt = null
    showForm = true
  }

  function closeForm(): void {
    showForm = false
    editingPrompt = null
  }

  onMount(async () => {
    await Promise.all([loadSystemPrompts(), loadStats()])
  })
</script>

<div class="system-prompts-page">
  <div class="header">
    <div class="header-content">
      <div class="title-section">
        <h1>System Prompts Management</h1>
        <p class="subtitle">
          Manage AI prompts for query expansion, industry-specific responses,
          and more
        </p>
      </div>

      <div class="header-actions">
        <button
          class="btn btn-secondary"
          on:click={() => (showFilters = !showFilters)}
        >
          <Settings size={16} />
          Filters
        </button>

        <button class="btn btn-primary" on:click={openCreateForm}>
          <Plus size={16} />
          New Prompt
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-section">
      <div class="search-input-group">
        <Search size={20} class="search-icon" />
        <input
          type="text"
          placeholder="Search prompts by title, description, or content..."
          bind:value={searchQuery}
          on:keydown={(e) => e.key === "Enter" && handleSearch()}
          class="search-input"
        />
        <button class="btn btn-secondary" on:click={handleSearch}>
          Search
        </button>
      </div>
    </div>

    <!-- Stats -->
    {#if stats}
      <SystemPromptsStats {stats} />
    {/if}

    <!-- Filters -->
    {#if showFilters}
      <SystemPromptsFilters {filter} on:filterChange={handleFilterChange} />
    {/if}
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="error-banner">
      <p>{error}</p>
      <button on:click={() => (error = null)}>×</button>
    </div>
  {/if}

  <!-- Bulk Actions -->
  {#if selectedPrompts.length > 0}
    <div class="bulk-actions">
      <span class="selected-count">{selectedPrompts.length} selected</span>
      <div class="bulk-buttons">
        <button
          class="btn btn-secondary"
          on:click={() => handleBulkToggle(true)}
        >
          Activate
        </button>
        <button
          class="btn btn-secondary"
          on:click={() => handleBulkToggle(false)}
        >
          Deactivate
        </button>
        <button class="btn btn-danger" on:click={handleBulkDelete}>
          Delete
        </button>
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <div class="main-content">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading system prompts...</p>
      </div>
    {:else}
      <SystemPromptsList
        {systemPrompts}
        {selectedPrompts}
        {pagination}
        {filter}
        on:edit={handleEdit}
        on:delete={handleDelete}
        on:duplicate={handleDuplicate}
        on:selectionChange={(e) => (selectedPrompts = e.detail)}
        on:pageChange={(e) => handlePageChange(e.detail)}
      />
    {/if}
  </div>

  <!-- Form Modal -->
  {#if showForm}
    <SystemPromptsForm
      prompt={editingPrompt}
      on:create={handleCreate}
      on:update={handleUpdate}
      on:cancel={closeForm}
    />
  {/if}
</div>

<style>
  .system-prompts-page {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 32px;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .title-section h1 {
    font-size: 32px;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 8px 0;
  }

  .subtitle {
    color: #6b7280;
    font-size: 16px;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .search-section {
    margin-bottom: 24px;
  }

  .search-input-group {
    display: flex;
    align-items: center;
    max-width: 600px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    color: #6b7280;
    z-index: 1;
  }

  .search-input {
    flex: 1;
    padding: 12px 16px 12px 44px;
    border: 1px solid #d1d5db;
    border-radius: 8px 0 0 8px;
    font-size: 14px;
    outline: none;
  }

  .search-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bulk-actions {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .selected-count {
    font-weight: 500;
    color: #374151;
  }

  .bulk-buttons {
    display: flex;
    gap: 8px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px;
    color: #6b7280;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: white;
    color: #374151;
    border-color: #d1d5db;
  }

  .btn-secondary:hover {
    background: #f9fafb;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }
</style>
