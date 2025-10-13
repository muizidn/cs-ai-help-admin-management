<script lang="ts">
  import { createEventDispatcher } from "svelte"
  import type {
    SystemPrompt,
    SystemPromptFilter,
  } from "../types/system-prompts"
  import { SYSTEM_PROMPT_TYPE_LABELS } from "../types/system-prompts"
  import { Edit, Trash2, Copy, MoreVertical, Eye, EyeOff } from "lucide-svelte"

  export let systemPrompts: SystemPrompt[] = []
  export let selectedPrompts: string[] = []
  export let pagination: { total: number; hasMore: boolean }
  export let filter: SystemPromptFilter

  const dispatch = createEventDispatcher()

  function handleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement
    if (target.checked) {
      dispatch(
        "selectionChange",
        systemPrompts.map((p) => p.id),
      )
    } else {
      dispatch("selectionChange", [])
    }
  }

  function handleSelectPrompt(promptId: string, event: Event): void {
    const target = event.target as HTMLInputElement
    let newSelection = [...selectedPrompts]

    if (target.checked) {
      newSelection.push(promptId)
    } else {
      newSelection = newSelection.filter((id) => id !== promptId)
    }

    dispatch("selectionChange", newSelection)
  }

  function handleEdit(prompt: SystemPrompt): void {
    dispatch("edit", prompt)
  }

  function handleDelete(prompt: SystemPrompt): void {
    if (confirm(`Are you sure you want to delete "${prompt.title}"?`)) {
      dispatch("delete", { id: prompt.id })
    }
  }

  function handleDuplicate(prompt: SystemPrompt): void {
    const newTitle = window.prompt(`Copy of ${prompt.title}`)
    if (newTitle) {
      dispatch("duplicate", { id: prompt.id, newTitle })
    }
  }

  function handlePrevPage(): void {
    const newOffset = Math.max(0, (filter.offset || 0) - (filter.limit || 20))
    dispatch("pageChange", newOffset)
  }

  function handleNextPage(): void {
    const newOffset = (filter.offset || 0) + (filter.limit || 20)
    dispatch("pageChange", newOffset)
  }

  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  $: allSelected =
    systemPrompts.length > 0 && selectedPrompts.length === systemPrompts.length
  $: someSelected =
    selectedPrompts.length > 0 && selectedPrompts.length < systemPrompts.length
  $: currentPage = Math.floor((filter.offset || 0) / (filter.limit || 20)) + 1
  $: totalPages = Math.ceil(pagination.total / (filter.limit || 20))
</script>

<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
  {#if systemPrompts.length === 0}
    <div class="text-center py-16 px-8 text-gray-500">
      <div class="text-5xl mb-4">📝</div>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">
        No system prompts found
      </h3>
      <p>
        Create your first system prompt to get started with AI customization.
      </p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th
              class="w-12 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 text-sm"
            >
              <input
                type="checkbox"
                checked={allSelected}
                indeterminate={someSelected}
                on:change={handleSelectAll}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </th>
            <th
              class="min-w-[300px] bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 text-sm"
              >Title & Description</th
            >
            <th
              class="w-36 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 text-sm"
              >Type</th
            >
            <th
              class="w-28 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 text-sm"
              >Status</th
            >
            <th
              class="w-40 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 text-sm"
              >Updated</th
            >
            <th
              class="w-28 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 text-sm"
              >Actions</th
            >
          </tr>
        </thead>
        <tbody>
          {#each systemPrompts as prompt (prompt.id)}
            <tr
              class="hover:bg-gray-50 {selectedPrompts.includes(prompt.id)
                ? 'bg-blue-50'
                : ''}"
            >
              <td class="px-4 py-4 border-b border-gray-100 align-top">
                <input
                  type="checkbox"
                  checked={selectedPrompts.includes(prompt.id)}
                  on:change={(e) => handleSelectPrompt(prompt.id, e)}
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </td>

              <td class="px-4 py-4 border-b border-gray-100 align-top">
                <div class="flex flex-col gap-1">
                  <h4 class="text-sm font-semibold text-gray-900">
                    {prompt.title}
                  </h4>
                  <p class="text-xs text-gray-600 leading-relaxed">
                    {truncateText(prompt.description)}
                  </p>
                  {#if prompt.tags && prompt.tags.length > 0}
                    <div class="flex flex-wrap gap-1 mt-1">
                      {#each prompt.tags.slice(0, 3) as tag}
                        <span
                          class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs font-medium"
                          >{tag}</span
                        >
                      {/each}
                      {#if prompt.tags.length > 3}
                        <span
                          class="bg-gray-300 text-gray-600 px-1.5 py-0.5 rounded text-xs"
                          >+{prompt.tags.length - 3}</span
                        >
                      {/if}
                    </div>
                  {/if}
                </div>
              </td>

              <td class="px-4 py-4 border-b border-gray-100 align-top">
                <span
                  class="inline-block px-2 py-1 rounded text-xs font-medium uppercase tracking-wide {prompt.type ===
                  'query_expansion'
                    ? 'bg-blue-100 text-blue-800'
                    : prompt.type === 'industry_specific'
                      ? 'bg-green-100 text-green-800'
                      : prompt.type === 'general_instruction'
                        ? 'bg-yellow-100 text-yellow-800'
                        : prompt.type === 'context_enhancement'
                          ? 'bg-indigo-100 text-indigo-800'
                          : prompt.type === 'response_formatting'
                            ? 'bg-pink-100 text-pink-800'
                            : prompt.type === 'safety_filter'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'}"
                >
                  {SYSTEM_PROMPT_TYPE_LABELS[prompt.type]}
                </span>
              </td>

              <td class="px-4 py-4 border-b border-gray-100 align-top">
                <div class="flex items-center gap-1.5">
                  {#if prompt.isActive}
                    <Eye size={16} class="text-green-600" />
                    <span class="text-sm font-medium text-green-600"
                      >Active</span
                    >
                  {:else}
                    <EyeOff size={16} class="text-gray-500" />
                    <span class="text-sm font-medium text-gray-500"
                      >Inactive</span
                    >
                  {/if}
                </div>
              </td>

              <td class="px-4 py-4 border-b border-gray-100 align-top">
                <time class="text-xs text-gray-600">
                  {formatDate(prompt.updatedAt)}
                </time>
                {#if prompt.priority && prompt.priority > 0}
                  <div class="text-xs text-gray-500 mt-0.5">
                    Priority: {prompt.priority}
                  </div>
                {/if}
              </td>

              <td class="px-4 py-4 border-b border-gray-100 align-top">
                <div class="flex gap-1">
                  <button
                    class="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    on:click={() => handleEdit(prompt)}
                    title="Edit prompt"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    class="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    on:click={() => handleDuplicate(prompt)}
                    title="Duplicate prompt"
                  >
                    <Copy size={16} />
                  </button>

                  <button
                    class="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    on:click={() => handleDelete(prompt)}
                    title="Delete prompt"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div
        class="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50"
      >
        <div class="text-sm text-gray-700">
          Showing {(filter.offset || 0) + 1} to {Math.min(
            (filter.offset || 0) + (filter.limit || 20),
            pagination.total,
          )} of {pagination.total} prompts
        </div>

        <div class="flex items-center gap-4">
          <button
            class="px-3 py-2 border border-gray-300 bg-white rounded text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage === 1}
            on:click={handlePrevPage}
          >
            Previous
          </button>

          <span class="text-sm text-gray-700 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <button
            class="px-3 py-2 border border-gray-300 bg-white rounded text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!pagination.hasMore}
            on:click={handleNextPage}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
