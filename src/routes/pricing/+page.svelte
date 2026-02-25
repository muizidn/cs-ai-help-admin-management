<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type { PricingConfig, PricingUpdateInput } from "$lib/types/pricing"
  import {
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Brain,
    Play,
    FileSearch,
  } from "lucide-svelte"
  import "../global-admin.css"

  // State
  let config: PricingConfig | null = null
  let loading = false
  let saving = false
  let error = ""
  let success = ""

  // Form state
  let proOriginal = 0
  let proCurrent = 0
  let creditPrice = 0
  let creditOriginal = 0
  let inferenceCost = 0
  let simulationCost = 0
  let kbParsingCost = 0

  async function loadConfig() {
    loading = true
    error = ""
    try {
      const response = await apiClient.get("/api/pricing")
      if (response.status === 200 && response.data?.status === "success") {
        config = response.data.data
        if (config) {
          proOriginal = config.proPlan.originalPrice
          proCurrent = config.proPlan.currentPrice
          creditPrice = config.credits.pricePerCredit
          creditOriginal = config.credits.originalPricePerCredit || 0
          inferenceCost = config.usageCosts.inference
          simulationCost = config.usageCosts.simulation
          kbParsingCost = config.usageCosts.kbParsing
        }
      } else {
        error = response.data?.message || "Failed to load pricing configuration"
      }
    } catch (err) {
      error = "An error occurred while loading configuration"
      console.error(err)
    } finally {
      loading = false
    }
  }

  async function handleSave() {
    saving = true
    error = ""
    success = ""

    const updateData: PricingUpdateInput = {
      proPlan: { originalPrice: proOriginal, currentPrice: proCurrent },
      credits: {
        pricePerCredit: creditPrice,
        originalPricePerCredit: creditOriginal || undefined,
      },
      usageCosts: {
        inference: inferenceCost,
        simulation: simulationCost,
        kbParsing: kbParsingCost,
      },
    }

    try {
      const response = await apiClient.patch("/api/pricing", updateData)
      if (response.status === 200 && response.data?.status === "success") {
        success = "Pricing configuration saved successfully!"
        config = response.data.data
        setTimeout(() => (success = ""), 3000)
      } else {
        error = response.data?.message || "Failed to save configuration"
      }
    } catch (err) {
      error = "An error occurred while saving"
      console.error(err)
    } finally {
      saving = false
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  onMount(loadConfig)
</script>

<svelte:head>
  <title>Pricing Configuration - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  <div class="page-header flex justify-between items-center">
    <div>
      <h1>Pricing Configuration</h1>
      <p>Manage plan prices, credit costs, and AI operation deductions</p>
    </div>
    <button
      class="btn btn-primary flex items-center gap-2"
      on:click={handleSave}
      disabled={saving || loading}
    >
      {#if saving}
        <RefreshCw size={18} class="animate-spin" />
        Saving...
      {:else}
        <Save size={18} />
        Save Settings
      {/if}
    </button>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading pricing configuration...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <div class="flex items-center gap-2 text-danger mb-4">
        <AlertCircle size={24} />
        <span>{error}</span>
      </div>
      <button on:click={loadConfig} class="retry-btn">Retry</button>
    </div>
  {:else if config}
    {#if success}
      <div class="alert alert-success flex items-center gap-2 mb-6">
        <CheckCircle2 size={20} />
        <span>{success}</span>
      </div>
    {/if}

    <div class="settings-grid">
      <!-- Plan Pricing -->
      <div class="settings-card">
        <div class="card-header">
          <DollarSign size={20} class="text-primary" />
          <h2>PRO Plan Pricing</h2>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Original Price (IDR)</label>
            <input type="number" bind:value={proOriginal} class="form-input" />
            <p class="form-help">Current: {formatCurrency(proOriginal)}</p>
          </div>
          <div class="form-group">
            <label>Discounted Price (IDR)</label>
            <input type="number" bind:value={proCurrent} class="form-input" />
            <div class="flex items-center gap-2 mt-1">
              <p class="form-help">Current: {formatCurrency(proCurrent)}</p>
              {#if proCurrent < proOriginal}
                <span class="badge badge-success text-xs">Discounted</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Credit Pricing -->
      <div class="settings-card">
        <div class="card-header">
          <DollarSign size={20} class="text-orange-500" />
          <h2>Credit Pricing</h2>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Price Per Credit (IDR)</label>
            <input type="number" bind:value={creditPrice} class="form-input" />
            <p class="form-help">Current: {formatCurrency(creditPrice)}</p>
          </div>
          <div class="form-group">
            <label>Original Price Per Credit (Optional)</label>
            <input
              type="number"
              bind:value={creditOriginal}
              class="form-input"
            />
            <p class="form-help">Current: {formatCurrency(creditOriginal)}</p>
          </div>
        </div>
      </div>

      <!-- Usage Costs -->
      <div class="settings-card col-span-2">
        <div class="card-header">
          <Brain size={20} class="text-purple-500" />
          <h2>AI Usage Costs (Credits per operation)</h2>
        </div>
        <div class="card-body grid grid-cols-3 gap-6">
          <div class="form-group">
            <div class="flex items-center gap-2 mb-2">
              <Brain size={16} />
              <label class="m-0">Inference</label>
            </div>
            <input
              type="number"
              bind:value={inferenceCost}
              class="form-input"
            />
            <p class="form-help">Deducted per AI response</p>
          </div>
          <div class="form-group">
            <div class="flex items-center gap-2 mb-2">
              <Play size={16} />
              <label class="m-0">Simulation</label>
            </div>
            <input
              type="number"
              bind:value={simulationCost}
              class="form-input"
            />
            <p class="form-help">Deducted per simulation run</p>
          </div>
          <div class="form-group">
            <div class="flex items-center gap-2 mb-2">
              <FileSearch size={16} />
              <label class="m-0">KB Parsing</label>
            </div>
            <input
              type="number"
              bind:value={kbParsingCost}
              class="form-input"
            />
            <p class="form-help">Deducted per knowledge base parsing</p>
          </div>
        </div>
      </div>

      <!-- Metadata -->
      <div class="col-span-2 text-right text-xs text-gray-400">
        Last updated by {config.updatedBy} at {new Date(
          config.updatedAt,
        ).toLocaleString()}
      </div>
    </div>
  {/if}
</div>

<style>
  .settings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  .settings-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .card-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #f9fafb;
  }
  .card-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: #1f2937;
  }
  .card-body {
    padding: 1.5rem;
  }
  .form-group {
    margin-bottom: 1.25rem;
  }
  .form-group:last-child {
    margin-bottom: 0;
  }
  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }
  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .form-help {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-top: 0.375rem;
  }
  .col-span-2 {
    grid-column: span 2 / span 2;
  }
  .grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  .alert {
    padding: 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
  }
  .alert-success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(3600deg);
    }
  }
  .text-orange-500 {
    color: #f97316;
  }
  .text-purple-500 {
    color: #a855f7;
  }
  .m-0 {
    margin: 0;
  }
</style>
