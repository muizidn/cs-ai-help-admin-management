<script lang="ts">
  import { onMount } from 'svelte'
  import { Edit, Save, X, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-svelte'
  import type { SystemPromptInfo, SystemPromptUpdate } from '$lib/types/execution-logs'

  let systemPrompts: SystemPromptInfo[] = []
  let loading = true
  let error = ''
  let editingPrompt: SystemPromptInfo | null = null
  let editContent = ''
  let saving = false
  let saveMessage = ''
  let expandedPrompts: Record<string, boolean> = {}

  const promptTypeLabels = {
    'technical': 'Technical System Prompt',
    'admin-behavior': 'Admin Behavior Prompt',
    'business-behavior': 'Business Behavior Prompt'
  }

  const localeLabels = {
    'en': 'English',
    'id': 'Indonesian'
  }

  async function loadSystemPrompts() {
    loading = true
    error = ''
    
    try {
      const response = await fetch('/api/system-prompts-redis')
      const result = await response.json()
      
      if (result.status === 'success') {
        systemPrompts = result.data
      } else {
        error = result.message || 'Failed to load system prompts'
      }
    } catch (err) {
      error = 'Failed to load system prompts'
      console.error('Error loading system prompts:', err)
    } finally {
      loading = false
    }
  }

  async function savePrompt() {
    if (!editingPrompt) return
    
    saving = true
    saveMessage = ''
    
    try {
      const update: SystemPromptUpdate = {
        key: editingPrompt.key,
        content: editContent,
        type: editingPrompt.type,
        locale: editingPrompt.locale,
        business_id: editingPrompt.business_id
      }
      
      const response = await fetch('/api/system-prompts-redis', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      })
      
      const result = await response.json()
      
      if (result.status === 'success') {
        saveMessage = 'Prompt saved successfully!'
        
        // Update the prompt in the list
        const promptIndex = systemPrompts.findIndex(p => p.key === editingPrompt.key)
        if (promptIndex !== -1) {
          systemPrompts[promptIndex] = {
            ...systemPrompts[promptIndex],
            content: editContent,
            exists: true,
            size: editContent.length
          }
          systemPrompts = [...systemPrompts]
        }
        
        // Close editor after a short delay
        setTimeout(() => {
          editingPrompt = null
          editContent = ''
          saveMessage = ''
        }, 1500)
      } else {
        error = result.message || 'Failed to save prompt'
      }
    } catch (err) {
      error = 'Failed to save prompt'
      console.error('Error saving prompt:', err)
    } finally {
      saving = false
    }
  }

  function startEditing(prompt: SystemPromptInfo) {
    editingPrompt = prompt
    editContent = prompt.content || ''
    saveMessage = ''
    error = ''
  }

  function cancelEditing() {
    editingPrompt = null
    editContent = ''
    saveMessage = ''
    error = ''
  }

  function togglePromptExpansion(key: string) {
    expandedPrompts[key] = !expandedPrompts[key]
    expandedPrompts = { ...expandedPrompts }
  }

  function getPromptDisplayName(prompt: SystemPromptInfo) {
    let name = promptTypeLabels[prompt.type] || prompt.type
    if (prompt.locale) {
      name += ` (${localeLabels[prompt.locale] || prompt.locale})`
    }
    if (prompt.business_id) {
      name += ` - Business: ${prompt.business_id}`
    }
    return name
  }

  function getPromptStatusClass(prompt: SystemPromptInfo) {
    return prompt.exists ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
  }

  function formatSize(size: number) {
    if (size < 1024) {
      return `${size} chars`
    } else {
      return `${(size / 1024).toFixed(1)}KB`
    }
  }

  onMount(() => {
    loadSystemPrompts()
  })
</script>

