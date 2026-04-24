<script lang="ts">
  import { onMount } from "svelte"
  import { api } from "../../lib/api"
  import { Save, RefreshCw, Cpu, Brain, Sparkles, CheckCircle2, AlertCircle } from "lucide-svelte"
  import { fade, fly } from 'svelte/transition';

  let model = ""
  let currentModel = ""
  let loading = true
  let saving = false
  let error: string | null = null
  let successMessage: string | null = null

  // Predefined models for selection
  const MODELS = [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", description: "Most capable model, best for complex reasoning." },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", description: "Fast and lightweight, good for most tasks." },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", description: "Classic reliable model." },
    { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", provider: "Anthropic", description: "High intelligence, great for coding and nuance." },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "Anthropic", description: "Near-instant responsiveness." }
  ]

  async function loadConfig() {
    try {
      loading = true
      error = null
      const response = await api.getLlmModel()
      if (response.status === "success") {
        currentModel = response.data?.model || "Not set (using ENV default)"
        model = response.data?.model || ""
      } else {
        error = response.message || "Failed to load configuration"
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load configuration"
    } finally {
      loading = false
    }
  }

  async function handleSave() {
    if (!model.trim()) {
      error = "Model name cannot be empty"
      return
    }

    try {
      saving = true
      error = null
      successMessage = null
      
      const response = await api.updateLlmModel(model)
      
      if (response.status === "success") {
        successMessage = "LLM model updated successfully"
        currentModel = model
        setTimeout(() => {
          successMessage = null
        }, 3000)
      } else {
        error = response.message || "Failed to update model"
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to update model"
    } finally {
      saving = false
    }
  }

  function selectModel(modelId: string) {
    model = modelId
  }

  onMount(loadConfig)
</script>

<div class="configurator-container">
  <div class="header-section" in:fade={{ duration: 600 }}>
    <div class="title-container">
      <div class="icon-glow">
        <Cpu class="title-icon" size={32} />
      </div>
      <div class="title-text">
        <h1>AI Configurator</h1>
        <p class="subtitle">Dynamic Model Orchestration & LLM Management</p>
      </div>
    </div>
    <div class="status-badge" class:active={currentModel !== "Not set (using ENV default)"}>
      <span class="pulse"></span>
      Currently using: <strong>{currentModel}</strong>
    </div>
  </div>

  <div class="main-grid">
    <!-- Configuration Card -->
    <div class="config-card" in:fly={{ y: 20, duration: 600, delay: 200 }}>
      <div class="card-header">
        <Brain size={20} />
        <h2>Main LLM Model</h2>
      </div>
      
      <div class="card-content">
        <p class="field-description">
          This model will be used as the primary engine for all AI inferences. 
          If not set here, the system will fall back to the environment default.
        </p>

        <div class="input-group">
          <label for="model-input">Model Identifier</label>
          <div class="input-wrapper">
            <input 
              id="model-input"
              type="text" 
              bind:value={model} 
              placeholder="e.g. gpt-4o"
              class:has-error={error}
            />
            <Sparkles size={18} class="input-accent" />
          </div>
        </div>

        {#if error}
          <div class="error-msg" transition:fade>
            <AlertCircle size={16} />
            {error}
          </div>
        {/if}

        {#if successMessage}
          <div class="success-msg" transition:fade>
            <CheckCircle2 size={16} />
            {successMessage}
          </div>
        {/if}

        <div class="actions">
          <button class="btn btn-secondary" on:click={loadConfig} disabled={loading || saving}>
            <RefreshCw size={18} class={loading ? "spin" : ""} />
            Refresh
          </button>
          <button class="btn btn-primary" on:click={handleSave} disabled={loading || saving || !model.trim()}>
            {#if saving}
              <div class="spinner-small"></div>
            {:else}
              <Save size={18} />
            {/if}
            Save Configuration
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Select Card -->
    <div class="presets-card" in:fly={{ y: 20, duration: 600, delay: 400 }}>
      <div class="card-header">
        <Sparkles size={20} />
        <h2>Quick Presets</h2>
      </div>
      
      <div class="presets-list">
        {#each MODELS as item}
          <button 
            class="preset-item" 
            class:selected={model === item.id}
            on:click={() => selectModel(item.id)}
          >
            <div class="preset-info">
              <span class="preset-name">{item.name}</span>
              <span class="preset-provider">{item.provider}</span>
            </div>
            <p class="preset-desc">{item.description}</p>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  :global(:root) {
    --primary: #6366f1;
    --primary-hover: #4f46e5;
    --bg-surface: #ffffff;
    --bg-app: #f8fafc;
    --text-main: #1e293b;
    --text-muted: #64748b;
    --border-color: #e2e8f0;
    --accent-glow: rgba(99, 102, 241, 0.15);
  }

  .configurator-container {
    max-width: 1200px;
    margin: 40px auto;
    padding: 0 24px;
    font-family: 'Inter', sans-serif;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 24px;
  }

  .title-container {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .icon-glow {
    background: var(--primary);
    color: white;
    padding: 12px;
    border-radius: 16px;
    box-shadow: 0 8px 16px var(--accent-glow);
  }

  .title-text h1 {
    font-size: 32px;
    font-weight: 800;
    color: var(--text-main);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 16px;
    margin: 4px 0 0 0;
  }

  .status-badge {
    background: #f1f5f9;
    padding: 10px 18px;
    border-radius: 99px;
    font-size: 14px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--border-color);
  }

  .status-badge.active {
    background: #ecfdf5;
    border-color: #10b98144;
    color: #065f46;
  }

  .pulse {
    width: 8px;
    height: 8px;
    background: #94a3b8;
    border-radius: 50%;
  }

  .active .pulse {
    background: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 32px;
  }

  .config-card, .presets-card {
    background: var(--bg-surface);
    border-radius: 24px;
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .card-header {
    padding: 24px;
    border-bottom: 1px solid var(--border-color);
    background: #fcfcfd;
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text-main);
  }

  .card-header h2 {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  .card-content {
    padding: 32px;
  }

  .field-description {
    color: var(--text-muted);
    line-height: 1.6;
    margin-bottom: 32px;
    font-size: 15px;
  }

  .input-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 10px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-wrapper input {
    width: 100%;
    padding: 14px 18px;
    padding-right: 48px;
    border: 2px solid var(--border-color);
    border-radius: 14px;
    font-size: 16px;
    transition: all 0.2s;
    outline: none;
    color: var(--text-main);
    background: #fafafa;
  }

  .input-wrapper input:focus {
    border-color: var(--primary);
    background: white;
    box-shadow: 0 0 0 4px var(--accent-glow);
  }

  .input-accent {
    position: absolute;
    right: 18px;
    color: var(--primary);
    opacity: 0.5;
  }

  .actions {
    margin-top: 40px;
    display: flex;
    gap: 16px;
  }

  .btn {
    padding: 14px 24px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
    flex: 1;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }

  .btn-secondary {
    background: #f1f5f9;
    color: var(--text-main);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e2e8f0;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .presets-list {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .preset-item {
    text-align: left;
    padding: 16px;
    border-radius: 16px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .preset-item:hover {
    background: #f8fafc;
    border-color: var(--border-color);
  }

  .preset-item.selected {
    background: #f0f7ff;
    border-color: #3b82f644;
  }

  .preset-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .preset-name {
    font-weight: 700;
    color: var(--text-main);
  }

  .preset-provider {
    font-size: 12px;
    font-weight: 600;
    background: #e2e8f0;
    color: #475569;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .preset-desc {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .error-msg {
    margin-top: 16px;
    padding: 12px;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .success-msg {
    margin-top: 16px;
    padding: 12px;
    background: #f0fdf4;
    color: #16a34a;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .spinner-small {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
</style>
