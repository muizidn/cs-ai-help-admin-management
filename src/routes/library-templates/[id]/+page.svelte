<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { goto } from "$app/navigation"
  import {
    ArrowLeft,
    Pencil,
    Trash2,
    Download,
    Star,
    Calendar,
    Tag,
  } from "lucide-svelte"
  import type { LibraryTemplate } from "$lib/types/library-templates"
  import {
    LIBRARY_TEMPLATE_TYPE_LABELS,
    BUSINESS_CATEGORY_LABELS,
  } from "$lib/types/library-templates"

  let template: LibraryTemplate | null = null
  let loading = true
  let error: string | null = null

  $: templateId = $page.params.id

  async function loadTemplate() {
    if (!templateId) return

    loading = true
    error = null

    try {
      const response = await fetch(`/api/library-templates/${templateId}`)
      const result = await response.json()

      if (result.status === "success") {
        template = result.data
      } else {
        error = result.message || "Failed to load template"
      }
    } catch (err) {
      error = "Failed to load template"
      console.error("Error loading template:", err)
    } finally {
      loading = false
    }
  }

  function handleEdit() {
    if (template) {
      goto(`/library-templates?edit=${template.id}`)
    }
  }

  async function handleDelete() {
    if (
      !template ||
      !confirm(`Are you sure you want to delete "${template.title}"?`)
    ) {
      return
    }

    try {
      const response = await fetch(`/api/library-templates/${template.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.status === "success") {
        alert("Template deleted successfully")
        goto("/library-templates")
      } else {
        alert(result.message || "Failed to delete template")
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      alert("Failed to delete template")
    }
  }

  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function getTypeColor(type: string): string {
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
    loadTemplate()
  })
</script>

<svelte:head>
  <title>{template ? template.title : "Loading..."} - Library Templates</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Back Button -->
    <div class="mb-6">
      <button
        on:click={() => goto("/library-templates")}
        class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft class="w-4 h-4 mr-2" />
        Back to Library Templates
      </button>
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
        ></div>
        <p class="mt-2 text-gray-600">Loading template...</p>
      </div>
    {/if}

    <!-- Error State -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{error}</p>
      </div>
    {/if}

    <!-- Template Details -->
    {#if template && !loading && !error}
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <h1 class="text-2xl font-bold text-gray-900">
                  {template.title}
                </h1>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getTypeColor(
                    template.type,
                  )}"
                >
                  {LIBRARY_TEMPLATE_TYPE_LABELS[template.type]}
                </span>
              </div>
              <p class="text-gray-600">{template.description}</p>
            </div>
            <div class="flex items-center space-x-2">
              <button
                on:click={handleEdit}
                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Pencil class="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                on:click={handleDelete}
                class="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 class="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Metadata -->
        <div class="px-6 py-4 border-b border-gray-200">
          <dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt class="text-sm font-medium text-gray-500">Category</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {BUSINESS_CATEGORY_LABELS[template.category]}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Version</dt>
              <dd class="mt-1 text-sm text-gray-900">{template.version}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 flex items-center">
                <Download class="w-4 h-4 mr-1" />
                Downloads
              </dt>
              <dd class="mt-1 text-sm text-gray-900">
                {template.downloadCount}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 flex items-center">
                <Star class="w-4 h-4 mr-1" />
                Rating
              </dt>
              <dd class="mt-1 text-sm text-gray-900">
                {template.rating.toFixed(1)} / 5.0
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 flex items-center">
                <Calendar class="w-4 h-4 mr-1" />
                Created
              </dt>
              <dd class="mt-1 text-sm text-gray-900">
                {formatDate(template.createdAt)}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 flex items-center">
                <Calendar class="w-4 h-4 mr-1" />
                Updated
              </dt>
              <dd class="mt-1 text-sm text-gray-900">
                {formatDate(template.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Tags -->
        {#if template.tags && template.tags.length > 0}
          <div class="px-6 py-4 border-b border-gray-200">
            <dt
              class="text-sm font-medium text-gray-500 flex items-center mb-2"
            >
              <Tag class="w-4 h-4 mr-1" />
              Tags
            </dt>
            <div class="flex flex-wrap gap-2">
              {#each template.tags as tag}
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Preview -->
        {#if template.preview}
          <div class="px-6 py-4 border-b border-gray-200">
            <dt class="text-sm font-medium text-gray-500 mb-2">Preview</dt>
            <dd class="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
              {template.preview}
            </dd>
          </div>
        {/if}

        <!-- Content -->
        <div class="px-6 py-4">
          <dt class="text-sm font-medium text-gray-500 mb-2">Content</dt>
          <dd class="text-sm text-gray-900">
            <pre
              class="bg-gray-50 p-4 rounded-md overflow-x-auto text-xs font-mono">{JSON.stringify(
                template.content,
                null,
                2,
              )}</pre>
          </dd>
        </div>

        <!-- Metadata Details -->
        {#if template.metadata}
          <div class="px-6 py-4 border-t border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
            <dl class="space-y-4">
              {#if template.metadata.variables && template.metadata.variables.length > 0}
                <div>
                  <dt class="text-sm font-medium text-gray-500">Variables</dt>
                  <dd class="mt-1 text-sm text-gray-900">
                    <div class="flex flex-wrap gap-1">
                      {#each template.metadata.variables as variable}
                        <span
                          class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {variable}
                        </span>
                      {/each}
                    </div>
                  </dd>
                </div>
              {/if}

              {#if template.metadata.keywords && template.metadata.keywords.length > 0}
                <div>
                  <dt class="text-sm font-medium text-gray-500">Keywords</dt>
                  <dd class="mt-1 text-sm text-gray-900">
                    <div class="flex flex-wrap gap-1">
                      {#each template.metadata.keywords as keyword}
                        <span
                          class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
                        >
                          {keyword}
                        </span>
                      {/each}
                    </div>
                  </dd>
                </div>
              {/if}

              {#if template.metadata.exampleUseCases && template.metadata.exampleUseCases.length > 0}
                <div>
                  <dt class="text-sm font-medium text-gray-500">
                    Example Use Cases
                  </dt>
                  <dd class="mt-1 text-sm text-gray-900">
                    <ul class="list-disc list-inside space-y-1">
                      {#each template.metadata.exampleUseCases as useCase}
                        <li>{useCase}</li>
                      {/each}
                    </ul>
                  </dd>
                </div>
              {/if}
            </dl>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
