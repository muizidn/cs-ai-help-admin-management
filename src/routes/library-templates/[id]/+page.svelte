<script lang="ts">
  import { page } from "$app/stores"
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import { apiClient } from "$lib/api-client"
  import LibraryTemplateForm from "$lib/components/LibraryTemplateForm.svelte"
  import type {
    LibraryTemplate,
    LibraryTemplateUpdateInput,
  } from "$lib/types/library-templates"

  let template: LibraryTemplate | null = null
  let loading = true
  let error: string | null = null

  onMount(async () => {
    const id = $page.params.id
    if (id) {
      await loadTemplate(id)
    } else {
      loading = false
      error = "Template ID not found"
    }
  })

  async function loadTemplate(id: string) {
    loading = true
    try {
      const response = await apiClient.get(`/api/library-templates/${id}`)
      if (response.status === 200 && response.data?.status === "success") {
        template = response.data.data
      } else {
        error = response.data?.message || "Failed to load template"
      }
    } catch (err) {
      console.error("Error loading template:", err)
      error = "Failed to load template"
    } finally {
      loading = false
    }
  }

  async function handleSave(event: CustomEvent<LibraryTemplateUpdateInput>) {
    const data = event.detail
    if (!template) return

    try {
      const response = await apiClient.put(
        `/api/library-templates/${template.id}`,
        data,
      )

      if (response.status === 200) {
        const result = response.data
        if (result?.status === "success") {
          alert(result.message || "Template updated successfully")
          goto("/library-templates")
        } else {
          alert(result?.message || "Failed to update template")
        }
      } else {
        alert(response.data?.message || "Failed to update template")
      }
    } catch (error) {
      console.error("Error updating template:", error)
      alert("Failed to update template")
    }
  }

  function handleCancel() {
    goto("/library-templates")
  }
</script>

<svelte:head>
  <title>Edit Library Template - System Prompts Management</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Edit Template</h1>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
        ></div>
        <p class="mt-2 text-gray-600">Loading template...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{error}</p>
        <button
          class="mt-2 text-sm text-red-600 underline"
          on:click={() => goto("/library-templates")}
        >
          Back to list
        </button>
      </div>
    {:else if template}
      <LibraryTemplateForm
        {template}
        on:save={handleSave}
        on:cancel={handleCancel}
      />
    {/if}
  </div>
</div>
