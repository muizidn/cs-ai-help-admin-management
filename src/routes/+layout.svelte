<script lang="ts">
  import "../app.css"
  import { page } from "$app/stores"
  import { Settings, Library } from "lucide-svelte"

  $: currentPath = $page.url.pathname
</script>

<div class="app-layout">
  <nav class="sidebar">
    <div class="sidebar-header">
      <h1 class="app-title">CS AI Admin</h1>
      <p class="app-subtitle">System Management</p>
    </div>

    <div class="nav-menu">
      <a
        href="/system-prompts"
        class="nav-item"
        class:active={currentPath.startsWith("/system-prompts") ||
          currentPath === "/"}
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
        <span>Library Templates</span>
      </a>
    </div>

    <div class="sidebar-footer">
      <p class="version">v1.0.0</p>
    </div>
  </nav>

  <main class="main-content">
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
