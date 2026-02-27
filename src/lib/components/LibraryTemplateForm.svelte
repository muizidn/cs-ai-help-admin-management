<script lang="ts">
  import type {
    BusinessCategory,
    LibraryTemplate,
    LibraryTemplateType,
    LibraryTemplateCreateInput,
    LibraryTemplateUpdateInput,
    KnowledgeBaseContent,
  } from "$lib/types/library-templates"
  import {
    BUSINESS_CATEGORY_LABELS,
    LIBRARY_TEMPLATE_TYPE_LABELS,
    LIBRARY_TEMPLATE_TYPE_DESCRIPTIONS,
  } from "$lib/types/library-templates"
  import {
    Plus,
    Save,
    X,
    FileText,
    Code,
    Maximize2,
    Minimize2,
  } from "lucide-svelte"
  import { createEventDispatcher } from "svelte"
  import KnowledgeBaseContentEditor from "./library-templates/KnowledgeBaseContent.svelte"
  import MonacoEditor from "./MonacoEditor.svelte"

  export let template: LibraryTemplate | null = null

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
    type: "knowledge_base" as LibraryTemplateType,
    category: "technology" as BusinessCategory,
    tags: [] as string[],
    language: "en",
    content: {
      sections: [],
      keywords: [],
    } as Record<string, any>,
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
  let activeTab: "form" | "json" = "form"
  let contentJson = ""
  let isFullscreenJson = false

  function initializeForm(t: LibraryTemplate | null) {
    if (t) {
      formData = {
        title: t.title,
        description: t.description,
        type: t.type,
        category: t.category,
        tags: [...t.tags],
        language: t.language || "en",
        content: { ...t.content },
        preview: t.preview || "",
        version: t.version,
        metadata: {
          variables: t.metadata?.variables ? [...t.metadata.variables] : [],
          conditions: t.metadata?.conditions ? [...t.metadata.conditions] : [],
          actions: t.metadata?.actions ? [...t.metadata.actions] : [],
          dataSourceType: t.metadata?.dataSourceType || "",
          keywords: t.metadata?.keywords ? [...t.metadata.keywords] : [],
          requiredPermissions: t.metadata?.requiredPermissions
            ? [...t.metadata.requiredPermissions]
            : [],
          exampleUseCases: t.metadata?.exampleUseCases
            ? [...t.metadata.exampleUseCases]
            : [],
        },
      }

      // Set active tab based on template type preference or default
      activeTab = "form"
      contentJson = JSON.stringify(t.content, null, 2)
    } else {
      // Reset form for new template
      formData = {
        title: "",
        description: "",
        type: "knowledge_base",
        category: "general",
        tags: [],
        language: "en",
        content: {
          sections: [
            {
              content: "## Section Title\nSection content goes here.",
            },
          ],
          keywords: [],
          questions: [],
        },
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
      activeTab = "form"
      contentJson = JSON.stringify(formData.content, null, 2)
    }
  }

  // Reactively initialize form when template changes
  $: initializeForm(template)

  // Create a typed version of content for the KnowledgeBaseContentEditor
  $: kbContent = formData.content as unknown as KnowledgeBaseContent

  // Effect to sync content to JSON when form data changes (if in form mode)
  $: if (activeTab === "form") {
    // Only update JSON if formData really changed (deep check might be too expensive, but simple stringify is fine)
    contentJson = JSON.stringify(formData.content, null, 2)
  }

  // Effect to sync JSON to content when JSON changes (if in JSON mode)
  function handleJsonChange() {
    try {
      formData.content = JSON.parse(contentJson)
      errors.content = ""
    } catch (e) {
      // Don't update content if JSON is invalid, just show error
      errors.content = "Invalid JSON"
    }
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

    if (activeTab === "json") {
      try {
        formData.content = JSON.parse(contentJson)
      } catch (e) {
        errors.content = "Content must be valid JSON"
        console.error("error json validation content", e)
      }
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

<div class="bg-white shadow rounded-lg p-6">
  <!-- Header -->
  <div class="mb-6">
    <h3 class="text-lg font-medium text-gray-900">
      {template ? "Edit Template" : "Create New Template"}
    </h3>
    <p class="mt-1 text-sm text-gray-500">
      {template
        ? "Modify existing template details."
        : "Fill in the details for the new template."}
    </p>
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

    <!-- Language -->
    <div>
      <label for="language" class="block text-sm font-medium text-gray-700"
        >Language</label
      >
      <select
        id="language"
        bind:value={formData.language}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      >
        <option value="en">English (en)</option>
        <option value="id">Indonesian (id)</option>
        <!-- Add more languages as needed -->
      </select>
    </div>

    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700"
        >Description</label
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
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
          disabled={true}
        >
          <option value="knowledge_base">Knowledge Base</option>
          {#if formData.type !== "knowledge_base"}
            <option value={formData.type}
              >{LIBRARY_TEMPLATE_TYPE_LABELS[formData.type]}</option
            >
          {/if}
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Only Knowledge Base templates can be created at this time.
        </p>
      </div>

      <div>
        <label for="category" class="block text-sm font-medium text-gray-700"
          >Category</label
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
        aria-label="Preview Text"
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
          aria-label="Add a tag"
        />
        <button
          type="button"
          on:click={addTag}
          class="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100"
          aria-label="Add Tag"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Content Editor -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-medium text-gray-700">Content</label>
        <div class="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium rounded-md transition-colors {activeTab ===
            'form'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'}"
            on:click={() => (activeTab = "form")}
          >
            <div class="flex items-center space-x-1">
              <FileText class="w-3 h-3" />
              <span>Form</span>
            </div>
          </button>
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium rounded-md transition-colors {activeTab ===
            'json'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'}"
            on:click={() => (activeTab = "json")}
          >
            <div class="flex items-center space-x-1">
              <Code class="w-3 h-3" />
              <span>JSON</span>
            </div>
          </button>
        </div>
      </div>

      {#if activeTab === "form"}
        {#if formData.type === "knowledge_base"}
          <div
            class="space-y-4 border border-gray-200 rounded-md p-4 bg-gray-50"
          >
            <KnowledgeBaseContentEditor
              content={kbContent}
              on:change={(e) => {
                formData.content = e.detail
              }}
            />
          </div>
        {:else}
          <div
            class="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg"
          >
            <p class="text-gray-500">
              Form view not available for this template type.
            </p>
            <button
              type="button"
              class="mt-2 text-blue-600 hover:underline text-sm"
              on:click={() => (activeTab = "json")}
            >
              Switch to JSON view
            </button>
          </div>
        {/if}
      {:else}
        <!-- JSON Editor Container -->
        <div class="relative group">
          <div
            class="flex justify-between items-center bg-gray-100 px-3 py-1.5 border border-b-0 border-gray-300 rounded-t-md"
          >
            <span class="text-xs font-medium text-gray-500">JSON Editor</span>
            <button
              type="button"
              on:click={() => (isFullscreenJson = true)}
              class="text-gray-400 hover:text-blue-600 transition-colors"
              title="Expand to Fullscreen"
            >
              <Maximize2 class="w-4 h-4" />
            </button>
          </div>
          <div class="h-[400px]">
            <MonacoEditor
              value={contentJson}
              on:change={(e) => {
                contentJson = e.detail
                handleJsonChange()
              }}
            />
          </div>
          {#if errors.content}
            <p class="mt-1 text-sm text-red-600">{errors.content}</p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Fullscreen JSON Modal -->
    {#if isFullscreenJson}
      <div
        class="fixed inset-0 z-[100] flex flex-col bg-white"
        on:keydown={(e) => e.key === "Escape" && (isFullscreenJson = false)}
      >
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50"
        >
          <div class="flex items-center space-x-4">
            <h3 class="text-lg font-bold text-gray-900">
              JSON Content Editor - {formData.title || "Untitled"}
            </h3>
            {#if errors.content}
              <span
                class="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse"
              >
                {errors.content}
              </span>
            {/if}
          </div>
          <button
            type="button"
            on:click={() => (isFullscreenJson = false)}
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <Minimize2 class="w-6 h-6" />
          </button>
        </div>
        <div class="flex-1 p-6 overflow-hidden">
          <div
            class="w-full h-full shadow-2xl rounded-xl border border-gray-200 overflow-hidden"
          >
            <MonacoEditor
              value={contentJson}
              options={{ fontSize: 16 }}
              on:change={(e) => {
                contentJson = e.detail
                handleJsonChange()
              }}
            />
          </div>
        </div>
        <div
          class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center"
        >
          <p class="text-xs text-gray-500">
            Press <kbd
              class="px-1 py-0.5 bg-white border border-gray-300 rounded shadow-sm"
              >Esc</kbd
            > to minimize
          </p>
          <button
            type="button"
            on:click={() => (isFullscreenJson = false)}
            class="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
          >
            Apply Changes
          </button>
        </div>
      </div>
    {/if}

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
