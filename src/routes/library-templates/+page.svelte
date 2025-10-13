<script lang="ts">
  import { apiClient } from "$lib/api-client"
  import LibraryTemplateList from "$lib/components/LibraryTemplateList.svelte"
  import LibraryTemplateForm from "$lib/components/LibraryTemplateForm.svelte"
  import type {
    LibraryTemplate,
    LibraryTemplateCreateInput,
    LibraryTemplateUpdateInput,
  } from "$lib/types/library-templates"

  let showForm = false
  let editingTemplate: LibraryTemplate | null = null
  let listComponent: LibraryTemplateList

  function handleCreate() {
    editingTemplate = null
    showForm = true
  }

  function handleEdit(template: LibraryTemplate) {
    editingTemplate = template
    showForm = true
  }

  async function handleSave(
    event: CustomEvent<LibraryTemplateCreateInput | LibraryTemplateUpdateInput>,
  ) {
    const data = event.detail

    try {
      let response

      if (editingTemplate) {
        // Update existing template
        response = await apiClient.put(
          `/api/library-templates/${editingTemplate.id}`,
          data,
        )
      } else {
        // Create new template
        response = await apiClient.post("/api/library-templates", data)
      }

      if (response.status === 200 || response.status === 201) {
        const result = response.data
        if (result?.status === "success") {
          showForm = false
          editingTemplate = null
          // Refresh the list
          if (listComponent) {
            listComponent.loadTemplates()
          }

          // Show success message (you might want to add a toast notification system)
          alert(result.message || "Template saved successfully")
        } else {
          // Show error message
          alert(result?.message || "Failed to save template")
        }
      } else {
        alert(response.data?.message || "Failed to save template")
      }
    } catch (error) {
      console.error("Error saving template:", error)
      alert("Failed to save template")
    }
  }

  function handleCancel() {
    showForm = false
    editingTemplate = null
  }

  async function handleDelete(template: LibraryTemplate) {
    if (!confirm(`Are you sure you want to delete "${template.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/library-templates/${template.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.status === "success") {
        // Refresh the list
        if (listComponent) {
          listComponent.loadTemplates()
        }

        alert("Template deleted successfully")
      } else {
        alert(result.message || "Failed to delete template")
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      alert("Failed to delete template")
    }
  }
</script>

<svelte:head>
  <title>Library Templates - System Prompts Management</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <LibraryTemplateList
      bind:this={listComponent}
      onCreate={handleCreate}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  </div>
</div>

<LibraryTemplateForm
  template={editingTemplate}
  isOpen={showForm}
  on:save={handleSave}
  on:cancel={handleCancel}
/>
