<script lang="ts">
  import LibraryTemplateList from "$lib/components/LibraryTemplateList.svelte"
  import type { LibraryTemplate } from "$lib/types/library-templates"

  let listComponent: LibraryTemplateList

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
    <LibraryTemplateList bind:this={listComponent} onDelete={handleDelete} />
  </div>
</div>
