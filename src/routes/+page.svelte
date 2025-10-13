<script lang="ts">
  import { Settings, Library, Plus } from "lucide-svelte"
</script>

<div class="dashboard">
  <div class="dashboard-header">
    <h1>CS AI System Management</h1>
    <p>Manage system prompts and library templates for your AI application</p>
  </div>

  <div class="dashboard-grid">
    <!-- System Prompts Card -->
    <a href="/system-prompts" class="dashboard-card">
      <div class="card-icon">
        <Settings size={32} />
      </div>
      <div class="card-content">
        <h3>System Prompts</h3>
        <p>Manage AI system prompts and instructions</p>
      </div>
    </a>

    <!-- Library Templates Card -->
    <a href="/library-templates" class="dashboard-card">
      <div class="card-icon">
        <Library size={32} />
      </div>
      <div class="card-content">
        <h3>Library Templates</h3>
        <p>Create and manage reusable library templates</p>
      </div>
    </a>
  </div>

  <div class="quick-actions">
    <h2>Quick Actions</h2>
    <div class="actions-grid">
      <a href="/system-prompts" class="action-button">
        <Plus size={20} />
        <span>New System Prompt</span>
      </a>
      <a href="/library-templates" class="action-button">
        <Plus size={20} />
        <span>New Library Template</span>
      </a>
    </div>
  </div>
</div>

<style>
  .dashboard {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 48px;
  }

  .dashboard-header h1 {
    font-size: 32px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 8px 0;
  }

  .dashboard-header p {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    margin-bottom: 48px;
  }

  .dashboard-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 24px;
    text-decoration: none;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dashboard-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);
  }

  .card-icon {
    color: #3b82f6;
    flex-shrink: 0;
  }

  .card-content h3 {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 4px 0;
  }

  .card-content p {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }

  .quick-actions {
    border-top: 1px solid #e5e7eb;
    padding-top: 32px;
  }

  .quick-actions h2 {
    font-size: 20px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 16px 0;
  }

  .actions-grid {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .action-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #3b82f6;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .action-button:hover {
    background: #2563eb;
  }

  @media (max-width: 768px) {
    .dashboard {
      padding: 16px;
    }

    .dashboard-header {
      margin-bottom: 32px;
    }

    .dashboard-header h1 {
      font-size: 24px;
    }

    .dashboard-grid {
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }

    .dashboard-card {
      padding: 16px;
    }

    .actions-grid {
      flex-direction: column;
    }

    .action-button {
      justify-content: center;
    }
  }
</style>
