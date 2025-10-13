<script lang="ts">
  import { createEventDispatcher } from "svelte"
  import type {
    SystemPrompt,
    SystemPromptCreateInput,
    SystemPromptUpdateInput,
    SystemPromptType,
  } from "../types/system-prompts"
  import {
    SystemPromptType as PromptType,
    SYSTEM_PROMPT_TYPE_LABELS,
    SYSTEM_PROMPT_TYPE_DESCRIPTIONS,
  } from "../types/system-prompts"
  import { X, Save, Eye, EyeOff } from "lucide-svelte"

  export let prompt: SystemPrompt | null = null

  const dispatch = createEventDispatcher()

  let formData = {
    title: "",
    description: "",
    query: "",
    content: "",
    type: PromptType.GENERAL_INSTRUCTION as SystemPromptType,
    isActive: true,
    tags: [] as string[],
    priority: 0,
  }

  let errors: Record<string, string> = {}
  let isSubmitting = false
  let tagInput = ""
  let showPreview = false

  // Initialize form data when prompt changes
  $: if (prompt) {
    formData = {
      title: prompt.title,
      description: prompt.description,
      query: prompt.query,
      content: prompt.content,
      type: prompt.type,
      isActive: prompt.isActive,
      tags: [...(prompt.tags || [])],
      priority: prompt.priority || 0,
    }
  } else {
    formData = {
      title: "",
      description: "",
      query: "",
      content: "",
      type: PromptType.GENERAL_INSTRUCTION,
      isActive: true,
      tags: [],
      priority: 0,
    }
  }

  function validateForm(): boolean {
    errors = {}

    if (!formData.title.trim()) {
      errors.title = "Title is required"
    } else if (formData.title.length > 200) {
      errors.title = "Title must be less than 200 characters"
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required"
    } else if (formData.description.length > 1000) {
      errors.description = "Description must be less than 1000 characters"
    }

    if (!formData.query.trim()) {
      errors.query = "Query is required"
    }

    if (!formData.content.trim()) {
      errors.content = "Content is required"
    }

    if (formData.priority < 0 || formData.priority > 100) {
      errors.priority = "Priority must be between 0 and 100"
    }

    return Object.keys(errors).length === 0
  }

  async function handleSubmit(): Promise<void> {
    if (!validateForm()) return

    isSubmitting = true

    try {
      if (prompt) {
        // Update existing prompt
        const updateData: SystemPromptUpdateInput = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          query: formData.query.trim(),
          content: formData.content.trim(),
          type: formData.type,
          isActive: formData.isActive,
          tags: formData.tags,
          priority: formData.priority,
        }
        dispatch("update", { id: prompt.id, data: updateData })
      } else {
        // Create new prompt
        const createData: SystemPromptCreateInput = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          query: formData.query.trim(),
          content: formData.content.trim(),
          type: formData.type,
          isActive: formData.isActive,
          tags: formData.tags,
          priority: formData.priority,
        }
        dispatch("create", createData)
      }
    } finally {
      isSubmitting = false
    }
  }

  function handleCancel(): void {
    dispatch("cancel")
  }

  function addTag(): void {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      formData.tags = [...formData.tags, tag]
      tagInput = ""
    }
  }

  function removeTag(tagToRemove: string): void {
    formData.tags = formData.tags.filter((tag) => tag !== tagToRemove)
  }

  function handleTagKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault()
      addTag()
    }
  }

  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement
    if (!target.closest(".modal-content")) {
      handleCancel()
    }
  }
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5"
  on:click={handleClickOutside}
  role="dialog"
  aria-modal="true"
  aria-labelledby="system-prompt-title"