<div class="system-prompts-redis">
  <!-- Header -->
  <div class="header">
    <div class="title-section">
      <h1>System Prompts (Redis)</h1>
      <p>Manage AI system prompts stored in Redis - these are the actual prompts used by the AI inference engine</p>
    </div>
    
    <button class="refresh-btn" on:click={loadSystemPrompts} disabled={loading}>
      <RefreshCw size={20} class={loading ? 'animate-spin' : ''} />
      Refresh
    </button>
  </div>

  <!-- Status Messages -->
  {#if error}
    <div class="error-message">
      <AlertCircle size={20} />
      {error}
    </div>
  {/if}

  {#if saveMessage}
    <div class="success-message">
      <CheckCircle size={20} />
      {saveMessage}
    </div>
  {/if}

  <!-- Prompts List -->
  <div class="prompts-container">
    {#if loading}
      <div class="loading">Loading system prompts...</div>
    {:else if systemPrompts.length > 0}
      <div class="prompts-grid">
        {#each systemPrompts as prompt}
          <div class="prompt-card">
            <div class="prompt-header">
              <div class="prompt-info">
                <h3>{getPromptDisplayName(prompt)}</h3>
                <div class="prompt-meta">
                  <span class="prompt-key">{prompt.key}</span>
                  <span class="prompt-status {getPromptStatusClass(prompt)}">
                    {prompt.exists ? 'Exists' : 'Missing'}
                  </span>
                  {#if prompt.exists}
                    <span class="prompt-size">{formatSize(prompt.size)}</span>
                  {/if}
                </div>
              </div>
              
              <div class="prompt-actions">
                <button 
                  class="action-btn"
                  on:click={() => togglePromptExpansion(prompt.key)}
                  title={expandedPrompts[prompt.key] ? 'Hide content' : 'Show content'}
                >
                  <svelte:component this={expandedPrompts[prompt.key] ? EyeOff : Eye} size={16} />
                </button>
                
                <button 
                  class="action-btn edit-btn"
                  on:click={() => startEditing(prompt)}
                  title="Edit prompt"
                >
                  <Edit size={16} />
                </button>
              </div>
            </div>

            {#if expandedPrompts[prompt.key] && prompt.content}
              <div class="prompt-content">
                <pre>{prompt.content}</pre>
              </div>
            {/if}

            {#if !prompt.exists}
              <div class="prompt-warning">
                <AlertCircle size={16} />
                This prompt is missing from Redis. The AI system may use default fallback prompts.
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <AlertCircle size={48} />
        <h3>No system prompts found</h3>
        <p>Unable to load system prompts from Redis</p>
      </div>
    {/if}
  </div>

  <!-- Edit Modal -->
  {#if editingPrompt}
    <div class="modal-overlay" on:click={cancelEditing}>
      <div class="modal" on:click|stopPropagation>
        <div class="modal-header">
          <h2>Edit {getPromptDisplayName(editingPrompt)}</h2>
          <button class="close-btn" on:click={cancelEditing}>
            <X size={20} />
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="prompt-content">Prompt Content</label>
            <textarea
              id="prompt-content"
              bind:value={editContent}
              placeholder="Enter the system prompt content..."
              rows="20"
            ></textarea>
            <div class="char-count">
              {editContent.length.toLocaleString()} characters
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" on:click={cancelEditing} disabled={saving}>
            Cancel
          </button>
          <button class="save-btn" on:click={savePrompt} disabled={saving || !editContent.trim()}>
            {#if saving}
              <RefreshCw size={16} class="animate-spin" />
              Saving...
            {:else}
              <Save size={16} />
              Save Prompt
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .system-prompts-redis {
    padding: 2rem;
    max-width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .title-section h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .title-section p {
    color: #6b7280;
    font-size: 1rem;
    max-width: 600px;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .refresh-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .refresh-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .error-message,
  .success-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .success-message {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }

  .prompts-container {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .prompts-grid {
    display: grid;
    gap: 1px;
    background: #e5e7eb;
  }

  .prompt-card {
    background: white;
    padding: 1.5rem;
  }

  .prompt-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .prompt-info h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .prompt-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .prompt-key {
    font-family: monospace;
    font-size: 0.75rem;
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    color: #374151;
  }

  .prompt-status {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-weight: 500;
  }

  .prompt-size {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .prompt-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
    color: #6b7280;
  }

  .action-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .edit-btn:hover {
    background: #eff6ff;
    color: #3b82f6;
  }

  .prompt-content {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .prompt-content pre {
    font-family: monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #1e293b;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }

  .prompt-warning {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 0.375rem;
    padding: 0.75rem;
    font-size: 0.875rem;
    color: #92400e;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .empty-state h3 {
    margin: 1rem 0 0.5rem;
    color: #374151;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background: white;
    border-radius: 0.5rem;
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: none;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    color: #6b7280;
  }

  .close-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .modal-body {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-group textarea {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.75rem;
    font-family: monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    resize: vertical;
    min-height: 400px;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .char-count {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.5rem;
    text-align: right;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .cancel-btn,
  .save-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .cancel-btn {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;
  }

  .cancel-btn:hover:not(:disabled) {
    background: #f9fafb;
  }

  .save-btn {
    background: #3b82f6;
    border: 1px solid #3b82f6;
    color: white;
  }

  .save-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .cancel-btn:disabled,
  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
