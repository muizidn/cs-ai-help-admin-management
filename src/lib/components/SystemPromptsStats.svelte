<script lang="ts">
  import type { SystemPromptStats } from "../types/system-prompts"
  import {
    stringAsSystemPromptType,
    SYSTEM_PROMPT_TYPE_LABELS,
  } from "../types/system-prompts"
  import { BarChart3, Activity, Eye, EyeOff } from "lucide-svelte"

  export let stats: SystemPromptStats

  $: activePercentage =
    stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0
  $: inactivePercentage = 100 - activePercentage
</script>

<div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <!-- Total Prompts -->
    <div
      class="flex items-center gap-4 p-5 bg-blue-50 border border-blue-200 rounded-lg hover:-translate-y-0.5 transition-transform"
    >
      <div
        class="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0"
      >
        <BarChart3 size={24} />
      </div>
      <div class="flex-1">
        <div class="text-2xl font-bold text-gray-900 leading-none mb-1">
          {stats.total}
        </div>
        <div class="text-sm text-gray-600 font-medium">Total Prompts</div>
      </div>
    </div>

    <!-- Active Prompts -->
    <div
      class="flex items-center gap-4 p-5 bg-green-50 border border-green-200 rounded-lg hover:-translate-y-0.5 transition-transform"
    >
      <div
        class="flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-lg flex-shrink-0"
      >
        <Eye size={24} />
      </div>
      <div class="flex-1">
        <div class="text-2xl font-bold text-gray-900 leading-none mb-1">
          {stats.active}
        </div>
        <div class="text-sm text-gray-600 font-medium">Active</div>
        <div class="text-xs text-gray-500 mt-0.5">{activePercentage}%</div>
      </div>
    </div>

    <!-- Inactive Prompts -->
    <div
      class="flex items-center gap-4 p-5 bg-orange-50 border border-orange-200 rounded-lg hover:-translate-y-0.5 transition-transform"
    >
      <div
        class="flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex-shrink-0"
      >
        <EyeOff size={24} />
      </div>
      <div class="flex-1">
        <div class="text-2xl font-bold text-gray-900 leading-none mb-1">
          {stats.inactive}
        </div>
        <div class="text-sm text-gray-600 font-medium">Inactive</div>
        <div class="text-xs text-gray-500 mt-0.5">{inactivePercentage}%</div>
      </div>
    </div>

    <!-- Activity Indicator -->
    <div
      class="flex items-center gap-4 p-5 bg-cyan-50 border border-cyan-200 rounded-lg hover:-translate-y-0.5 transition-transform"
    >
      <div
        class="flex items-center justify-center w-12 h-12 bg-cyan-100 text-cyan-600 rounded-lg flex-shrink-0"
      >
        <Activity size={24} />
      </div>
      <div class="flex-1">
        <div class="text-2xl font-bold text-gray-900 leading-none mb-1">
          {stats.active > 0 ? "Active" : "Inactive"}
        </div>
        <div class="text-sm text-gray-600 font-medium">System Status</div>
      </div>
    </div>
  </div>

  <!-- Type Breakdown -->
  {#if Object.keys(stats.byType).length > 0}
    <div class="border-t border-gray-200 pt-6">
      <h3 class="text-base font-semibold text-gray-900 mb-4">
        Prompts by Type
      </h3>
      <div class="grid gap-3">
        {#each Object.entries(stats.byType) as [type, count]}
          {#if count > 0}
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-700 font-medium"
                  >{SYSTEM_PROMPT_TYPE_LABELS[
                    stringAsSystemPromptType(type)
                  ]}</span
                >
                <span class="text-sm text-gray-600 font-semibold">{count}</span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300 {type ===
                  'query_expansion'
                    ? 'bg-blue-500'
                    : type === 'industry_specific'
                      ? 'bg-green-500'
                      : type === 'general_instruction'
                        ? 'bg-yellow-500'
                        : type === 'context_enhancement'
                          ? 'bg-purple-500'
                          : type === 'response_formatting'
                            ? 'bg-pink-500'
                            : type === 'safety_filter'
                              ? 'bg-red-500'
                              : 'bg-gray-500'}"
                  style="width: {stats.total > 0
                    ? (count / stats.total) * 100
                    : 0}%"
                ></div>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>
