<script lang="ts">
  import LibraryTemplateList from "$lib/components/LibraryTemplateList.svelte"
  import type { LibraryTemplate } from "$lib/types/library-templates"
  import { Upload, Download, Loader2 } from "lucide-svelte"

  let listComponent: LibraryTemplateList
  let fileInput: HTMLInputElement
  let isExporting = false
  let isImporting = false

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

  async function handleExport() {
    try {
      isExporting = true
      const response = await fetch("/api/library-templates/export")

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      // extract filename from content-disposition header if possible, or use default
      const contentDisposition = response.headers.get("content-disposition")
      let filename = `library_export_${new Date().toISOString().split("T")[0]}.zip`
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Export error:", error)
      alert("Failed to export library")
    } finally {
      isExporting = false
    }
  }

  function handleImportClick() {
    fileInput.click()
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) return

    if (!file.name.endsWith(".zip")) {
      alert("Please select a ZIP file")
      return
    }

    try {
      isImporting = true
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/library-templates/import", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.status === "success") {
        const stats = result.data
        const message = `Import completed:\nSuccess: ${stats.success}\nFailed: ${stats.failed}`
        alert(message)

        if (listComponent) {
          listComponent.loadTemplates()
        }
      } else {
        throw new Error(result.message || "Import failed")
      }
    } catch (error) {
      console.error("Import error:", error)
      alert(error instanceof Error ? error.message : "Failed to import library")
    } finally {
      isImporting = false
      target.value = "" // Reset input
    }
  }
</script>

<svelte:head>
  <title>Library Templates - System Prompts Management</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Library Templates</h1>
      <div class="flex gap-2">
        <input
          type="file"
          accept=".zip"
          class="hidden"
          bind:this={fileInput}
          on:change={handleFileChange}
        />

        <button
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          on:click={handleImportClick}
          disabled={isImporting}
        >
          {#if isImporting}
            <Loader2 class="animate-spin -ml-1 mr-2 h-4 w-4" />
            Importing...
          {:else}
            <Upload class="-ml-1 mr-2 h-4 w-4" />
            Import
          {/if}
        </button>

        <button
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          on:click={handleExport}
          disabled={isExporting}
        >
          {#if isExporting}
            <Loader2 class="animate-spin -ml-1 mr-2 h-4 w-4" />
            Exporting...
          {:else}
            <Download class="-ml-1 mr-2 h-4 w-4" />
            Export
          {/if}
        </button>
      </div>
    </div>

    <LibraryTemplateList bind:this={listComponent} onDelete={handleDelete} />
  </div>
</div>
