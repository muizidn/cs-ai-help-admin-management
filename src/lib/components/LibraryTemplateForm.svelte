<script lang="ts">
  import type {
    BusinessCategory,
    LibraryTemplate,
    LibraryTemplateCreateInput,
    LibraryTemplateType,
    LibraryTemplateUpdateInput,
  } from "$lib/types/library-templates"
  import {
    BUSINESS_CATEGORY_LABELS,
    LIBRARY_TEMPLATE_TYPE_LABELS,
  } from "$lib/types/library-templates"
  import { Plus, Save, X } from "lucide-svelte"
  import { createEventDispatcher } from "svelte"

  export let template: LibraryTemplate | null = null
  export let isOpen = false

  const dispatch = createEventDispatcher<{
    save: LibraryTemplateCreateInput | LibraryTemplateUpdateInput
    cancel: void
  }>()

  let loading = false
  let errors: Record<string, string> = {}

  // Form data
  let formData = {
    title: "",
    description: "",
    type: "message_template" as LibraryTemplateType,
    category: "general" as BusinessCategory,
    tags: [] as string[],
    content: {} as Record<string, any>,
    preview: "",
    version: "1.0.0",
    metadata: {
      variables: [] as string[],
      conditions: [] as string[],
      actions: [] as string[],
      dataSourceType: "",
      keywords: [] as string[],
      requiredPermissions: [] as string[],
      exampleUseCases: [] as string[],
    },
  }

  // Tag input
  let newTag = ""
  let newVariable = ""
  let newCondition = ""
  let newAction = ""
  let newKeyword = ""
  let newPermission = ""
  let newUseCase = ""

  // Content as JSON string for editing
  let contentJson = ""

  $: if (template) {
    formData = {
      title: template.title,
      description: template.description,
      type: template.type,
      category: template.category,
      tags: [...template.tags],
      content: { ...template.content },
      preview: template.preview || "",
      version: template.version,
      metadata: {
        variables: template.metadata?.variables
          ? [...template.metadata.variables]
          : [],
        conditions: template.metadata?.conditions
          ? [...template.metadata.conditions]
          : [],
        actions: template.metadata?.actions
          ? [...template.metadata.actions]
          : [],
        dataSourceType: template.metadata?.dataSourceType || "",
        keywords: template.metadata?.keywords
          ? [...template.metadata.keywords]
          : [],
        requiredPermissions: template.metadata?.requiredPermissions
          ? [...template.metadata.requiredPermissions]
          : [],
        exampleUseCases: template.metadata?.exampleUseCases
          ? [...template.metadata.exampleUseCases]
          : [],
      },
    }
    contentJson = JSON.stringify(template.content, null, 2)
  } else {
    // Reset form for new template
    formData = {
      title: "",
      description: "",
      type: "message_template",
      category: "general",
      tags: [],
      content: {},
      preview: "",
      version: "1.0.0",
      metadata: {
        variables: [],
        conditions: [],
        actions: [],
        dataSourceType: "",
        keywords: [],
        requiredPermissions: [],
        exampleUseCases: [],
      },
    }
    contentJson = "{}"
  }

  function addTag() {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      formData.tags = [...formData.tags, newTag.trim()]
      newTag = ""
    }
  }

  function removeTag(index: number) {
    formData.tags = formData.tags.filter((_, i) => i !== index)
  }

  function addToArray(
    arrayName: keyof typeof formData.metadata,
    value: string,
    inputVar: string,
  ) {
    if (value.trim()) {
      const currentArray = formData.metadata[arrayName] as string[]
      if (!currentArray.includes(value.trim())) {
        formData.metadata[arrayName] = [...currentArray, value.trim()] as any
        // Reset the input variable
        if (inputVar === "newVariable") newVariable = ""
        else if (inputVar === "newCondition") newCondition = ""
        else if (inputVar === "newAction") newAction = ""
        else if (inputVar === "newKeyword") newKeyword = ""
        else if (inputVar === "newPermission") newPermission = ""
        else if (inputVar === "newUseCase") newUseCase = ""
      }
    }
  }

  function removeFromArray(
    arrayName: keyof typeof formData.metadata,
    index: number,
  ) {
    const currentArray = formData.metadata[arrayName] as string[]
    formData.metadata[arrayName] = currentArray.filter(
      (_, i) => i !== index,
    ) as any
  }

  function validateForm(): boolean {
    errors = {}

    if (!formData.title.trim()) {
      errors.title = "Title is required"
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required"
    }

    try {
      formData.content = JSON.parse(contentJson)
    } catch (e) {
      errors.content = "Content must be valid JSON"
      console.error("error json validation content", e)
    }

    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return

    loading = true

    try {
      const data = template
        ? ({ ...formData } as LibraryTemplateUpdateInput)
        : ({ ...formData } as LibraryTemplateCreateInput)

      dispatch("save", data)
    } finally {
      loading = false
    }
  }

  function handleCancel() {
    dispatch("cancel")
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  >
    <div
      class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white"
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-medium text-gray-900">
          {template ? "Edit Template" : "Create New Template"}
        </h3>
        <button
          on:click={handleCancel}
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Form -->
      <form on:submit|preventDefault={handleSave} class="space-y-6">
        <!-- Title & Version -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700"
              >Title</label
            >
            <input
              type="text"
              id="title"
              bind:value={formData.title}
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.title
                ? 'border-red-300'
                : ''}"
            />
            {#if errors.title}
              <p class="mt-1 text-sm text-red-600">{errors.title}</p>
            {/if}
          </div>

          <div>
            <label for="version" class="block text-sm font-medium text-gray-700"
              >Version</label
            >
            <input
              type="text"
              id="version"
              bind:value={formData.version}
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Description -->
        <div>
          <label
            for="description"
            class="block text-sm font-medium text-gray-700">Description</label
          >
          <textarea
            id="description"
            rows="3"
            bind:value={formData.description}
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 {errors.description
              ? 'border-red-300'
              : ''}"
          ></textarea>
          {#if errors.description}
            <p class="mt-1 text-sm text-red-600">{errors.description}</p>
          {/if}
        </div>

        <!-- Type & Category -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="type" class="block text-sm font-medium text-gray-700"
              >Type</label
            >
            <select
              id="type"
              bind:value={formData.type}
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {#each Object.entries(LIBRARY_TEMPLATE_TYPE_LABELS) as [value, label]}
                <option {value}>{label}</option>
              {/each}
            </select>
          </div>

          <div>
            <label
              for="category"
              class="block text-sm font-medium text-gray-700">Category</label
            >
            <select
              id="category"
              bind:value={formData.category}
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {#each Object.entries(BUSINESS_CATEGORY_LABELS) as [value, label]}
                <option {value}>{label}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Preview -->
        <div>
          <label for="preview" class="block text-sm font-medium text-gray-700"
            >Preview Text</label
          >
          <textarea
            id="preview"
            rows="2"
            bind:value={formData.preview}
            placeholder="Optional preview text for the template..."
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Tags</label>
          <div class="mt-1 flex flex-wrap gap-2">
            {#each formData.tags as tag, index}
              <span
                class="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  on:click={() => removeTag(index)}
                  class="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <X class="w-3 h-3" />
                </button>
              </span>
            {/each}
          </div>
          <div class="mt-2 flex">
            <input
              type="text"
              bind:value={newTag}
              on:keydown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Add a tag..."
              class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              on:click={addTag}
              class="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Content (JSON) -->
        <div>
          <label for="content" class="block text-sm font-medium text-gray-700"
            >Content (JSON)</label
          >
          <textarea
            id="content"
            rows="10"
            bind:value={contentJson}
            placeholder={JSON.stringify({ key: "value" }, null, 2)}
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm {errors.content
              ? 'border-red-300'
              : ''}"
          ></textarea>
          {#if errors.content}
            <p class="mt-1 text-sm text-red-600">{errors.content}</p>
          {/if}
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            on:click={handleCancel}
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {#if loading}
              <div
                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
              ></div>
            {:else}
              <Save class="w-4 h-4 mr-2" />
            {/if}
            {template ? "Update" : "Create"} Template
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