>
  <div
    class="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
    on:click|stopPropagation
  >
    <div class="flex justify-between items-center p-6 border-b border-gray-200">
      <h2 id="system-prompt-title" class="text-xl font-semibold text-gray-900">
        {prompt ? "Edit System Prompt" : "Create New System Prompt"}
      </h2>
      <button
        class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors"
        on:click={handleCancel}
        aria-label="Close"
      >
        <X size={20} />
      </button>
    </div>

    <form
      class="p-6 overflow-y-auto"
      on:submit|preventDefault={handleSubmit}
      role="form"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Title -->
        <div class="flex flex-col gap-1.5">
          <label for="title" class="text-sm font-medium text-gray-700"
            >Title *</label
          >
          <input
            id="title"
            type="text"
            bind:value={formData.title}
            placeholder="Enter prompt title..."
            class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors {errors.title
              ? 'border-red-500'
              : ''}"
            maxlength="200"
          />
          {#if errors.title}
            <span class="text-red-600 text-xs">{errors.title}</span>
          {/if}
        </div>

        <!-- Type -->
        <div class="flex flex-col gap-1.5">
          <label for="type" class="text-sm font-medium text-gray-700"
            >Type *</label
          >
          <select
            id="type"
            bind:value={formData.type}
            class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors {errors.type
              ? 'border-red-500'
              : ''}"
          >
            {#each Object.values(PromptType) as type}
              <option value={type}>{SYSTEM_PROMPT_TYPE_LABELS[type]}</option>
            {/each}
          </select>
          {#if formData.type}
            <p class="text-gray-500 text-xs italic">
              {SYSTEM_PROMPT_TYPE_DESCRIPTIONS[formData.type]}
            </p>
          {/if}
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1.5 md:col-span-2">
          <label for="description" class="text-sm font-medium text-gray-700"
            >Description *</label
          >
          <textarea
            id="description"
            bind:value={formData.description}
            placeholder="Describe what this prompt does..."
            rows="3"
            class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors {errors.description
              ? 'border-red-500'
              : ''}"
            maxlength="1000"
          ></textarea>
          {#if errors.description}
            <span class="text-red-600 text-xs">{errors.description}</span>
          {/if}
        </div>

        <!-- Query -->
        <div class="flex flex-col gap-1.5 md:col-span-2">
          <label for="query" class="text-sm font-medium text-gray-700"
            >Query Pattern *</label
          >
          <textarea
            id="query"
            bind:value={formData.query}
            placeholder="Enter the query pattern or trigger..."
            rows="2"
            class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors {errors.query
              ? 'border-red-500'
              : ''}"
          ></textarea>
          {#if errors.query}
            <span class="text-red-600 text-xs">{errors.query}</span>
          {/if}
          <p class="text-gray-500 text-xs">
            Define when this prompt should be triggered
          </p>
        </div>

        <!-- Content -->
        <div class="flex flex-col gap-1.5 md:col-span-2">
          <div class="flex justify-between items-center">
            <label for="content" class="text-sm font-medium text-gray-700"
              >Prompt Content *</label
            >
            <button
              type="button"
              class="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-xs transition-colors"
              on:click={() => (showPreview = !showPreview)}
            >
              {#if showPreview}
                <EyeOff size={16} />
                Edit
              {:else}
                <Eye size={16} />
                Preview
              {/if}
            </button>
          </div>

          {#if showPreview}
            <div
              class="border border-gray-300 rounded-md p-3 bg-gray-50 min-h-[200px]"
            >
              <pre
                class="whitespace-pre-wrap font-mono text-sm leading-relaxed">{formData.content}</pre>
            </div>
          {:else}
            <textarea
              id="content"
              bind:value={formData.content}
              placeholder="Enter the prompt content..."
              rows="8"
              class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors {errors.content
                ? 'border-red-500'
                : ''}"
            ></textarea>
          {/if}

          {#if errors.content}
            <span class="text-red-600 text-xs">{errors.content}</span>
          {/if}
          <p class="text-gray-500 text-xs">
            The actual prompt text that will be used by the AI
          </p>
        </div>

        <!-- Tags -->
        <div class="flex flex-col gap-1.5">
          <label for="tags" class="text-sm font-medium text-gray-700"
            >Tags</label
          >
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={tagInput}
              placeholder="Add tag..."
              on:keydown={handleTagKeydown}
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              on:click={addTag}
              class="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          {#if formData.tags.length > 0}
            <div class="flex flex-wrap gap-1.5 mt-2">
              {#each formData.tags as tag}
                <span
                  class="flex items-center gap-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    on:click={() => removeTag(tag)}
                    class="text-gray-500 hover:text-gray-700 hover:bg-gray-300 w-4 h-4 flex items-center justify-center rounded transition-colors"
                    aria-label="Remove tag"
                  >
                    ×
                  </button>
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Priority -->
        <div class="flex flex-col gap-1.5">
          <label for="priority" class="text-sm font-medium text-gray-700"
            >Priority</label
          >
          <input
            id="priority"
            type="number"
            bind:value={formData.priority}
            min="0"
            max="100"
            class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors {errors.priority
              ? 'border-red-500'
              : ''}"
          />
          {#if errors.priority}
            <span class="text-red-600 text-xs">{errors.priority}</span>
          {/if}
          <p class="text-gray-500 text-xs">0-100 (higher = more priority)</p>
        </div>

        <!-- Status -->
        <div class="flex flex-col gap-1.5 md:col-span-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={formData.isActive}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Active</span>
          </label>
          <p class="text-gray-500 text-xs">
            Only active prompts will be used by the AI
          </p>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-5 mt-8 border-t border-gray-200">
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          on:click={handleCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          <Save size={16} />
          {isSubmitting ? "Saving..." : prompt ? "Update" : "Create"}
        </button>
      </div>
    </form>
  </div>
</div>
