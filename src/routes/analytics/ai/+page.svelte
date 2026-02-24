<script lang="ts">
  import { onMount } from "svelte"
  import { apiClient } from "$lib/api-client"
  import type { AiAnalyticsStats } from "$lib/types/analytics"
  import {
    BarChart3,
    TrendingUp,
    Zap,
    Users,
    Brain,
    Calendar,
    ArrowRight,
    Download,
  } from "lucide-svelte"

  let stats: AiAnalyticsStats | null = null
  let loading = false
  let error = ""

  let startDate = ""
  let endDate = ""

  async function loadAnalytics() {
    loading = true
    error = ""
    try {
      const query = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }
      const queryString = apiClient.buildQueryString(query)
      const response = await apiClient.get(`/api/analytics/ai${queryString}`)

      if (response.status === 200 && response.data?.status === "success") {
        stats = response.data.data
      } else {
        error = response.data?.message || "Failed to load analytics"
      }
    } catch (err) {
      error = "An error occurred while loading analytics"
      console.error(err)
    } finally {
      loading = false
    }
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num)
  }

  function formatCurrency(num: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num * 1000) // Assuming 1 credit = 1000 IDR based on PricingService
  }

  onMount(() => {
    // Set default dates (last 30 days)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)

    startDate = start.toISOString().split("T")[0]
    endDate = end.toISOString().split("T")[0]

    loadAnalytics()
  })
</script>

<svelte:head>
  <title>AI Analytics - CS AI Admin</title>
</svelte:head>

