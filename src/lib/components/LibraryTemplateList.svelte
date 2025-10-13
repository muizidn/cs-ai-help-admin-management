<script lang="ts">
  import { onMount } from "svelte"
  import { Search, Plus, Download, Star, Pencil, Trash2 } from "lucide-svelte"
  import { apiClient } from "$lib/api-client"
  import type {
    LibraryTemplate,
    LibraryTemplateFilter,
    LibraryTemplateListResponse,
    LibraryTemplateType,
    BusinessCategory,
  } from "$lib/types/library-templates"
  import {
    LIBRARY_TEMPLATE_TYPE_LABELS,
    BUSINESS_CATEGORY_LABELS,
  } from "$lib/types/library-templates"

  export let onEdit: (template: LibraryTemplate) => void = () => {}
  export let onDelete: (template: LibraryTemplate) => void = () => {}
  export let onCreate: () => void = () => {}

  let templates: LibraryTemplate[] = []
  let loading = false
  let error: string | null = null
  let searchQuery = ""
  let selectedType: LibraryTemplateType | "" = ""
  let selectedCategory: BusinessCategory | "" = ""
  let currentPage = 0
  let totalPages = 0
  let total = 0

  const pageSize = 20

  let filter: LibraryTemplateFilter = {
    limit: pageSize,
    offset: 0,
    sortBy: "createdAt",
    sortOrder: "desc",
  }

  export async function loadTemplates() {
    loading = true
    error = null

    try {
      const queryString = apiClient.buildQueryString({
        search: filter.search,
        type: filter.type,
        category: filter.category,
        sortBy: filter.sortBy,
        sortOrder: filter.sortOrder,
        limit: filter.limit || 20,
        offset: filter.offset || 0,
      })

      const response = await apiClient.get(
        `/api/library-templates${queryString}`,
      )

      if (response.status === 200 && response.data?.status === "success") {
        const data: LibraryTemplateListResponse = response.data.data
        templates = data.items
        total = data.total
        totalPages = Math.ceil(total / pageSize)
        currentPage = Math.floor((filter.offset || 0) / pageSize)
      } else {
        error = response.data?.message || "Failed to load templates"
      }
    } catch (err) {
      error = "Failed to load templates"
      console.error("Error loading templates:", err)
    } finally {
      loading = false
    }
  }

  function handleSearch() {
    filter = {
      ...filter,
      search: searchQuery || undefined,
      offset: 0,
    }
    loadTemplates()
  }

  function handleFilterChange() {
    filter = {
      ...filter,
      type: selectedType || undefined,
      category: selectedCategory || undefined,
      offset: 0,
    }
    loadTemplates()
  }

  function handlePageChange(page: number) {
    filter = {
      ...filter,
      offset: page * pageSize,
    }
    loadTemplates()
  }

  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString()
  }

  function getTypeColor(type: LibraryTemplateType): string {
    const colors = {
      message_template: "bg-blue-100 text-blue-800",
      ai_rule: "bg-green-100 text-green-800",
      datasource: "bg-purple-100 text-purple-800",
      knowledge_base: "bg-yellow-100 text-yellow-800",
      tool: "bg-red-100 text-red-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  onMount(() => {
    loadTemplates()
  })
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold text-gray-900">Library Templates</h1>
    <button
      on:click={onCreate}
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <Plus class="w-4 h-4 mr-2" />
      Create Template
    </button>
  </div>

  <!-- Search and Filters -->
  <div class="bg-white p-4 rounded-lg shadow space-y-4">
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Search -->
      <div class="flex-1">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
          />
          <input
            type="text"
            placeholder="Search templates..."
            bind:value={searchQuery}
            on:keydown={(e) => e.key === "Enter" && handleSearch()}
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Type Filter -->
      <select
        bind:value={selectedType}
        on:change={handleFilterChange}
        class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Types</option>
        {#each Object.entries(LIBRARY_TEMPLATE_TYPE_LABELS) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>

      <!-- Category Filter -->
      <select
        bind:value={selectedCategory}
        on:change={handleFilterChange}
        class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Categories</option>
        {#each Object.entries(BUSINESS_CATEGORY_LABELS) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>

      <button
        on:click={handleSearch}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Search
      </button>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
      ></div>
      <p class="mt-2 text-gray-600">Loading templates...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">{error}</p>
    </div>
  {/if}

  <!-- Templates List -->
  {#if !loading && !error}
    {#if templates.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-500 text-lg">No templates found</p>
        <p class="text-gray-400 mt-2">
          Try adjusting your search criteria or create a new template
        </p>
      </div>
    {:else}
      <div class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul class="divide-y divide-gray-200">
          {#each templates as template}
            <li class="px-6 py-4 hover:bg-gray-50">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-3">
                    <h3 class="text-lg font-medium text-gray-900 truncate">
                      {template.title}
                    </h3>
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getTypeColor(
                        template.type,
                      )}"
                    >
                      {LIBRARY_TEMPLATE_TYPE_LABELS[template.type]}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-gray-600 line-clamp-2">
                    {template.description}
                  </p>
                  <div
                    class="mt-2 flex items-center space-x-4 text-sm text-gray-500"
                  >
                    <span
                      >Category: {BUSINESS_CATEGORY_LABELS[
                        template.category
                      ]}</span
                    >
                    <span class="flex items-center">
                      <Download class="w-4 h-4 mr-1" />
                      {template.downloadCount}
                    </span>
                    <span class="flex items-center">
                      <Star class="w-4 h-4 mr-1" />
                      {template.rating.toFixed(1)}
                    </span>
                    <span>Created: {formatDate(template.createdAt)}</span>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-1">
                    {#each template.tags.slice(0, 3) as tag}
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    {/each}
                    {#if template.tags.length > 3}
                      <span class="text-xs text-gray-500"
                        >+{template.tags.length - 3} more</span
                      >
                    {/if}
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    on:click={() => onEdit(template)}
                    class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                    title="Edit template"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    on:click={() => onDelete(template)}
                    class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    title="Delete template"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700">
          Showing {(filter.offset || 0) + 1} to {Math.min(
            (filter.offset || 0) + pageSize,
            total,
          )} of {total} results
        </div>
        <div class="flex space-x-1">
          <button
            on:click={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {#each Array(Math.min(5, totalPages)) as _, i}
            {@const page =
              Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i}
            <button
              on:click={() => handlePageChange(page)}
              class="px-3 py-2 text-sm font-medium rounded-md {page ===
              currentPage
                ? 'text-blue-600 bg-blue-50 border-blue-500'
                : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'} border"
            >
              {page + 1}
            </button>
          {/each}
          <button
            on:click={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
