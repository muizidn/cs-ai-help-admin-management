<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, 
    MessageSquare, Database, Zap, ExternalLink, Copy,
    ChevronDown, ChevronRight
  } from 'lucide-svelte'
  import type { ExecutionLogDetail } from '$lib/types/execution-logs'

  export let executionId: string

  let executionLog: ExecutionLogDetail | null = null
  let loading = true
  let error = ''
  let expandedSteps: Record<string, boolean> = {}
  let expandedStepTypes: Record<string, boolean> = {}

  const stepTypeLabels: Record<string, string> = {
    'api_invocation': 'API Invocation',
    'llm_query': 'LLM Query',
    'llm_response': 'LLM Response',
    'callback_request': 'Callback Request',
    'callback_response': 'Callback Response',
    'workflow_step': 'Workflow Step',
    'error': 'Error',
    'unknown': 'Unknown'
  }

  const stepTypeIcons: Record<string, any> = {
    'api_invocation': ExternalLink,
    'llm_query': MessageSquare,
    'llm_response': MessageSquare,
    'callback_request': Database,
    'callback_response': Database,
    'workflow_step': Zap,
    'error': AlertCircle,
    'unknown': AlertCircle
  }

  async function loadExecutionLog() {
    loading = true
    error = ''
    
    try {
      const response = await fetch(`/api/ai-execution-log/${executionId}`)
      const result = await response.json()
      
      if (result.status === 'success') {
        executionLog = result.data
        
        // Initialize expanded state for step types that have steps
        Object.keys(result.data.steps_by_type).forEach(stepType => {
          if (result.data.steps_by_type[stepType].length > 0) {
            expandedStepTypes[stepType] = true
          }
        })
      } else {
        error = result.message || 'Failed to load execution log'
      }
    } catch (err) {
      error = 'Failed to load execution log'
      console.error('Error loading execution log:', err)
    } finally {
      loading = false
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'running':
        return Clock
      case 'completed':
        return CheckCircle
      case 'failed':
        return XCircle
      default:
        return AlertCircle
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-100'
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  function getLevelClass(level: string) {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'debug':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  function toggleStep(stepId: string) {
    expandedSteps[stepId] = !expandedSteps[stepId]
    expandedSteps = { ...expandedSteps }
  }

  function toggleStepType(stepType: string) {
    expandedStepTypes[stepType] = !expandedStepTypes[stepType]
    expandedStepTypes = { ...expandedStepTypes }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  function formatJson(obj: any) {
    return JSON.stringify(obj, null, 2)
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  function formatDuration(durationMs?: number) {
    if (!durationMs) return 'N/A'
    
    if (durationMs < 1000) {
      return `${durationMs}ms`
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  onMount(() => {
    loadExecutionLog()
  })
</script>

<div class="execution-log-detail">
  {#if loading}
    <div class="loading">Loading execution log details...</div>
  {:else if error}
    <div class="error">
      <AlertCircle size={20} />
      {error}
    </div>
  {:else if executionLog}
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <a href="/ai-execution-log" class="back-btn">
          <ArrowLeft size={20} />
          Back to Execution Logs
        </a>
        
        <div class="status-badge {getStatusClass(executionLog.status)}">
          <svelte:component this={getStatusIcon(executionLog.status)} size={16} />
          {executionLog.status}
        </div>
      </div>
      
      <h1>Execution Log Details</h1>
      <p>Execution ID: <code>{executionLog.execution_id}</code></p>
    </div>

    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Basic Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>Conversation ID</label>
            <span class="mono">{executionLog.conversation_id}</span>
          </div>
          <div class="info-item">
            <label>Context</label>
            <span>{executionLog.context}</span>
          </div>
          <div class="info-item">
            <label>Business ID</label>
            <span>{executionLog.business_id || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div class="summary-card">
        <h3>Timing</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>Start Time</label>
            <span>{executionLog.formatted_start_time}</span>
          </div>
          <div class="info-item">
            <label>End Time</label>
            <span>{executionLog.formatted_end_time || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Duration</label>
            <span>{executionLog.formatted_duration || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div class="summary-card">
        <h3>Steps Summary</h3>
        <div class="steps-summary">
          <div class="step-count">
            <span class="count">{executionLog.steps.length}</span>
            <span class="label">Total Steps</span>
          </div>
          {#each Object.entries(executionLog.steps_by_type) as [stepType, steps]}
            {#if steps.length > 0}
              <div class="step-type-count">
                <span class="count">{steps.length}</span>
                <span class="label">{stepTypeLabels[stepType]}</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </div>

    <!-- Original Message -->
    <div class="section">
      <h2>Original Message</h2>
      <div class="message-card">
        <p>{executionLog.original_message}</p>
        <button class="copy-btn" on:click={() => copyToClipboard(executionLog.original_message)}>
          <Copy size={16} />
          Copy
        </button>
      </div>
    </div>

    <!-- Final Response -->
    {#if executionLog.final_response}
      <div class="section">
        <h2>Final Response</h2>
        <div class="response-card">
          <p>{executionLog.final_response}</p>
          <button class="copy-btn" on:click={() => copyToClipboard(executionLog.final_response)}>
            <Copy size={16} />
            Copy
          </button>
        </div>
      </div>
    {/if}

    <!-- Error Message -->
    {#if executionLog.error_message}
      <div class="section">
        <h2>Error Message</h2>
        <div class="error-card">
          <p>{executionLog.error_message}</p>
        </div>
      </div>
    {/if}

    <!-- Execution Steps -->
    <div class="section">
      <h2>Execution Steps</h2>
      
      {#each Object.entries(executionLog.steps_by_type) as [stepType, steps]}
        {#if steps.length > 0}
          <div class="step-type-section">
            <button 
              class="step-type-header"
              on:click={() => toggleStepType(stepType)}
            >
              <svelte:component this={stepTypeIcons[stepType]} size={20} />
              <span>{stepTypeLabels[stepType]} ({steps.length})</span>
              <svelte:component 
                this={expandedStepTypes[stepType] ? ChevronDown : ChevronRight} 
                size={16} 
              />
            </button>
            
            {#if expandedStepTypes[stepType]}
              <div class="steps-list">
                {#each steps as step}
                  <div class="step-card">
                    <div class="step-header">
                      <div class="step-info">
                        <span class="step-id">{step.id}</span>
                        <span class="step-level {getLevelClass(step.level)}">{step.level}</span>
                        <span class="step-time">{formatDateTime(step.timestamp)}</span>
                        {#if step.duration_ms}
                          <span class="step-duration">{formatDuration(step.duration_ms)}</span>
                        {/if}
                      </div>
                      <button 
                        class="expand-btn"
                        on:click={() => toggleStep(step.id)}
                      >
                        <svelte:component 
                          this={expandedSteps[step.id] ? ChevronDown : ChevronRight} 
                          size={16} 
                        />
                      </button>
                    </div>
                    
                    <div class="step-message">{step.message}</div>
                    
                    {#if expandedSteps[step.id]}
                      <div class="step-details">
                        {#if step.payload}
                          <div class="detail-section">
                            <h4>Payload</h4>
                            <pre class="json-display">{formatJson(step.payload)}</pre>
                          </div>
                        {/if}
                        
                        {#if step.response}
                          <div class="detail-section">
                            <h4>Response</h4>
                            <pre class="json-display">{formatJson(step.response)}</pre>
                          </div>
                        {/if}
                        
                        {#if step.error}
                          <div class="detail-section">
                            <h4>Error</h4>
                            <div class="error-text">{step.error}</div>
                          </div>
                        {/if}
                        
                        {#if step.metadata}
                          <div class="detail-section">
                            <h4>Metadata</h4>
                            <pre class="json-display">{formatJson(step.metadata)}</pre>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .execution-log-detail {
    padding: 2rem;
    max-width: 100%;
  }

  .header {
    margin-bottom: 2rem;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
    background: white;
  }

  .back-btn:hover {
    background: #f9fafb;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .header p {
    color: #6b7280;
    font-size: 1rem;
  }

  .header code {
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .summary-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .summary-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .info-grid {
    display: grid;
    gap: 1rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-item label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }

  .info-item span {
    font-size: 0.875rem;
    color: #1f2937;
  }

  .mono {
    font-family: monospace;
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .steps-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .step-count,
  .step-type-count {
    text-align: center;
  }

  .count {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .label {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .message-card,
  .response-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    position: relative;
  }

  .message-card p,
  .response-card p {
    margin: 0;
    line-height: 1.6;
    color: #1f2937;
  }

  .copy-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    color: #6b7280;
  }

  .copy-btn:hover {
    background: #e5e7eb;
  }

  .error-card {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .error-card p {
    margin: 0;
    color: #dc2626;
  }

  .step-type-section {
    margin-bottom: 1.5rem;
  }

  .step-type-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  .step-type-header:hover {
    background: #f3f4f6;
  }

  .steps-list {
    margin-top: 0.5rem;
    padding-left: 1rem;
  }

  .step-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
    overflow: hidden;
  }

  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #fafafa;
    border-bottom: 1px solid #e5e7eb;
  }

  .step-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .step-id {
    font-family: monospace;
    font-size: 0.75rem;
    background: #e5e7eb;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .step-level {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .step-time,
  .step-duration {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 0.25rem;
  }

  .step-message {
    padding: 1rem;
    color: #1f2937;
    line-height: 1.5;
  }

  .step-details {
    padding: 0 1rem 1rem;
    border-top: 1px solid #f3f4f6;
  }

  .detail-section {
    margin-bottom: 1rem;
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .detail-section h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .json-display {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    padding: 1rem;
    font-family: monospace;
    font-size: 0.75rem;
    overflow-x: auto;
    white-space: pre-wrap;
    color: #1e293b;
  }

  .error-text {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    padding: 1rem;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .loading,
  .error {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #dc2626;
  }
</style>