<div class="analytics-page">
  <header class="page-header">
    <div class="header-left">
      <div class="breadcrumb">Analytics / AI Usage</div>
      <h1>Performance Insights</h1>
    </div>

    <div class="date-picker">
      <div class="input-group">
        <label for="start">From</label>
        <input
          type="date"
          id="start"
          bind:value={startDate}
          on:change={loadAnalytics}
        />
      </div>
      <div class="input-group">
        <label for="end">To</label>
        <input
          type="date"
          id="end"
          bind:value={endDate}
          on:change={loadAnalytics}
        />
      </div>
      <button class="btn-export">
        <Download size={18} />
      </button>
    </div>
  </header>

  {#if loading}
    <div class="loading-screen">
      <div class="pulse-brain">
        <Brain size={64} />
      </div>
      <h2>Analyzing AI Ecosystem...</h2>
    </div>
  {:else if error}
    <div class="error-screen">
      <p>{error}</p>
      <button class="btn-retry" on:click={loadAnalytics}>Retry Analysis</button>
    </div>
  {:else if stats}
    <!-- Key Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric-card primary">
        <div class="metric-icon"><Zap size={24} /></div>
        <div class="metric-content">
          <span class="metric-label">Total Credits Spent</span>
          <span class="metric-value"
            >{formatNumber(stats.totalCreditSpent)}</span
          >
          <span class="metric-sub"
            >Est. {formatCurrency(stats.totalCreditSpent)}</span
          >
        </div>
        <div class="metric-chart-bg"></div>
      </div>

      <div class="metric-card success">
        <div class="metric-icon"><TrendingUp size={24} /></div>
        <div class="metric-content">
          <span class="metric-label">AI Invocations</span>
          <span class="metric-value"
            >{formatNumber(stats.totalInvocations)}</span
          >
          <span class="metric-sub">Across all endpoints</span>
        </div>
      </div>

      <div class="metric-card info">
        <div class="metric-icon"><Users size={24} /></div>
        <div class="metric-content">
          <span class="metric-label">Active Power Users</span>
          <span class="metric-value">{stats.topUsers.length}</span>
          <span class="metric-sub">Entities with usage</span>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid">
      <!-- Top Users Table -->
      <div class="card usage-table-card">
        <div class="card-header">
          <h3>Top Resource Consumers</h3>
          <p>Users and organizations by credit expenditure</p>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Consumer</th>
                <th>Type</th>
                <th>Invocations</th>
                <th>Credits Spent</th>
                <th>% Total</th>
              </tr>
            </thead>
            <tbody>
              {#each stats.topUsers.slice(0, 10) as user}
                <tr>
                  <td>
                    <div class="user-info">
                      <span class="name">{user.ownerName}</span>
                      <span class="id">{user.ownerId}</span>
                    </div>
                  </td>
                  <td>
                    <span class="type-tag {user.ownerType}"
                      >{user.ownerType}</span
                    >
                  </td>
                  <td>{formatNumber(user.invocations)}</td>
                  <td>
                    <div class="spent-value">
                      <strong>{formatNumber(user.creditSpent)}</strong>
                      <div class="progress-mini">
                        <div
                          class="bar"
                          style="width: {(
                            (user.creditSpent / stats.totalCreditSpent) *
                            100
                          ).toFixed(1)}%"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td
                    >{(
                      (user.creditSpent / stats.totalCreditSpent) *
                      100
                    ).toFixed(1)}%</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Usage by Source -->
      <div class="card source-breakdown">
        <div class="card-header">
          <h3>Service Breakdown</h3>
          <p>Usage distribution by AI module</p>
        </div>
        <div class="source-list">
          {#each Object.entries(stats.usageBySource) as [source, data]}
            <div class="source-item">
              <div class="source-info">
                <span class="source-name">{source.replace(/_/g, " ")}</span>
                <span class="source-count"
                  >{formatNumber(data.count)} calls</span
                >
              </div>
              <div class="source-visual">
                <div class="source-bar-outer">
                  <div
                    class="source-bar-inner"
                    style="width: {(
                      (data.credits / stats.totalCreditSpent) *
                      100
                    ).toFixed(0)}%"
                  ></div>
                </div>
                <span class="source-percent"
                  >{formatNumber(data.credits)} credits</span
                >
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .analytics-page {
    padding: 2.5rem;
    background: #fdfdfd;
    min-height: 100vh;
    font-family: "Outfit", "Inter", sans-serif;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2.5rem;
  }

  .breadcrumb {
    font-size: 0.8125rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .header-left h1 {
    font-size: 2.75rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.04em;
  }

  .date-picker {
    display: flex;
    gap: 1rem;
    background: white;
    padding: 0.75rem;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
    align-items: center;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .input-group label {
    font-size: 0.7rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
  }

  .input-group input {
    border: none;
    font-weight: 600;
    color: #1e293b;
    outline: none;
    font-size: 0.875rem;
  }

  .btn-export {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #64748b;
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-export:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin-bottom: 2.5rem;
  }

  .metric-card {
    position: relative;
    padding: 2rem;
    border-radius: 24px;
    background: white;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
    overflow: hidden;
    border: 1px solid #f8fafc;
  }

  .metric-card.primary {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
  }
  .metric-card.success {
    border-left: 6px solid #10b981;
  }
  .metric-card.info {
    border-left: 6px solid #0ea5e9;
  }

  .metric-icon {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.03);
  }

  .metric-card.primary .metric-icon {
    background: rgba(255, 255, 255, 0.1);
  }
  .metric-card.success .metric-icon {
    background: #ecfdf5;
    color: #059669;
  }
  .metric-card.info .metric-icon {
    background: #f0f9ff;
    color: #0284c7;
  }

  .metric-content {
    display: flex;
    flex-direction: column;
    z-index: 1;
  }

  .metric-label {
    font-size: 0.875rem;
    font-weight: 600;
    opacity: 0.8;
    margin-bottom: 0.25rem;
  }

  .metric-value {
    font-size: 2.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .metric-sub {
    font-size: 0.8125rem;
    opacity: 0.7;
    margin-top: 0.5rem;
    font-weight: 500;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
  }

  .card {
    background: white;
    border-radius: 24px;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
    border: 1px solid #f1f5f9;
  }

  .card-header {
    margin-bottom: 2rem;
  }

  .card-header h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 0.25rem 0;
  }

  .card-header p {
    color: #94a3b8;
    font-size: 0.875rem;
    margin: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    border-bottom: 1px solid #f1f5f9;
  }

  td {
    padding: 1.25rem 1rem;
    border-bottom: 1px solid #f8fafc;
    font-size: 0.9375rem;
  }

  .user-info {
    display: flex;
    flex-direction: column;
  }
  .user-info .name {
    font-weight: 600;
    color: #1e293b;
  }
  .user-info .id {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .type-tag {
    padding: 0.25rem 0.625rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .type-tag.user {
    background: #e0f2fe;
    color: #0369a1;
  }
  .type-tag.organization {
    background: #fae8ff;
    color: #a21caf;
  }

  .spent-value {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .progress-mini {
    width: 60px;
    height: 4px;
    background: #f1f5f9;
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-mini .bar {
    height: 100%;
    background: #3b82f6;
  }

  .source-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .source-item {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .source-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .source-name {
    font-weight: 700;
    color: #334155;
    text-transform: capitalize;
  }

  .source-count {
    font-size: 0.8125rem;
    color: #94a3b8;
    font-weight: 600;
  }

  .source-visual {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .source-bar-outer {
    flex: 1;
    height: 10px;
    background: #f1f5f9;
    border-radius: 5px;
    overflow: hidden;
  }

  .source-bar-inner {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 5px;
  }

  .source-percent {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #475569;
    min-width: 80px;
    text-align: right;
  }

  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10rem 0;
    text-align: center;
  }

  .pulse-brain {
    color: #3b82f6;
    animation: brain-pulse 2s infinite ease-in-out;
  }

  @keyframes brain-pulse {
    0% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0.5;
    }
  }

  @media (max-width: 1024px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }
    .content-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
