<script lang="ts">
  import { createEventDispatcher } from "svelte"
  import { apiClient } from "$lib/api-client"

  export let userId: string
  export let currentCredit: number
  export let userName: string

  const dispatch = createEventDispatcher()

  let editMode = false
  let editValue = currentCredit
  let saving = false
  let error = ""

  function startEdit() {
    editMode = true
    editValue = currentCredit
    error = ""
  }

  function cancelEdit() {
    editMode = false
    editValue = currentCredit
    error = ""
  }

  async function saveCredit() {
    if (editValue < 0) {
      error = "Credit balance cannot be negative"
      return
    }

    saving = true
    error = ""

    try {
      const response = await apiClient.put(`/api/user-billing/${userId}/credit`, {
        creditBalance: editValue
      })

      if (response.status === 200 && response.data?.status === "success") {
        editMode = false
        dispatch("updated", { userId, newCredit: editValue })
      } else {
        error = response.data?.message || "Failed to update credit"
      }
    } catch (err) {
      error = "An error occurred while updating credit"
      console.error("Error updating credit:", err)
    } finally {
      saving = false
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      saveCredit()
    } else if (event.key === "Escape") {
      cancelEdit()
    }
  }

  // Format currency
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }
</script>

<div class="credit-editor">
  {#if editMode}
    <div class="edit-form">
      <input
        type="number"
        bind:value={editValue}
        on:keydown={handleKeydown}
        min="0"
        step="1000"
        class="credit-input"
        disabled={saving}
        placeholder="Enter credit amount"
      />
      <div class="edit-actions">
        <button
          on:click={saveCredit}
          disabled={saving}
          class="btn btn-sm btn-success"
          title="Save"
        >
          {saving ? "..." : "✓"}
        </button>
        <button
          on:click={cancelEdit}
          disabled={saving}
          class="btn btn-sm btn-secondary"
          title="Cancel"
        >
          ✕
        </button>
      </div>
    </div>
    {#if error}
      <div class="error-text">{error}</div>
    {/if}
  {:else}
    <div class="credit-display" on:click={startEdit} role="button" tabindex="0" on:keydown={(e) => e.key === "Enter" && startEdit()}>
      <span class="credit-amount">{formatCurrency(currentCredit)}</span>
      <span class="edit-hint">Click to edit</span>
    </div>
  {/if}
</div>

<style>
  .credit-editor {
    position: relative;
  }

  .credit-display {
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .credit-display:hover {
    background: #f3f4f6;
  }

  .credit-amount {
    font-weight: 700;
    color: #059669;
    font-size: 1rem;
  }

  .edit-hint {
    font-size: 0.75rem;
    color: #9ca3af;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .credit-display:hover .edit-hint {
    opacity: 1;
  }

  .edit-form {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .credit-input {
    width: 120px;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .credit-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .edit-actions {
    display: flex;
    gap: 0.25rem;
  }

  .btn {
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
    color: #374151;
    min-width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .btn-success {
    background: #10b981;
    color: white;
    border-color: #10b981;
  }

  .btn-success:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
    border-color: #6b7280;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #4b5563;
    border-color: #4b5563;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-text {
    font-size: 0.75rem;
    color: #dc2626;
    margin-top: 0.25rem;
  }
</style>
