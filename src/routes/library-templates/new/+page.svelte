<script lang="ts">
  import { goto } from "$app/navigation"
  import { apiClient } from "$lib/api-client"
  import LibraryTemplateForm from "$lib/components/LibraryTemplateForm.svelte"
  import type {
    LibraryTemplateCreateInput,
    LibraryTemplateUpdateInput,
  } from "$lib/types/library-templates"

  async function handleSave(
    event: CustomEvent<LibraryTemplateCreateInput | LibraryTemplateUpdateInput>,
  ) {
    const data = event.detail as LibraryTemplateCreateInput

    try {
      const response = await apiClient.post("/api/library-templates", data)

      if (response.status === 200 || response.status === 201) {
        const result = response.data
        if (result?.status === "success") {
          alert(result.message || "Template created successfully")
          goto("/library-templates")
        } else {
          alert(result?.message || "Failed to create template")
        }
      } else {
        alert(response.data?.message || "Failed to create template")
      }
    } catch (error) {
      console.error("Error creating template:", error)
      alert("Failed to create template")
    }
  }

  function handleCancel() {
    goto("/library-templates")
  }
</script>

<svelte:head>
  <title>Create Library Template - System Prompts Management</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Create New Template</h1>
    </div>

    <LibraryTemplateForm on:save={handleSave} on:cancel={handleCancel} />
  </div>
</div>
