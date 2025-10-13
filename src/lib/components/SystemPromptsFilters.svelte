<script lang="ts">
  import { createEventDispatcher } from "svelte"
  import type {
    SystemPromptFilter,
    SystemPromptType,
  } from "../types/system-prompts"
  import {
    SystemPromptType as PromptType,
    SYSTEM_PROMPT_TYPE_LABELS,
  } from "../types/system-prompts"
  import { Filter, X, RotateCcw } from "lucide-svelte"

  export let filter: SystemPromptFilter

  const dispatch = createEventDispatcher()

  let localFilter = { ...filter }
  let tagInput = ""

  // Reactive updates
  $: {
    localFilter = { ...filter }
  }

  function applyFilters(): void {
    dispatch("filterChange", localFilter)
  }

  function resetFilters(): void {
    localFilter = {
      limit: 20,
      offset: 0,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }
    dispatch("filterChange", localFilter)
  }

  function addTag(): void {
    const tag = tagInput.trim()
    if (tag && (!localFilter.tags || !localFilter.tags.includes(tag))) {
      localFilter.tags = [...(localFilter.tags || []), tag]
      tagInput = ""
      applyFilters()
    }
  }

  function removeTag(tagToRemove: string): void {
    if (localFilter.tags) {
      localFilter.tags = localFilter.tags.filter((tag) => tag !== tagToRemove)
      if (localFilter.tags.length === 0) {
        delete localFilter.tags
      }
      applyFilters()
    }
  }

  function handleTagKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault()
      addTag()
    }
  }

  function handleTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement
    if (target.value) {
      localFilter.type = target.value as SystemPromptType
    } else {
      delete localFilter.type
    }
    applyFilters()
  }

  function handleStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement
    if (target.value === "") {
      delete localFilter.isActive
    } else {
      localFilter.isActive = target.value === "true"
    }
    applyFilters()
  }

  function handleSortChange(): void {
    applyFilters()
  }

  $: hasActiveFilters = !!(
    localFilter.type ||
    localFilter.isActive !== undefined ||
    (localFilter.tags && localFilter.tags.length > 0) ||
    localFilter.search
  )
</script>

<div class="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
  <div class="flex justify-between items-center mb-4">
    <div class="flex items-center gap-2 text-sm font-semibold text-gray-700">
      <Filter size={16} />
      <span>Filters</span>
      {#if hasActiveFilters}
        <span class="text-blue-600 text-base leading-none">•</span>
      {/if}
    </div>

    {#if hasActiveFilters}
      <button
        class="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        on:click={resetFilters}
      >
        <RotateCcw size={14} />
        Reset
      </button>
    {/if}
  </div>

  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4"
  >
    <!-- Type Filter -->
    <div class="flex flex-col gap-1.5">
      <label for="type-filter" class="text-xs font-medium text-gray-700"
        >Type</label
      >
      <select
        id="type-filter"
        value={localFilter.type || ""}
        on:change={handleTypeChange}
        class="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <option value="">All Types</option>
        {#each Object.values(PromptType) as type}
          <option value={type}>{SYSTEM_PROMPT_TYPE_LABELS[type]}</option>
        {/each}
      </select>
    </div>

    <!-- Status Filter -->
    <div class="flex flex-col gap-1.5">
      <label for="status-filter" class="text-xs font-medium text-gray-700"
        >Status</label
      >
      <select
        id="status-filter"
        value={localFilter.isActive === undefined
          ? ""
          : localFilter.isActive.toString()}
        on:change={handleStatusChange}
        class="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>

    <!-- Sort By -->
    <div class="flex flex-col gap-1.5">
      <label for="sort-by" class="text-xs font-medium text-gray-700"
        >Sort By</label
      >
      <select
        id="sort-by"
        bind:value={localFilter.sortBy}
        on:change={handleSortChange}
        class="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <option value="updatedAt">Last Updated</option>
        <option value="createdAt">Created Date</option>
        <option value="title">Title</option>
        <option value="priority">Priority</option>
      </select>
    </div>

    <!-- Sort Order -->
    <div class="flex flex-col gap-1.5">
      <label for="sort-order" class="text-xs font-medium text-gray-700"
        >Order</label
      >
      <select
        id="sort-order"
        bind:value={localFilter.sortOrder}
        on:change={handleSortChange}
        class="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </div>

    <!-- Tags Filter -->
    <div
      class="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4 xl:col-span-4"
    >
      <label for="tags-filter" class="text-xs font-medium text-gray-700"
        >Tags</label
      >
      <div class="flex gap-2">
        <input
          id="tags-filter"
          type="text"
          bind:value={tagInput}
          placeholder="Add tag filter..."
          on:keydown={handleTagKeydown}
          class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <button
          type="button"
          on:click={addTag}
          disabled={!tagInput.trim()}
          class="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {#if localFilter.tags && localFilter.tags.length > 0}
        <div class="flex flex-wrap gap-1.5 mt-2">
          {#each localFilter.tags as tag}
            <span
              class="flex items-center gap-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-medium"
            >
              {tag}
              <button
                type="button"
                on:click={() => removeTag(tag)}
                class="text-gray-500 hover:text-gray-700 hover:bg-gray-300 w-4 h-4 flex items-center justify-center rounded transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Results Per Page -->
    <div class="flex flex-col gap-1.5">
      <label for="limit-filter" class="text-xs font-medium text-gray-700"
        >Per Page</label
      >
      <select
        id="limit-filter"
        bind:value={localFilter.limit}
        on:change={applyFilters}
        class="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  </div>
</div>
