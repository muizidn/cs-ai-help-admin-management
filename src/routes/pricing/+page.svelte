<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type { PricingConfig, PricingUpdateInput, PricingGroupAssignment } from "$lib/types/pricing"
  import {
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Brain,
    Play,
    FileSearch,
    Database,
    Plus,
    Trash2,
    Edit,
    ArrowLeft,
    Calendar,
    Users,
    User,
    Search,
    X,
    Info
  } from "lucide-svelte"
  import "../global-admin.css"

  // List State
  let configs: PricingConfig[] = []
  let currentConfig: PricingConfig | null = null
  let isEditing = false
  let showCreateModal = false
  let loading = false
  let saving = false
  let error = ""
  let success = ""

  // Group Details State
  let assignments: PricingGroupAssignment[] = []
  let loadingAssignments = false

  // Form state
  let configId: string | null = null
  let groupName = ""
  let expiresAt: string | null = null
  let proOriginal = 0
  let proCurrent = 0
  let proIsDiscounted = false
  let creditPrice = 0
  let creditOriginal = 0
  let creditIsDiscounted = false
  let inferenceCost = 0
  let simulationCost = 0
  let kbParsingCost = 0
  let datasourceExecutionCost = 0
  let inferenceMethodCosts: Record<string, number> = {}
  let showMethodCosts = false
  let proCredits = 0
  let proMultipliersRaw = ""
  let creditMultipliersRaw = ""
  let highlightDuration = 3
  let highlightBadge = "plans.best_value"
  let enabledDurations: number[] = [1]

  // Owner Search
  let ownerSearchQuery = ""
  let ownerSearchType: 'user' | 'organization' = 'user'
  let ownerCandidates: Array<{ id: string, name: string, type: string }> = []
  let isSearchingOwner = false
  let searchTimeout: any

  const possibleDurations = [1, 3, 6, 12, 24]

  function toggleDuration(duration: number, checked: boolean) {
    if (checked) {
      enabledDurations = [...enabledDurations, duration]
    } else {
      enabledDurations = enabledDurations.filter((d) => d !== duration)
    }
  }

  async function loadConfigs() {
    loading = true
    error = ""
    try {
      const response = await apiClient.get("/api/pricing")
      if (response.status === 200 && response.data?.status === "success") {
        configs = response.data.data
      } else {
        error = response.data?.message || "Failed to load pricing configurations"
      }
    } catch (err) {
      error = "An error occurred while loading configurations"
      console.error(err)
    } finally {
      loading = false
    }
  }

  async function fetchAssignments(groupId: string) {
    loadingAssignments = true
    try {
      const response = await apiClient.get(`/api/pricing/assignments?groupId=${groupId}`)
      if (response.status === 200 && response.data?.status === "success") {
        assignments = response.data.data
      }
    } catch (err) {
      console.error("Failed to fetch assignments:", err)
    } finally {
      loadingAssignments = false
    }
  }

  async function startEdit(config: PricingConfig) {
    configId = config.id || null
    groupName = config.name || ""
    expiresAt = config.expiresAt ? new Date(config.expiresAt).toISOString().split('T')[0] : null
    proOriginal = config.proPlan.originalPrice || 0
    proCurrent = config.proPlan.price
    proIsDiscounted = config.proPlan.isDiscounted || false
    creditPrice = config.credits.price
    creditOriginal = config.credits.originalPrice || 0
    creditIsDiscounted = config.credits.isDiscounted || false
    inferenceCost = config.usageCosts.inference
    simulationCost = config.usageCosts.simulation
    kbParsingCost = config.usageCosts.kbParsing
    datasourceExecutionCost = config.usageCosts.datasourceExecution
    inferenceMethodCosts = { ...(config.usageCosts.inferenceByMethod || {}) }
    proCredits = config.proPlan.credits || 0
    proMultipliersRaw = JSON.stringify(config.proPlan.discountMultipliers || {}, null, 2)
    creditMultipliersRaw = JSON.stringify(config.credits.discountMultipliers || {}, null, 2)
    enabledDurations = config.proPlan.enabledDurations || [1]
    highlightDuration = config.proPlan.highlightDuration || 0
    highlightBadge = config.proPlan.highlightBadge || ""
    currentConfig = config
    isEditing = true
    
    if (configId && configId !== 'global') {
        fetchAssignments(configId)
    } else {
        assignments = []
    }
  }

  function closeEdit() {
    isEditing = false
    currentConfig = null
    configId = null
    assignments = []
    loadConfigs()
  }

  async function handleSave() {
    saving = true
    error = ""
    success = ""

    let finalProMultipliers = {}
    let finalCreditMultipliers = {}
    try {
      finalProMultipliers = JSON.parse(proMultipliersRaw)
      finalCreditMultipliers = JSON.parse(creditMultipliersRaw)
    } catch (e) {
      error = "Invalid JSON in multipliers"
      saving = false
      return
    }

    const updateData: PricingUpdateInput = {
      name: groupName || undefined,
      expiresAt: expiresAt || undefined,
      proPlan: { 
        price: proCurrent,
        originalPrice: proOriginal || undefined,
        isDiscounted: proIsDiscounted,
        credits: proCredits,
        discountMultipliers: finalProMultipliers,
        enabledDurations: enabledDurations,
        highlightDuration: highlightDuration,
        highlightBadge: highlightBadge
      },
      credits: {
        price: creditPrice,
        originalPrice: creditOriginal || undefined,
        isDiscounted: creditIsDiscounted,
        discountMultipliers: finalCreditMultipliers
      },
      usageCosts: {
        inference: inferenceCost,
        simulation: simulationCost,
        kbParsing: kbParsingCost,
        datasourceExecution: datasourceExecutionCost,
        inferenceByMethod: Object.fromEntries(
          Object.entries(inferenceMethodCosts).filter(([_, v]) => v !== undefined && v !== null)
        ),
      },
    }

    try {
      const url = configId && configId !== 'global' ? `/api/pricing?id=${configId}` : "/api/pricing"
      const response = await apiClient.patch(url, updateData)
      if (response.status === 200 && response.data?.status === "success") {
        success = "Pricing configuration saved successfully!"
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

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this pricing configuration and all its assignments?")) return
    
    try {
      const response = await apiClient.delete(`/api/pricing?id=${id}`)
      if (response.status === 200 && response.data?.status === "success") {
        loadConfigs()
      } else {
        alert(response.data?.message || "Failed to delete")
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function searchOwners() {
    if (ownerSearchQuery.length < 2) {
      ownerCandidates = []
      return
    }

    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
      isSearchingOwner = true
      try {
        const endpoint = ownerSearchType === "user" ? "/api/users" : "/api/organizations"
        const response = await apiClient.get(`${endpoint}?search=${encodeURIComponent(ownerSearchQuery)}&limit=10`)
        
        if (response.status === 200 && response.data?.status === "success") {
          let items = ownerSearchType === "user" ? response.data.data.items : response.data.data.items
          
          // Filter out already assigned owners
          const filterPromises = items.map(async (item: any) => {
             try {
                const assignRes = await apiClient.get(`/api/pricing/assignments?ownerId=${item.id}`);
                if (assignRes.data?.data) return null; // Already assigned
                return item;
             } catch (e) { return item; }
          });
          const filteredItems = (await Promise.all(filterPromises)).filter(Boolean);
          
          ownerCandidates = filteredItems.map((item: any) => {
              let displayName = item.name;
              if (ownerSearchType === "user" && item.email) {
                  displayName = item.name ? `${item.name} (${item.email})` : item.email;
              } else if (ownerSearchType === "organization" && item.ownerEmail) {
                  displayName = item.name ? `${item.name} (${item.ownerEmail})` : item.ownerEmail;
              }
              return {
                  id: item.id,
                  name: displayName,
                  type: ownerSearchType
              }
          })
        }
      } catch (err) {
        console.error("Error searching owners:", err)
      } finally {
        isSearchingOwner = false
      }
    }, 300)
  }

  async function assignOwner(owner: { id: string, name: string, type: string }) {
    if (!configId) return
    
    try {
        const response = await apiClient.post("/api/pricing/assignments", {
            groupId: configId,
            ownerId: owner.id,
            ownerType: owner.type.toUpperCase(),
            ownerName: owner.name
        })
        
        if (response.status === 200 && response.data?.status === "success") {
            ownerSearchQuery = ""
            ownerCandidates = []
            fetchAssignments(configId)
        } else {
            alert(response.data?.message || "Failed to assign owner. They might already be in a group.")
        }
    } catch (err) {
        console.error("Failed to assign:", err)
    }
  }

  async function removeAssignment(id: string) {
    if (!confirm("Remove this owner from the group?")) return
    try {
        const response = await apiClient.delete(`/api/pricing/assignments?id=${id}`)
        if (response.status === 200 && response.data?.status === "success") {
            if (configId) fetchAssignments(configId)
        }
    } catch (err) {
        console.error("Failed to remove:", err)
    }
  }

  let checkId = ""
  async function checkOwnerGroup() {
    if (!checkId) return
    loading = true
    try {
        const response = await apiClient.get(`/api/pricing/assignments?ownerId=${checkId}`)
        if (response.status === 200 && response.data?.status === "success") {
            if (response.data.data) {
                alert(`Owner belongs to group: ${response.data.data}`)
            } else {
                alert("Owner is not assigned to any group (Global Default applies)")
            }
        }
    } catch (err) {
        console.error(err)
    } finally {
        loading = false
    }
  }

  async function handleCreate() {
    if (!groupName) return alert("Please enter a group name")
    
    saving = true
    try {
        const response = await apiClient.post("/api/pricing", {
            name: groupName,
            expiresAt: expiresAt || undefined
        })
        if (response.status === 200 && response.data?.status === "success") {
            showCreateModal = false
            startEdit(response.data.data)
        } else {
            alert(response.data?.message || "Failed to create")
        }
    } catch (err) {
        console.error(err)
    } finally {
        saving = false
    }
  }

  async function handleInitializeGlobal() {
    if (!confirm("No global pricing configuration found. Initialize with system defaults?")) return
    saving = true
    try {
        const response = await apiClient.patch("/api/pricing", {})
        if (response.status === 200 && response.data?.status === "success") {
            loadConfigs()
            alert("Global pricing initialized with defaults.")
        } else {
            alert(response.data?.message || "Failed to initialize global pricing")
        }
    } catch (err) {
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

  onMount(loadConfigs)
</script>

<svelte:head>
  <title>Pricing Configuration - CS AI Admin</title>
</svelte:head>

<div class="page-container">
  {#if !isEditing}
    <div class="page-header flex justify-between items-center">
      <div>
        <h1>Pricing Configurations</h1>
        <p>Manage global defaults and custom pricing groups</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-ghost flex items-center gap-2" on:click={loadConfigs}>
          <RefreshCw size={18} class={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button class="btn btn-primary flex items-center gap-2" on:click={() => { groupName = ""; expiresAt = null; showCreateModal = true; }}>
          <Plus size={18} />
          Create Custom Group
        </button>
        {#if configs.length > 0 && !configs.some(c => c.isGlobal)}
            <button 
                class="btn btn-warning flex items-center gap-2" 
                on:click={handleInitializeGlobal}
                title="Create the global default pricing"
            >
                <Plus size={18} />
                Initialize Global Default
            </button>
        {/if}
      </div>
    </div>

    <div class="search-owner-box bg-white p-4 rounded-xl shadow-sm border mb-6">
      <div class="flex flex-col flex-1">
        <label for="ownerSearchGlobal" class="text-xs font-bold text-gray-500 uppercase mb-1">Check Owner's Group</label>
        <div class="flex items-center gap-2">
          <div class="flex-1 flex items-center border rounded-lg px-3 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search size={16} class="text-gray-400 mr-2" />
            <input 
              id="ownerSearchGlobal"
              type="text" 
              bind:value={checkId} 
              placeholder="Paste Owner ID (User or Org ID) to find their group..." 
              class="w-full py-2 bg-transparent text-sm focus:outline-none"
            />
          </div>
          <button class="btn btn-primary py-2 px-6" on:click={checkOwnerGroup} disabled={!checkId}>Search</button>
        </div>
      </div>
    </div>

    {#if loading && configs.length === 0}
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading pricing configurations...</p>
      </div>
    {:else if error}
      <div class="error-container">
        <div class="flex items-center gap-2 text-danger mb-4">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
        <button on:click={loadConfigs} class="retry-btn">Retry</button>
      </div>
    {:else}
      {#if configs.length === 0}
        <div class="empty-state-container bg-white rounded-xl shadow-sm border p-12 text-center mt-6">
            <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <DollarSign size={32} />
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-2">No Pricing Configs Found</h2>
            <p class="text-gray-500 mb-8 max-w-sm mx-auto">This appears to be a fresh installation. Please initialize the global pricing configuration to begin.</p>
            <div class="flex flex-col gap-3 max-w-xs mx-auto">
                <button class="btn btn-primary" on:click={handleInitializeGlobal}>Initialize Global Default</button>
                <div class="flex items-center justify-between gap-2 text-xs text-gray-400 px-4">
                    <span class="flex-1 border-t"></span>
                    <span>OR</span>
                    <span class="flex-1 border-t"></span>
                </div>
                <button class="btn btn-ghost border" on:click={() => { groupName = ""; expiresAt = null; showCreateModal = true; }}>Create Custom Group</button>
            </div>
        </div>
      {:else}
        <div class="table-container mt-6">
          <table class="users-table">
            <thead>
              <tr>
                <th>Group Name</th>
                <th>PRO Price</th>
                <th>Credit Price</th>
                <th>Expires At</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
            {#each configs as config}
              <tr class={config.isGlobal ? 'bg-gray-50/50' : ''}>
                <td>
                  {#if config.isGlobal}
                    <div class="flex items-center gap-2">
                       <div class="bg-blue-100 text-blue-600 p-1 rounded"><Users size={16} /></div>
                       <span class="font-bold">Global Default</span>
                    </div>
                  {:else}
                    <div class="flex flex-col">
                      <span class="font-bold text-primary">{config.name}</span>
                      <span class="text-[10px] text-gray-400 font-mono mt-0.5">ID: {config.id}</span>
                    </div>
                  {/if}
                </td>
                <td>
                  <div class="flex flex-col">
                    <span class="font-bold">{formatCurrency(config.proPlan.price)}</span>
                    {#if config.proPlan.isDiscounted}
                      <span class="text-xs text-gray-400 line-through">{formatCurrency(config.proPlan.originalPrice || 0)}</span>
                    {/if}
                  </div>
                </td>
                <td>
                  <div class="flex flex-col">
                    <span class="font-bold">{formatCurrency(config.credits.price)}</span>
                    {#if config.credits.isDiscounted}
                      <span class="text-xs text-gray-400 line-through">{formatCurrency(config.credits.originalPrice || 0)}</span>
                    {/if}
                  </div>
                </td>
                <td>
                  {#if config.expiresAt}
                    <div class="flex items-center gap-1 {new Date(config.expiresAt) < new Date() ? 'text-danger font-bold' : 'text-gray-600'}">
                      <Calendar size={14} />
                      <span class="text-xs">{new Date(config.expiresAt).toLocaleDateString()}</span>
                    </div>
                  {:else}
                    <span class="text-xs text-gray-400">-</span>
                  {/if}
                </td>
                <td>
                  <div class="flex flex-col text-xs text-gray-500">
                    <span>{config.updatedBy}</span>
                    <span>{new Date(config.updatedAt).toLocaleString()}</span>
                  </div>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn btn-sm btn-ghost" on:click={() => startEdit(config)} title="Edit">
                      <Edit size={16} />
                    </button>
                    {#if !config.isGlobal}
                      <button class="btn btn-sm btn-danger-soft" on:click={() => handleDelete(config.id || "")} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div> <!-- end table-container -->
    {/if} <!-- end if configs.length === 0 -->
  {/if} <!-- end if loading -->
{:else} <!-- isEditing else branch -->
    <div class="page-header flex justify-between items-center">
      <div class="flex items-center gap-4">
        <button class="btn btn-ghost p-2 rounded-full hover:bg-gray-100" on:click={closeEdit}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div class="flex items-center gap-2">
            <h1>{currentConfig?.isGlobal ? 'Global Pricing' : groupName || 'Custom Group'}</h1>
            <span class="badge {currentConfig?.isGlobal ? 'badge-primary' : 'badge-warning'}">
              {currentConfig?.isGlobal ? 'Global Default' : 'Custom Group'}
            </span>
          </div>
          <p>
            {#if currentConfig?.isGlobal}
                These settings apply to everyone unless a group assignment exists
            {:else}
                Custom settings for group <b>{groupName}</b>
            {/if}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        {#if success}
          <div class="alert alert-success py-2 px-4 shadow-sm animate-in fade-in slide-in-from-right-4">
            <div class="flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          </div>
        {/if}
        <button
          class="btn btn-primary flex items-center gap-2"
          on:click={handleSave}
          disabled={saving}
        >
          {#if saving}
            <RefreshCw size={18} class="animate-spin" />
            Saving...
          {:else}
            <Save size={18} />
            Save Configuration
          {/if}
        </button>
      </div>
    </div>

    {#if error}
      <div class="alert alert-danger flex items-center gap-2 mb-6">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    {/if}

    <!-- Group Management (Only for Custom) moved from top to bottom -->
      {#if currentConfig && !currentConfig?.isGlobal}
        <div class="settings-card col-span-2 shadow-lg border-primary/20">
            <div class="card-header bg-primary/5">
                <Users size={20} class="text-primary" />
                <h2>Group Management</h2>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label for="editGroupName">Group Name</label>
                    <input id="editGroupName" type="text" bind:value={groupName} class="form-input text-lg font-bold w-full" />
                </div>
                
                <div class="form-group mt-6 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                    <label for="expiresAt" class="text-orange-800">Custom Group Expiration</label>
                    <div class="flex items-center gap-4 mt-2">
                        <input id="expiresAt" type="date" bind:value={expiresAt} class="form-input w-max" />
                        <button class="btn btn-sm btn-ghost" on:click={() => expiresAt = null} disabled={!expiresAt}>Clear</button>
                    </div>
                    <p class="form-help mt-2">If set, members of this group will revert to global pricing after this date.</p>
                </div>
            </div>
        </div>
      {/if}

    <div class="settings-grid my-4">

      <!-- Plan Pricing -->
      <div class="settings-card">
        <div class="card-header">
          <DollarSign size={20} class="text-primary" />
          <h2>PRO Plan Pricing</h2>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label for="proCurrentStandard">Price (Base IDR)</label>
            <input id="proCurrentStandard" type="number" bind:value={proCurrent} class="form-input" />
            <p class="form-help">Visitor pays: {formatCurrency(proCurrent)}</p>
          </div>
          <div class="form-group border-t pt-2 mt-4">
            <div class="flex items-center justify-between mb-2">
              <label for="proOriginal" class="m-0">Compare at Price (Original IDR)</label>
              <label class="switch">
                <input type="checkbox" bind:checked={proIsDiscounted} />
                <span class="slider round"></span>
              </label>
            </div>
            <input 
              id="proOriginal" 
              type="number" 
              bind:value={proOriginal} 
              class="form-input" 
              disabled={!proIsDiscounted}
            />
            <div class="flex items-center gap-2 mt-1">
              <p class="form-help text-xs">Shown as strike-through: {formatCurrency(proOriginal)}</p>
            </div>
          </div>
          <div class="form-group">
            <label for="proCredits">Monthly AI Credits</label>
            <input id="proCredits" type="number" bind:value={proCredits} class="form-input" />
          </div>
          <div class="form-group">
            <label for="proMultipliers">Duration Multipliers (JSON)</label>
            <textarea id="proMultipliers" bind:value={proMultipliersRaw} class="form-input font-mono text-xs" rows="3"></textarea>
          </div>
          <div class="form-group">
            <p class="text-sm font-medium text-gray-700 mb-2">Enabled Durations</p>
            <div class="flex flex-wrap gap-3 mt-2">
              {#each possibleDurations as duration}
                <label class="flex items-center gap-2 text-xs font-normal cursor-pointer bg-gray-50 px-2 py-1 rounded border">
                  <input 
                    type="checkbox" 
                    checked={enabledDurations.includes(duration)}
                    on:change={(e) => toggleDuration(duration, e.currentTarget.checked)}
                  />
                  <span>{duration}M</span>
                </label>
              {/each}
            </div>
          </div>
          
          <div class="form-group border-t pt-4">
            <h3 class="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
              <Info size={14} />
              Plan Highlighting
            </h3>
            <div class="grid grid-cols-2 gap-4">
               <div>
                  <label for="highlightDuration">Highlight Duration (Months)</label>
                  <select id="highlightDuration" bind:value={highlightDuration} class="form-input">
                    <option value={0}>None</option>
                    {#each possibleDurations as duration}
                      <option value={duration}>{duration} Months</option>
                    {/each}
                  </select>
               </div>
               <div>
                  <label for="highlightBadge">Badge Label (i18n key)</label>
                  <input id="highlightBadge" type="text" bind:value={highlightBadge} class="form-input" placeholder="e.g. plans.best_value" />
               </div>
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
            <label for="creditPrice">Price Per Credit (IDR)</label>
            <input id="creditPrice" type="number" bind:value={creditPrice} class="form-input" />
            <p class="form-help">Visitor pays: {formatCurrency(creditPrice)}</p>
          </div>
          <div class="form-group border-t pt-2 mt-4">
            <div class="flex items-center justify-between mb-2">
              <label for="creditOriginal" class="m-0">Original Credit Price (IDR)</label>
              <label class="switch">
                <input type="checkbox" bind:checked={creditIsDiscounted} />
                <span class="slider round"></span>
              </label>
            </div>
            <input
              id="creditOriginal"
              type="number"
              bind:value={creditOriginal}
              class="form-input"
              disabled={!creditIsDiscounted}
            />
          </div>
          <div class="form-group">
            <label for="creditMultipliers">Credit Bulk Multipliers (JSON)</label>
            <textarea id="creditMultipliers" bind:value={creditMultipliersRaw} class="form-input font-mono text-xs" rows="3"></textarea>
          </div>
        </div>
      </div>

      <!-- Usage Costs -->
      <div class="settings-card col-span-2">
        <div class="card-header h-12">
          <Brain size={20} class="text-purple-500" />
          <h2 class="text-sm font-bold uppercase tracking-wider">AI Usage Costs (Credits per operation)</h2>
        </div>
        <div class="card-body grid grid-cols-4 gap-6">
          <div class="form-group">
            <div class="flex items-center gap-2 mb-2">
              <Brain size={16} />
              <label for="inferenceCost" class="m-0 text-xs text-gray-500 uppercase">Inference</label>
            </div>
            <input id="inferenceCost" type="number" bind:value={inferenceCost} class="form-input" />
          </div>
          <div class="form-group">
            <div class="flex items-center gap-2 mb-2">
              <Play size={16} />
              <label for="simulationCost" class="m-0 text-xs text-gray-500 uppercase">Simulation</label>
            </div>
            <input id="simulationCost" type="number" bind:value={simulationCost} class="form-input" />
          </div>
          <div class="form-group">
            <div class="flex items-center gap-2 mb-2">
              <FileSearch size={16} />
              <label for="kbParsingCost" class="m-0 text-xs text-gray-500 uppercase">KB Parsing</label>
            </div>
            <input id="kbParsingCost" type="number" bind:value={kbParsingCost} class="form-input" />
          </div>
          <div class="form-group">
            <div class="flex items-center gap-2 mb-2">
              <Database size={16} />
              <label for="datasourceExecutionCost" class="m-0 text-xs text-gray-500 uppercase">DS Execution</label>
            </div>
            <input id="datasourceExecutionCost" type="number" bind:value={datasourceExecutionCost} class="form-input" />
          </div>
        </div>

        <div class="border-t border-gray-100 mt-4 pt-4 px-6 pb-4">
          <button
            type="button"
            class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 transition-colors"
            on:click={() => (showMethodCosts = !showMethodCosts)}
          >
            <Brain size={14} />
            Per-Method Inference Costs
            <span class="text-gray-300">{showMethodCosts ? '▲' : '▼'}</span>
          </button>
          {#if showMethodCosts}
            <p class="text-[11px] text-gray-400 mt-1 mb-4">Override inference cost per inference method. Leave empty to use the base Inference cost above.</p>
            <div class="grid grid-cols-5 gap-4">
              {#each ["AUTO", "MULTITURN", "SINGLE_TURN", "SEQUENTIAL", "SEQUENTIAL_EVALUATOR"] as method}
                <div class="form-group">
                  <label for="method_{method}" class="m-0 text-[10px] text-gray-500 uppercase font-bold">{method.replace('_', ' ')}</label>
                  <input
                    id="method_{method}"
                    type="number"
                    class="form-input text-sm mt-1"
                    value={inferenceMethodCosts[method] ?? ""}
                    on:input={(e) => {
                      const val = e.currentTarget.value
                      if (val === "") {
                        delete inferenceMethodCosts[method]
                        inferenceMethodCosts = inferenceMethodCosts
                      } else {
                        inferenceMethodCosts = { ...inferenceMethodCosts, [method]: Number(val) }
                      }
                    }}
                    placeholder={String(inferenceCost)}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    </div> <!-- Close settings-grid -->

    {#if currentConfig && !currentConfig?.isGlobal}
    <!-- Assigned Owners -->
        <div class="settings-card col-span-2 shadow-lg border-primary/20">
            <div class="card-header bg-primary/5 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <Users size={20} class="text-primary" />
                    <h2>Assigned Owners ({assignments.length})</h2>
                </div>
            </div>
            <div class="card-body">
                <div class="flex flex-col h-full">
                    <div class="owner-search-box relative mb-4">
                        <div class="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
                            <select bind:value={ownerSearchType} class="bg-gray-50 border-r px-4 py-2 text-sm focus:outline-none">
                                <option value="user">User</option>
                                <option value="organization">Organization</option>
                            </select>
                            <div class="flex-1 flex items-center px-3">
                                <Search size={16} class="text-gray-400 mr-2" />
                                <input 
                                    type="text" 
                                    bind:value={ownerSearchQuery} 
                                    on:input={searchOwners}
                                    placeholder="Search by name or email to add member..." 
                                    class="w-full py-2 text-sm bg-transparent focus:outline-none"
                                />
                            </div>
                        </div>
                        {#if ownerCandidates.length > 0}
                            <div class="search-results absolute w-full z-20 bg-white border rounded shadow-xl mt-1 max-h-60 overflow-y-auto">
                                {#each ownerCandidates.filter(c => !assignments.some(a => a.ownerId === c.id && a.ownerType === c.type)) as c}
                                    <button 
                                        class="w-full text-left p-3 text-sm hover:bg-primary/5 flex items-center justify-between border-b last:border-0"
                                        on:click={() => assignOwner(c)}
                                    >
                                        <div class="flex flex-col">
                                            <span class="font-medium text-gray-800">{c.name || c.id}</span>
                                            <span class="text-xs text-gray-400">{c.id}</span>
                                        </div>
                                        <Plus size={16} class="text-primary" />
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                    
                    <div class="assignments-list flex-1 border rounded-lg bg-gray-50 overflow-y-auto min-h-[250px] max-h-[500px]">
                        {#if loadingAssignments}
                            <div class="p-8 text-center text-sm text-gray-500">Loading members...</div>
                        {:else if assignments.length === 0}
                            <div class="p-8 text-center text-sm text-gray-400 italic flex flex-col items-center gap-2">
                                <Users size={24} class="text-gray-300" />
                                No owners assigned to this group yet
                            </div>
                        {:else}
                            {#each assignments as a}
                                <div class="p-4 border-b flex items-center justify-between bg-white last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            {#if a.ownerType === 'ORGANIZATION'}
                                                <Users size={16} class="text-green-500" />
                                            {:else}
                                                <User size={16} class="text-blue-500" />
                                            {/if}
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="text-sm font-medium text-gray-800">{a.ownerName || a.ownerId}</span>
                                            <span class="text-xs text-gray-400 font-mono italic">{a.ownerId}</span>
                                        </div>
                                    </div>
                                    <button class="p-2 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" on:click={() => removeAssignment(a.id)} title="Remove assignment">
                                        <X size={16} />
                                    </button>
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
  {/if} <!-- Close isEditing -->
</div> <!-- Close page-container -->

<!-- Create Custom Group Modal -->
{#if showCreateModal}
  <div class="modal-overlay">
    <div class="modal-content max-w-md">
      <div class="modal-header">
        <h2>Create Pricing Group</h2>
        <button class="close-btn" on:click={() => (showCreateModal = false)}>&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="createGroupName">Group Name</label>
          <input
            id="createGroupName"
            type="text"
            bind:value={groupName}
            class="form-input"
            placeholder="e.g. Platinum Members"
          />
          <p class="form-help">Enter a descriptive name for this pricing tier.</p>
        </div>

        <div class="form-group mt-4">
          <label for="createExpiresAt">Expiration Date (Optional)</label>
          <input
            id="createExpiresAt"
            type="date"
            bind:value={expiresAt}
            class="form-input"
          />
        </div>
      </div>
      <div class="modal-footer mt-6 flex justify-end gap-3">
        <button class="btn btn-ghost" on:click={() => (showCreateModal = false)}>Cancel</button>
        <button
          class="btn btn-primary px-6"
          on:click={handleCreate}
          disabled={saving || !groupName}
        >
          {saving ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  </div>
{/if}

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
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #f9fafb;
  }
  .card-header h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: #1f2937;
  }
  .card-body {
    padding: 1.25rem 1.5rem;
  }
  .form-group {
    margin-bottom: 1rem;
  }
  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.35rem;
  }
  .form-input {
    width: 100%;
    padding: 0.65rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .form-help {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.35rem;
  }
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    color: #6b7280;
  }
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    margin-bottom: 1rem;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Modal Styles */
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
    backdrop-filter: blur(4px);
  }
  .modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }
  .modal-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #9ca3af;
    cursor: pointer;
  }
  .modal-body {
    padding: 1.5rem;
  }
  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #f3f4f6;
  }

  /* Toggle Switch */
  .switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
  }
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 34px;
  }
  .slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }
  input:checked + .slider {
    background-color: var(--primary-color);
  }
  input:checked + .slider:before {
    transform: translateX(16px);
  }
</style>
