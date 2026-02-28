<script lang="ts">
  import { Plus, X, ChevronDown, ChevronRight, FileText } from "lucide-svelte"
  import type { KnowledgeBaseContent } from "$lib/types/library-templates"
  import { createEventDispatcher } from "svelte"
  import TestQuestions from "./TestQuestions.svelte"

  export let content: KnowledgeBaseContent

  const dispatch = createEventDispatcher<{
    change: KnowledgeBaseContent
  }>()

  let newKbKeyword = ""
  let expandedSections: boolean[] = []

  // Initialize expanded states
  $: if (expandedSections.length !== (content.sections?.length || 0)) {
    const newExpanded = [...expandedSections]
    const currentLen = content.sections?.length || 0
    while (newExpanded.length < currentLen) {
      newExpanded.push(false) // Collapse by default to let user focus on questions
    }
    expandedSections = newExpanded
  }

  function updateContent(newContent: KnowledgeBaseContent) {
    content = newContent
    dispatch("change", content)
  }

  function addSection() {
    const sections = content.sections || []
    updateContent({
      ...content,
      sections: [...sections, { content: "## New Section\nContent..." }],
    })
  }

  function removeSection(index: number) {
    const sections = content.sections || []
    updateContent({
      ...content,
      sections: sections.filter((_, i) => i !== index),
    })
    expandedSections = expandedSections.filter((_, i) => i !== index)
  }

  function toggleSection(index: number) {
    expandedSections[index] = !expandedSections[index]
    expandedSections = [...expandedSections]
  }

  function getSectionTitle(content: string, index: number): string {
    if (!content) return `Section ${index + 1}`
    const firstLine = content.split("\n")[0].replace(/^#+\s*/, "")
    return firstLine || `Section ${index + 1}`
  }

  function updateSection(index: number, value: string) {
    const sections = content.sections || []
    const newSections = [...sections]
    newSections[index] = { ...newSections[index], content: value }
    updateContent({
      ...content,
      sections: newSections,
    })
  }

  function addKeyword() {
    if (newKbKeyword.trim()) {
      const keywords = content.keywords || []
      if (!keywords.includes(newKbKeyword.trim())) {
        updateContent({
          ...content,
          keywords: [...keywords, newKbKeyword.trim()],
        })
      }
      newKbKeyword = ""
    }
  }

  function removeKeyword(index: number) {
    const keywords = content.keywords || []
    updateContent({
      ...content,
      keywords: keywords.filter((_, i) => i !== index),
    })
  }
</script>

<div class="space-y-4 border border-gray-200 rounded-md p-4 bg-gray-50">
  <!-- KB Sections -->
  <div>
    <div class="flex justify-between items-center mb-2">
      <h4 class="text-sm font-medium text-gray-700">Sections</h4>
      <button
        type="button"
        on:click={addSection}
        class="text-xs text-blue-600 hover:text-blue-800 flex items-center"
      >
        <Plus class="w-3 h-3 mr-1" /> Add Section
      </button>
    </div>

    {#if content.sections && content.sections.length > 0}
      <div class="space-y-2">
        {#each content.sections as section, i}
          <div
            class="border border-gray-200 rounded-md bg-white overflow-hidden shadow-sm"
          >
            <!-- Section Header -->
            <div
              class="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-100"
            >
              <div class="flex items-center flex-1 min-w-0">
                <button
                  type="button"
                  on:click={() => toggleSection(i)}
                  class="mr-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {#if expandedSections[i]}
                    <ChevronDown class="w-4 h-4" />
                  {:else}
                    <ChevronRight class="w-4 h-4" />
                  {/if}
                </button>
                <button
                  type="button"
                  class="flex items-center space-x-2 cursor-pointer truncate text-left focus:outline-none"
                  on:click={() => toggleSection(i)}
                >
                  <FileText class="w-3.5 h-3.5 text-gray-400" />
                  <span class="text-xs font-medium text-gray-700 truncate">
                    {getSectionTitle(section.content, i)}
                  </span>
                </button>
              </div>
              <button
                type="button"
                on:click={() => removeSection(i)}
                class="text-gray-400 hover:text-red-500 p-1"
                aria-label="Remove Section"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Section Content -->
            {#if expandedSections[i]}
              <div class="p-3">
                <textarea
                  value={section.content}
                  on:input={(e) => updateSection(i, e.currentTarget.value)}
                  rows="5"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="## Section Title&#10;Content..."
                  aria-label="Section Content"
                ></textarea>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-500 italic">No sections added.</p>
    {/if}
  </div>

  <!-- KB Keywords -->
  <div>
    <h4 class="block text-sm font-medium text-gray-700">Keywords in Content</h4>
    <div class="mt-1 flex flex-wrap gap-2 mb-2">
      {#if content.keywords}
        {#each content.keywords as keyword, index}
          <span
            class="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800"
          >
            {keyword}
            <button
              type="button"
              on:click={() => removeKeyword(index)}
              class="ml-1 text-green-600 hover:text-green-800"
              aria-label="Remove Keyword"
            >
              <X class="w-3 h-3" />
            </button>
          </span>
        {/each}
      {/if}
    </div>
    <div class="flex">
      <input
        type="text"
        bind:value={newKbKeyword}
        on:keydown={(e) =>
          e.key === "Enter" && (e.preventDefault(), addKeyword())}
        placeholder="Add a content keyword..."
        class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
        aria-label="Add a content keyword"
      />
      <button
        type="button"
        on:click={addKeyword}
        class="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100"
        aria-label="Add Keyword"
      >
        <Plus class="w-4 h-4" />
      </button>
    </div>
  </div>

  <TestQuestions
    questions={content.questions || []}
    on:change={(e) => {
      updateContent({
        ...content,
        questions: e.detail,
      })
    }}
  />
</div>
