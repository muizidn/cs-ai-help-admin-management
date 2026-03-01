<script lang="ts">
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { apiClient } from "$lib/api-client"
  import type { Voucher } from "$lib/types/voucher"
  import {
    ChevronLeft,
    Ticket,
    Calendar,
    Users,
    CreditCard,
    TrendingUp,
    Edit,
    Settings,
  } from "lucide-svelte"
  import "../../global-admin.css"

  const { id } = $page.params
  let voucher: Voucher | null = null
  let transactions: any[] = []
  let loading = true
  let error = ""
  let showEditModal = false
  let isSubmitting = false
  let editVoucherData: any = {}

  async function loadData() {
    loading = true
    try {
      const [vRes, tRes] = await Promise.all([
        apiClient.get(`/api/vouchers/${id}`),
        apiClient.get(`/api/vouchers/${id}/transactions`)
      ])

      if (vRes.status === 200 && vRes.data?.status === "success") {
        voucher = vRes.data.data
      } else {
        error = vRes.data?.message || "Voucher not found"
      }

      if (tRes.status === 200 && tRes.data?.status === "success") {
        transactions = tRes.data.data
      }
    } catch (err) {
      error = "An error occurred while loading data"
      console.error(err)
    } finally {
      loading = false
    }
  }

  function formatDate(date: string | Date | null): string {
    if (!date) return "-"
    return new Date(date).toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  function openEditModal() {
    if (!voucher) return
    editVoucherData = {
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxRedemptionGlobal: voucher.maxRedemptionGlobal ?? voucher.maxRedemption ?? 0,
      maxRedemptionPerOwner: voucher.maxRedemptionPerOwner ?? 1,
      isActive: voucher.isActive,
      showInSettings: voucher.showInSettings,
      expiresAt: voucher.expiresAt ? new Date(voucher.expiresAt).toISOString().split('T')[0] : null,
      targetType: voucher.targetType || "BOTH",
      applicablePlanType: voucher.applicablePlanType || "BOTH",
      ownerId: voucher.ownerId || ""
    }
    showEditModal = true
  }

  async function handleUpdateVoucher() {
    if (!voucher) return
    isSubmitting = true
    try {
      const payload = {
        ...editVoucherData,
        ownerId: editVoucherData.ownerId || null
      }
      const response = await apiClient.patch(`/api/vouchers/${voucher.id}`, payload)
      if (response.status === 200 && response.data?.status === "success") {
        showEditModal = false
        loadData() // Refresh page
      } else {
        alert(response.data?.message || "Failed to update voucher")
      }
    } catch (err) {
      console.error("Error updating voucher:", err)
      alert("An error occurred")
    } finally {
      isSubmitting = false
    }
  }

  onMount(loadData)
</script>

<svelte:head>
  <title>Voucher Details - {voucher?.code || 'Loading...'}</title>
</svelte:head>

<div class="page-container">
  <div class="page-header">
    <a href="/vouchers" class="back-link flex items-center gap-1 mb-4 text-gray-500 hover:text-blue-600 transition-colors">
      <ChevronLeft size={16} />
      Back to Vouchers
    </a>
    <div class="flex justify-between items-start">
      <div>
        <div class="flex items-center gap-3">
          <Ticket size={32} class="text-blue-600" />
          <h1 class="text-3xl font-mono font-black">{voucher?.code || '...'}</h1>
          {#if voucher}
            <span class="badge {voucher.isActive ? 'badge-success' : 'badge-danger'}">
              {voucher.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          {/if}
          <button class="btn btn-sm btn-ghost flex items-center gap-1" on:click={openEditModal}>
            <Edit size={14} />
            Edit Voucher
          </button>
        </div>
        <p class="text-gray-500 mt-1">Voucher usage and transaction history</p>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading voucher details...</p>
    </div>
  {:else if error}
    <div class="error-container p-8 text-center bg-red-50 rounded-xl border border-red-100">
      <p class="text-red-600 font-bold mb-4">{error}</p>
      <a href="/vouchers" class="btn btn-primary">Return to List</a>
    </div>
  {:else if voucher}
    {@const globalLimit = voucher.maxRedemptionGlobal ?? voucher.maxRedemption ?? 0}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- General Info -->
      <div class="card p-6 border-l-4 border-blue-500">
        <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <TrendingUp size={16} />
          Discount Configuration
        </h3>
        <div class="space-y-4">
          <div>
            <div class="text-xs text-gray-400">Type</div>
            <div class="font-bold">{voucher.discountType}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Value</div>
            <div class="text-3xl font-black text-blue-700">
              {voucher.discountType === 'PERCENTAGE' ? `${voucher.discountValue}%` : `IDR ${voucher.discountValue.toLocaleString()}`}
            </div>
          </div>
        </div>
      </div>

      <!-- Usage Info -->
      <div class="card p-6 border-l-4 border-green-500">
        <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <Calendar size={16} />
          Usage Statistics
        </h3>
        <div class="space-y-4">
          <div>
            <div class="text-xs text-gray-400">Total Redemptions</div>
            <div class="text-3xl font-black text-green-700">{voucher.usedCount} <span class="text-sm text-gray-400 font-normal">/ {globalLimit > 0 ? globalLimit : '∞'}</span></div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Progress (Global Stock)</div>
            <div class="w-full bg-gray-100 h-2 rounded-full mt-2 overflow-hidden shadow-inner">
               <div class="bg-green-500 h-full transition-all duration-700" style="width: {globalLimit > 0 ? Math.min(100, (voucher.usedCount / globalLimit) * 100) : 0}%"></div>
            </div>
          </div>
          <div class="pt-2 border-t border-gray-100">
             <div class="text-xs text-gray-400 uppercase tracking-widest text-[9px] font-bold">Policy</div>
             <div class="font-bold text-lg text-green-800">
               {voucher.maxRedemptionPerOwner > 0 ? `${voucher.maxRedemptionPerOwner} Redemptions per User/Org` : 'Unlimited per User/Org'}
             </div>
          </div>
        </div>
      </div>

      <!-- Scope Info -->
      <div class="card p-6 border-l-4 border-purple-500">
        <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <Users size={16} />
          Accessibility
        </h3>
        <div class="space-y-4">
          <div>
            <div class="text-xs text-gray-400">Target Owner</div>
            <div class="font-mono text-sm break-all font-bold">
              {voucher.ownerId || 'PUBLIC (All Users)'}
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Visibility</div>
            <div class="flex flex-col gap-2 mt-1">
               <span class="badge {voucher.showInSettings ? 'badge-primary' : 'badge-ghost'}">
                 {voucher.showInSettings ? 'Settings Page Visible' : 'Hidden from Settings'}
               </span>
               <span class="badge {voucher.targetType === 'PERSONAL' ? 'badge-warning' : voucher.targetType === 'ORGANIZATION' ? 'badge-info' : 'badge-success'}">
                 Target: {voucher.targetType === 'PERSONAL' ? 'Personal Only' : voucher.targetType === 'ORGANIZATION' ? 'Organization Only' : 'Personal & Org'}
               </span>
               <span class="badge {voucher.applicablePlanType === 'SUBSCRIPTION' ? 'badge-primary' : voucher.applicablePlanType === 'CREDIT' ? 'badge-warning' : 'badge-ghost'}">
                 Usage: {voucher.applicablePlanType === 'SUBSCRIPTION' ? 'Subscriptions Only' : voucher.applicablePlanType === 'CREDIT' ? 'Credits Only' : 'Subscriptions & Credits'}
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <CreditCard size={20} />
          Transaction History
        </h2>
        <span class="badge badge-primary">{transactions.length} Transactions</span>
      </div>
      
      {#if transactions.length > 0}
        <div class="table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>Owner (Org/User)</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {#each transactions as tx}
                <tr>
                  <td>{formatDate(tx.createdAt)}</td>
                  <td class="font-mono text-xs">{tx.id}</td>
                  <td>
                    <div class="text-xs font-mono">{tx.organizationId || tx.userId}</div>
                    <div class="text-[10px] text-gray-400 uppercase tracking-tighter">
                      {tx.organizationId ? 'Organization' : 'User'}
                    </div>
                  </td>
                  <td>
                    <div class="font-bold">IDR {tx.amount.toLocaleString()}</div>
                    {#if tx.metadata?.originalAmount}
                      <div class="text-[10px] text-gray-400 line-through">IDR {tx.metadata.originalAmount.toLocaleString()}</div>
                    {/if}
                  </td>
                  <td>
                    <span class="badge {tx.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                      {tx.status}
                    </span>
                  </td>
                  <td>
                    <a href="/transactions/{tx.id}" class="btn btn-sm btn-ghost">View</a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="p-12 text-center text-gray-400 italic">
          No transactions have used this voucher yet.
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Edit Modal -->
{#if showEditModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Voucher: {voucher?.code}</h2>
        <button class="close-btn" on:click={() => (showEditModal = false)}
          >&times;</button
        >
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="editVoucherCode">Voucher Code</label>
          <input
            id="editVoucherCode"
            type="text"
            bind:value={editVoucherData.code}
            class="form-input uppercase"
          />
        </div>

        <div class="form-group">
          <label for="editOwnerId">Owner ID (Optional)</label>
          <input
            id="editOwnerId"
            type="text"
            bind:value={editVoucherData.ownerId}
            placeholder="User or Org ID"
            class="form-input"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="editDiscountType">Discount Type</label>
            <select id="editDiscountType" bind:value={editVoucherData.discountType} class="form-input">
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="AMOUNT">Fixed Amount (IDR)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editDiscountValue">Value</label>
            <input
              id="editDiscountValue"
              type="number"
              bind:value={editVoucherData.discountValue}
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="editMaxRedemptionGlobal">Total Availability (Global Stock)</label>
            <input
              id="editMaxRedemptionGlobal"
              type="number"
              bind:value={editVoucherData.maxRedemptionGlobal}
              class="form-input"
              placeholder="0 = Unlimited"
            />
          </div>
          <div class="form-group">
            <label for="editMaxRedemptionPerOwner">Max Limits Per Owner</label>
            <input
              id="editMaxRedemptionPerOwner"
              type="number"
              bind:value={editVoucherData.maxRedemptionPerOwner}
              class="form-input"
              placeholder="0 = Unlimited"
            />
          </div>
        </div>

        <div class="form-group mt-4">
          <label for="editExpiresAt">Expires At (Optional)</label>
          <input
            id="editExpiresAt"
            type="date"
            bind:value={editVoucherData.expiresAt}
            class="form-input"
          />
        </div>

        <div class="form-row mt-4">
          <div class="form-group">
            <label for="editTargetType">Target Account Level</label>
            <select id="editTargetType" bind:value={editVoucherData.targetType} class="form-input">
              <option value="BOTH">Personal & Organization (Both)</option>
              <option value="PERSONAL">Personal Only</option>
              <option value="ORGANIZATION">Organization Only</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editApplicablePlanType">Applicable Plan Type</label>
            <select id="editApplicablePlanType" bind:value={editVoucherData.applicablePlanType} class="form-input">
              <option value="BOTH">All Plan Types (Both)</option>
              <option value="SUBSCRIPTION">Subscriptions Only</option>
              <option value="CREDIT">Credits Only</option>
            </select>
          </div>
        </div>

        <div class="form-row mt-4">
          <div class="form-group flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsActive"
              bind:checked={editVoucherData.isActive}
            />
            <label for="editIsActive">Active</label>
          </div>
          <div class="form-group flex items-center gap-2">
            <input
              type="checkbox"
              id="editShowInSettings"
              bind:checked={editVoucherData.showInSettings}
            />
            <label for="editShowInSettings">Show in Settings Page</label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" on:click={() => (showEditModal = false)}
          >Cancel</button
        >
        <button
          class="btn btn-primary"
          on:click={handleUpdateVoucher}
          disabled={isSubmitting || !editVoucherData.code}
        >
          {isSubmitting ? "Updating..." : "Update Voucher"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
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
  }
  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
  }
  .form-group {
    margin-bottom: 1rem;
  }
  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  .uppercase {
    text-transform: uppercase;
  }
  .mt-4 { margin-top: 1rem; }
  .gap-2 { gap: 0.5rem; }
  .back-link {
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
  }
  .card {
     background: white;
     border-radius: 12px;
     border: 1px solid #e5e7eb;
     box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .grid {
    display: grid;
  }
</style>
