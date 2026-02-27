<script lang="ts">
  import {
    Plus,
    X,
    MessageSquare,
    ChevronDown,
    ChevronRight,
  } from "lucide-svelte"
  import type { TestScenario, TestMessage } from "$lib/types/library-templates"
  import { createEventDispatcher } from "svelte"

  export let questions: TestScenario[] = []

  const dispatch = createEventDispatcher<{
    change: TestScenario[]
  }>()

  let expandedScenarios: boolean[] = []

  // Initialize expanded states if needed
  $: if (expandedScenarios.length !== questions.length) {
    const newExpanded = [...expandedScenarios]
    while (newExpanded.length < questions.length) {
      newExpanded.push(true) // Expand new ones by default
    }
    expandedScenarios = newExpanded
  }

  function dispatchChange() {
    dispatch("change", questions)
  }

  function addScenario() {
    questions = [
      ...questions,
      {
        flowName: "New Flow",
        messages: [{ customer: "", ai_response_eval: "" }],
      },
    ]
    dispatchChange()
  }

  function removeScenario(index: number) {
    questions = questions.filter((_, i) => i !== index)
    expandedScenarios = expandedScenarios.filter((_, i) => i !== index)
    dispatchChange()
  }

  function toggleScenario(index: number) {
    expandedScenarios[index] = !expandedScenarios[index]
    expandedScenarios = [...expandedScenarios]
  }

  function addMessage(scenarioIndex: number) {
    questions[scenarioIndex].messages = [
      ...questions[scenarioIndex].messages,
      { customer: "", ai_response_eval: "" },
    ]
    questions = [...questions]
    dispatchChange()
  }

  function removeMessage(scenarioIndex: number, messageIndex: number) {
    questions[scenarioIndex].messages = questions[
      scenarioIndex
    ].messages.filter((_, i) => i !== messageIndex)
    questions = [...questions]
    dispatchChange()
  }

  function updateField() {
    questions = [...questions]
    dispatchChange()
  }
</script>

<div class="space-y-4 mt-6">
  <div
    class="flex justify-between items-center bg-blue-50 p-2 rounded-t-md border-b-2 border-blue-100"
  >
    <h4 class="text-sm font-bold text-blue-800 flex items-center">
      <MessageSquare class="w-4 h-4 mr-2" />
      Test Scenarios (Questions)
    </h4>
    <button
      type="button"
      on:click={addScenario}
      class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center transition-colors"
    >
      <Plus class="w-3 h-3 mr-1" /> Add Scenario
    </button>
  </div>

  {#if questions.length > 0}
    <div class="space-y-4">
      {#each questions as scenario, sIdx}
        <div
          class="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm"
        >
          <!-- Scenario Header -->
          <div
            class="flex items-center justify-between bg-gray-50 p-3 border-b border-gray-100"
          >
            <div class="flex items-center flex-1 mr-4">
              <button
                type="button"
                on:click={() => toggleScenario(sIdx)}
                class="mr-2 text-gray-500 hover:text-gray-700"
              >
                {#if expandedScenarios[sIdx]}
                  <ChevronDown class="w-4 h-4" />
                {:else}
                  <ChevronRight class="w-4 h-4" />
                {/if}
              </button>
              <input
                type="text"
                bind:value={scenario.flowName}
                on:input={updateField}
                placeholder="Flow Name (e.g., Asking Price)"
                class="bg-transparent border-none focus:ring-0 font-medium text-sm w-full"
                aria-label="Flow Name"
              />
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs text-gray-500"
                >{scenario.messages.length} messages</span
              >
              <button
                type="button"
                on:click={() => removeScenario(sIdx)}
                class="text-red-400 hover:text-red-600 p-1"
                aria-label="Remove Scenario"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Scenario Content (Messages) -->
          {#if expandedScenarios[sIdx]}
            <div class="p-4 space-y-4 bg-white">
              {#each scenario.messages as message, mIdx}
                <div
                  class="relative pl-4 border-l-2 border-blue-200 py-2 space-y-2 group"
                >
                  <div class="flex justify-between items-start">
                    <span
                      class="text-xs font-semibold text-blue-600 uppercase tracking-wider"
                      >Message #{mIdx + 1}</span
                    >
                    <button
                      type="button"
                      on:click={() => removeMessage(sIdx, mIdx)}
                      class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove Message"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        class="block text-xs font-medium text-gray-500 mb-1"
                        >Customer Question</label
                      >
                      <textarea
                        bind:value={message.customer}
                        on:input={updateField}
                        rows="2"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="What customer would ask..."
                      ></textarea>
                    </div>
                    <div>
                      <label
                        class="block text-xs font-medium text-gray-500 mb-1"
                        >AI Response Evaluation</label
                      >
                      <textarea
                        bind:value={message.ai_response_eval}
                        on:input={updateField}
                        rows="2"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        placeholder="What to look for in AI response..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              {/each}

              <button
                type="button"
                on:click={() => addMessage(sIdx)}
                class="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-1 rounded"
              >
                <Plus class="w-3 h-3 mr-1" /> Add Message Step
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div
      class="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-white"
    >
      <MessageSquare class="w-8 h-8 mx-auto text-gray-300 mb-2" />
      <p class="text-sm text-gray-500">No test scenarios added yet.</p>
      <button
        type="button"
        on:click={addScenario}
        class="mt-2 text-blue-600 hover:underline text-sm font-medium"
      >
        Click to add your first test scenario
      </button>
    </div>
  {/if}
</div>
