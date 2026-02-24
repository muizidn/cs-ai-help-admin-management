<script lang="ts">
  import "../app.css"
  import { page } from "$app/stores"
  import {
    Settings,
    Library,
    Activity,
    Database,
    MessageSquare,
    Users,
    CreditCard,
    Building,
    BarChart3,
    Receipt,
  } from "lucide-svelte"

  $: currentPath = $page.url.pathname
</script>

<div class="app-layout">
  {#if currentPath !== "/login"}
    <nav class="sidebar">
      <div class="sidebar-header">
        <h1 class="app-title">CS AI Admin</h1>
        <p class="app-subtitle">System Management</p>
      </div>

      <div class="nav-menu">
        <a
          href="/user"
          class="nav-item"
          class:active={currentPath.startsWith("/user")}
        >
          <Users size={20} />
          <span>User Management</span>
        </a>

        <a
          href="/billing"
          class="nav-item"
          class:active={currentPath.startsWith("/billing")}
        >
          <Receipt size={20} />
          <span>Billing & Credits</span>
        </a>

        <a
          href="/analytics/ai"
          class="nav-item"
          class:active={currentPath === "/analytics/ai"}
        >
          <BarChart3 size={20} />
          <span>AI Analytics</span>
        </a>

        <div class="nav-divider">System</div>

        <a
          href="/ai-execution-log"
          class="nav-item"
          class:active={currentPath.startsWith("/ai-execution-log")}
        >
          <Activity size={20} />
          <span>Execution Logs</span>
        </a>

        <a
          href="/ai-response-feedback"
          class="nav-item"
          class:active={currentPath.startsWith("/ai-response-feedback")}
        >
          <MessageSquare size={20} />
          <span>Feedback</span>
        </a>

        <a
          href="/system-prompts"
          class="nav-item"
          class:active={currentPath.startsWith("/system-prompts")}
        >
          <Settings size={20} />
          <span>System Prompts</span>
        </a>

        <a
          href="/library-templates"
          class="nav-item"
          class:active={currentPath.startsWith("/library-templates")}
        >
          <Library size={20} />
          <span>Templates</span>
        </a>

        <div class="nav-divider">Configuration</div>

        <a
          href="/organizations"
          class="nav-item"
          class:active={currentPath.startsWith("/organizations")}
        >
          <Building size={20} />
          <span>Organizations</span>
        </a>

        <a
          href="/pricing"
          class="nav-item"
          class:active={currentPath.startsWith("/pricing")}
        >
          <CreditCard size={20} />
          <span>Pricing Settings</span>
        </a>

        <a
          href="/vouchers"
          class="nav-item"
          class:active={currentPath.startsWith("/vouchers")}
        >
          <Database size={20} />
          <span>Vouchers</span>
        </a>

        <a
          href="/transactions"
          class="nav-item"
          class:active={currentPath.startsWith("/transactions")}
        >
          <Receipt size={20} />
          <span>Transactions</span>
        </a>
      </div>

      <div class="sidebar-footer">
        <p class="version">v1.0.0</p>
      </div>
    </nav>
  {/if}

  <main class={currentPath === "/login" ? "w-full" : "main-content"}>
    <slot />
  </main>
</div>

<style>
  .app-layout {
    display: flex;
    height: 100vh;
    background: #f9fafb;
  }

  .sidebar {
    width: 260px;
    background: white;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .sidebar-header {
    padding: 24px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .app-title {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 4px 0;
  }

  .app-subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }

  .nav-menu {
    flex: 1;
    padding: 20px 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    color: #6b7280;
    text-decoration: none;
    transition: all 0.2s;
    border-left: 3px solid transparent;
  }

  .nav-item:hover {
    background: #f9fafb;
    color: #374151;
  }

  .nav-item.active {
    background: #eff6ff;
    color: #2563eb;
    border-left-color: #2563eb;
  }

  .nav-item span {
    font-size: 14px;
    font-weight: 500;
  }

  .nav-divider {
    padding: 1.5rem 1.25rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #94a3b8;
  }

  .sidebar-footer {
    padding: 20px;
    border-top: 1px solid #e5e7eb;
  }

  .version {
    font-size: 12px;
    color: #9ca3af;
    margin: 0;
    text-align: center;
  }

  .main-content {
    flex: 1;
    overflow: auto;
    background: #f9fafb;
  }

  @media (max-width: 768px) {
    .app-layout {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      height: auto;
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
    }

    .sidebar-header {
      padding: 16px 20px;
    }

    .nav-menu {
      padding: 0;
      display: flex;
      overflow-x: auto;
    }

    .nav-item {
      flex-shrink: 0;
      border-left: none;
      border-bottom: 3px solid transparent;
    }

    .nav-item.active {
      border-left: none;
      border-bottom-color: #2563eb;
    }

    .main-content {
      height: auto;
    }
  }
</style>
