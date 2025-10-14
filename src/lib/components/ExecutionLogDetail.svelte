<script lang="ts">
  import { onMount } from 'svelte'
  import {
    ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
    MessageSquare, Database, Zap, ExternalLink, Copy,
    ChevronDown, ChevronRight, Eye, Code, List, Grid,
    Calendar, Timer, User, Hash, FileText, Settings,
    Bot, Brain, Target, CheckCircle2, AlertTriangle
  } from 'lucide-svelte'
  import type { ExecutionLogDetail } from '$lib/types/execution-logs'

  export let executionId: string

  let executionLog: ExecutionLogDetail | null = null
  let loading = true
  let error = ''
  let expandedSteps: Record<string, boolean> = {}
  let expandedStepTypes: Record<string, boolean> = {}
  let showRawJson = false
  let viewMode: 'grouped' | 'sequential' = 'grouped'
  let selectedStepType: string | null = null

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

  const stepTypeColors: Record<string, string> = {
    'api_invocation': 'bg-blue-100 text-blue-800 border-blue-200',
    'llm_query': 'bg-purple-100 text-purple-800 border-purple-200',
    'llm_response': 'bg-green-100 text-green-800 border-green-200',
    'callback_request': 'bg-orange-100 text-orange-800 border-orange-200',
    'callback_response': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'workflow_step': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'error': 'bg-red-100 text-red-800 border-red-200',
    'unknown': 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Computed properties
  $: orderedSteps = executionLog ?
    [...executionLog.steps].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : []

  $: filteredSteps = selectedStepType ?
    orderedSteps.filter(step => step.step_type === selectedStepType) : orderedSteps

  $: stepTypeCounts = executionLog ?
    Object.entries(executionLog.steps_by_type).map(([type, steps]) => ({
      type,
      count: steps.length,
      label: stepTypeLabels[type] || type,
      icon: stepTypeIcons[type],
      color: stepTypeColors[type]
    })).filter(item => item.count > 0) : []

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

  function toggleRawJson() {
    showRawJson = !showRawJson
  }

  function setViewMode(mode: 'grouped' | 'sequential') {
    viewMode = mode
    selectedStepType = null
  }

  function filterByStepType(stepType: string | null) {
    selectedStepType = stepType
    if (stepType) {
      viewMode = 'sequential'
    }
  }

  function getStepNumber(step: any): number {
    return orderedSteps.findIndex(s => s.id === step.id) + 1
  }

  function formatStepDuration(durationMs: number): string {
    if (durationMs < 1000) {
      return `${durationMs}ms`
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(2)}s`
    } else {
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  function getStepTypeColor(stepType: string): string {
    return stepTypeColors[stepType] || stepTypeColors['unknown']
  }

  function getConfidenceColor(confidence: string): string {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  function getDecisionColor(decision: string): string {
    switch (decision?.toUpperCase()) {
      case 'DIRECT_REPLY':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ESCALATE':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'TRANSFER':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  function formatMessage(message: string): string {
    if (!message) return ''
    // Replace \n with actual line breaks for display
    return message.replace(/\\n/g, '\n')
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

    <!-- Customer Message -->
    <div class="section">
      <h2>Customer Message</h2>
      <div class="message-card">
        <p>{executionLog.original_message}</p>
        <button class="copy-btn" on:click={() => copyToClipboard(executionLog?.original_message || "")}>
          <Copy size={16} />
          Copy
        </button>
      </div>
    </div>

    <!-- Final Response -->
    {#if executionLog.final_response}
      <div class="section">
        <h2>
          <Bot size={24} />
          Final Response
        </h2>

        {#if executionLog.final_response}
          {@const parsedResponse = executionLog.final_response}
          <!-- Structured Response Display -->
          <div class="final-response-container">
            <!-- Context & Message -->
            <div class="response-section">
              <h3>
                <MessageSquare size={20} />
                User Interaction
              </h3>
              <div class="response-grid">
                {#if parsedResponse.context}
                  <div class="response-item">
                    <span class="field-label">Context</span>
                    <span class="context-badge">{parsedResponse.context}</span>
                  </div>
                {/if}
                {#if parsedResponse.final_message}
                  <div class="response-item full-width">
                    <span class="field-label">AI Response Message</span>
                    <div class="user-message">{parsedResponse.final_message}</div>
                  </div>
                {/if}
                {#if parsedResponse.ai_output}
                  <div class="response-item full-width">
                    <span class="field-label">AI Generated Response</span>
                    <div class="ai-response-text">
                      {JSON.stringify(parsedResponse.ai_output, null, 2)}
                    </div>
                    <button
                      class="copy-btn small"
                      on:click={() => copyToClipboard(JSON.stringify(parsedResponse.ai_output, null, 2))}
                    >
                      <Copy size={14} />
                      Copy AI Response
                    </button>
                  </div>
                {/if}
                {#if parsedResponse.execution_id}
                  <div class="response-item">
                    <span class="field-label">Execution ID</span>
                    <code class="execution-id">{parsedResponse.execution_id}</code>
                  </div>
                {/if}
              </div>
            </div>

            <!-- AI Output -->
            {#if parsedResponse.ai_output}
              <div class="response-section">
                <h3>
                  <Brain size={20} />
                  AI Analysis
                </h3>
                <div class="ai-output-grid">
                  {#if parsedResponse.ai_output.decision}
                    <div class="response-item">
                      <span class="field-label">Decision</span>
                      <span class="decision-badge {getDecisionColor(parsedResponse.ai_output.decision)}">
                        <Target size={16} />
                        {parsedResponse.ai_output.decision}
                      </span>
                    </div>
                  {/if}
                  {#if parsedResponse.ai_output.confidence}
                    <div class="response-item">
                      <span class="field-label">Confidence</span>
                      <span class="confidence-badge {getConfidenceColor(parsedResponse.ai_output.confidence)}">
                        {#if parsedResponse.ai_output.confidence === 'high'}
                          <CheckCircle2 size={16} />
                        {:else}
                          <AlertTriangle size={16} />
                        {/if}
                        {parsedResponse.ai_output.confidence.toUpperCase()}
                      </span>
                    </div>
                  {/if}
                  {#if parsedResponse.ai_output.reason}
                    <div class="response-item full-width">
                      <span class="field-label">Reasoning</span>
                      <div class="ai-reason">{parsedResponse.ai_output.reason}</div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- AI Response Details -->
            <div class="response-section">
              <h3>
                <MessageSquare size={20} />
                AI Response Details
              </h3>
              <div class="response-grid">
                {#if parsedResponse.ai_output?.response}
                  <div class="response-item full-width">
                    <span class="field-label">AI Generated Response</span>
                    <div class="ai-response-text">
                      {formatMessage(parsedResponse.ai_output.response)}
                    </div>
                    <button
                      class="copy-btn small"
                      on:click={() => copyToClipboard(parsedResponse.ai_output.response)}
                    >
                      <Copy size={14} />
                      Copy AI Response
                    </button>
                  </div>
                {/if}

                {#if parsedResponse.final_message}
                  <div class="response-item full-width">
                    <span class="field-label">Final Message</span>
                    <div class="final-message-text">
                      {formatMessage(parsedResponse.final_message)}
                    </div>
                    <button
                      class="copy-btn small"
                      on:click={() => copyToClipboard(parsedResponse.final_message)}
                    >
                      <Copy size={14} />
                      Copy Final Message
                    </button>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Raw JSON Section -->
            <div class="response-section">
              <div class="raw-json-header">
                <h3>
                  <Code size={20} />
                  Raw JSON Data
                </h3>
                <button
                  class="toggle-btn {showRawJson ? 'active' : ''}"
                  on:click={toggleRawJson}
                >
                  {#if showRawJson}
                    <Eye size={16} />
                    Hide JSON
                  {:else}
                    <Code size={16} />
                    Show JSON
                  {/if}
                </button>
              </div>

              {#if showRawJson}
                <div class="raw-response-container">
                  <div class="json-header">
                    <span class="json-label">Complete Response Object</span>
                    <button class="copy-btn small" on:click={() => copyToClipboard(JSON.stringify(parsedResponse, null, 2))}>
                      <Copy size={14} />
                      Copy All JSON
                    </button>
                  </div>
                  <pre class="raw-response">{JSON.stringify(parsedResponse, null, 2)}</pre>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <!-- Fallback for non-JSON response -->
          <div class="response-card">
            <p>{executionLog.final_response}</p>
            <button class="copy-btn" on:click={() => copyToClipboard(executionLog.final_response)}>
              <Copy size={16} />
              Copy
            </button>
          </div>
        {/if}
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
      <div class="section-header">
        <h2>Execution Steps</h2>

        <!-- Controls -->
        <div class="controls">
          <!-- View Mode Toggle -->
          <div class="view-mode-toggle">
            <button
              class="toggle-btn {viewMode === 'grouped' ? 'active' : ''}"
              on:click={() => setViewMode('grouped')}
            >
              <Grid size={16} />
              Grouped
            </button>
            <button
              class="toggle-btn {viewMode === 'sequential' ? 'active' : ''}"
              on:click={() => setViewMode('sequential')}
            >
              <List size={16} />
              Sequential
            </button>
          </div>

          <!-- Raw JSON Toggle -->
          <button
            class="toggle-btn {showRawJson ? 'active' : ''}"
            on:click={toggleRawJson}
          >
            <Code size={16} />
            Raw JSON
          </button>
        </div>
      </div>

      {#if showRawJson}
        <!-- Raw JSON View -->
        <div class="raw-json-container">
          <div class="raw-json-header">
            <h3>Raw Execution Log Data</h3>
            <button class="copy-btn" on:click={() => copyToClipboard(JSON.stringify(executionLog, null, 2))}>
              <Copy size={16} />
              Copy JSON
            </button>
          </div>
          <pre class="raw-json">{JSON.stringify(executionLog, null, 2)}</pre>
        </div>
      {:else}
        <!-- Step Type Filter (for sequential view) -->
        {#if viewMode === 'sequential'}
          <div class="step-type-filters">
            <button
              class="filter-btn {selectedStepType === null ? 'active' : ''}"
              on:click={() => filterByStepType(null)}
            >
              All Steps ({orderedSteps.length})
            </button>
            {#each stepTypeCounts as { type, count, label, icon, color }}
              <button
                class="filter-btn {selectedStepType === type ? 'active' : ''} {color}"
                on:click={() => filterByStepType(type)}
              >
                <svelte:component this={icon} size={16} />
                {label} ({count})
              </button>
            {/each}
          </div>
        {/if}

        {#if viewMode === 'grouped'}
          <!-- Grouped View -->
          {#each Object.entries(executionLog.steps_by_type) as [stepType, steps]}
            {#if steps.length > 0}
              <div class="step-type-section">
                <div class="step-type-header {getStepTypeColor(stepType)}">
                  <div class="step-type-info">
                    <svelte:component this={stepTypeIcons[stepType]} size={20} />
                    <span class="step-type-title">{stepTypeLabels[stepType]}</span>
                    <span class="step-count">({steps.length} steps)</span>
                  </div>
                  <button
                    class="expand-toggle-btn"
                    on:click={() => toggleStepType(stepType)}
                  >
                    {expandedStepTypes[stepType] ? 'Hide' : 'Show'} Details
                    <svelte:component
                      this={expandedStepTypes[stepType] ? ChevronDown : ChevronRight}
                      size={16}
                    />
                  </button>
                </div>

                {#if expandedStepTypes[stepType]}
                  <div class="steps-list">
                    {#each steps as step, index}
                      <div class="step-card">
                        <div class="step-header">
                          <div class="step-number">#{getStepNumber(step)}</div>
                          <div class="step-info">
                            <div class="step-title">
                              <span class="step-id">{step.id}</span>
                              <span class="step-level {getLevelClass(step.level)}">{step.level}</span>
                            </div>
                            <div class="step-meta">
                              <span class="step-time">
                                <Calendar size={14} />
                                {formatDateTime(step.timestamp)}
                              </span>
                              {#if step.duration_ms}
                                <span class="step-duration">
                                  <Timer size={14} />
                                  {formatStepDuration(step.duration_ms)}
                                </span>
                              {/if}
                            </div>
                          </div>
                          <button
                            class="detail-btn"
                            on:click={() => toggleStep(step.id)}
                          >
                            <Eye size={16} />
                            {expandedSteps[step.id] ? 'Hide' : 'Show'} Details
                          </button>
                        </div>

                        <div class="step-message">{step.message}</div>

                        {#if expandedSteps[step.id]}
                          <div class="step-details">
                            {#if step.payload}
                              <div class="detail-section">
                                <h4>
                                  <FileText size={16} />
                                  Payload
                                </h4>
                                <pre class="json-display">{formatJson(step.payload)}</pre>
                                <button class="copy-btn" on:click={() => copyToClipboard(JSON.stringify(step.payload, null, 2))}>
                                  <Copy size={14} />
                                  Copy
                                </button>
                              </div>
                            {/if}

                            {#if step.response}
                              <div class="detail-section">
                                <h4>
                                  <MessageSquare size={16} />
                                  Response
                                </h4>
                                <pre class="json-display">{formatJson(step.response)}</pre>
                                <button class="copy-btn" on:click={() => copyToClipboard(JSON.stringify(step.response, null, 2))}>
                                  <Copy size={14} />
                                  Copy
                                </button>
                              </div>
                            {/if}

                            {#if step.error}
                              <div class="detail-section error-section">
                                <h4>
                                  <AlertCircle size={16} />
                                  Error
                                </h4>
                                <div class="error-text">{step.error}</div>
                              </div>
                            {/if}

                            {#if step.metadata}
                              <div class="detail-section">
                                <h4>
                                  <Settings size={16} />
                                  Metadata
                                </h4>
                                <pre class="json-display">{formatJson(step.metadata)}</pre>
                                <button class="copy-btn" on:click={() => copyToClipboard(JSON.stringify(step.metadata, null, 2))}>
                                  <Copy size={14} />
                                  Copy
                                </button>
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
        {:else}
          <!-- Sequential View -->
          <div class="sequential-steps">
            {#each filteredSteps as step, index}
              <div class="step-card sequential">
                <div class="step-header">
                  <div class="step-number">#{getStepNumber(step)}</div>
                  <div class="step-type-badge {getStepTypeColor(step.step_type)}">
                    <svelte:component this={stepTypeIcons[step.step_type]} size={16} />
                    {stepTypeLabels[step.step_type]}
                  </div>
                  <div class="step-info">
                    <div class="step-title">
                      <span class="step-id">{step.id}</span>
                      <span class="step-level {getLevelClass(step.level)}">{step.level}</span>
                    </div>
                    <div class="step-meta">
                      <span class="step-time">
                        <Calendar size={14} />
                        {formatDateTime(step.timestamp)}
                      </span>
                      {#if step.duration_ms}
                        <span class="step-duration">
                          <Timer size={14} />
                          {formatStepDuration(step.duration_ms)}
                        </span>
                      {/if}
                    </div>
                  </div>
                  <button
                    class="detail-btn"
                    on:click={() => toggleStep(step.id)}
                  >
                    <Eye size={16} />
                    {expandedSteps[step.id] ? 'Hide' : 'Show'} Details
                  </button>
                </div>

                <div class="step-message">{step.message}</div>

                {#if expandedSteps[step.id]}
                  <div class="step-details">
                    {#if step.payload}
                      <div class="detail-section">
                        <h4>
                          <FileText size={16} />
                          Payload
                        </h4>
                        <pre class="json-display">{formatJson(step.payload)}</pre>
                        <button class="copy-btn" on:click={() => copyToClipboard(JSON.stringify(step.payload, null, 2))}>
                          <Copy size={14} />
                          Copy
                        </button>
                      </div>
                    {/if}

                    {#if step.response}
                      <div class="detail-section">
                        <h4>
                          <MessageSquare size={16} />
                          Response
                        </h4>
                        <pre class="json-display">{formatJson(step.response)}</pre>
                        <button class="copy-btn" on:click={() => copyToClipboard(JSON.stringify(step.response, null, 2))}>
                          <Copy size={14} />
                          Copy
                        </button>
                      </div>
                    {/if}

                    {#if step.error}
                      <div class="detail-section error-section">
                        <h4>
                          <AlertCircle size={16} />
                          Error
                        </h4>
                        <div class="error-text">{step.error}</div>
                      </div>
                    {/if}

                    {#if step.metadata}
                      <div class="detail-section">
                        <h4>
                          <Settings size={16} />
                          Metadata
                        </h4>
                        <pre class="json-display">{formatJson(step.metadata)}</pre>
                        <button class="copy-btn" on:click={() => copyToClipboard(JSON.stringify(step.metadata, null, 2))}>
                          <Copy size={14} />
                          Copy
                        </button>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .view-mode-toggle {
    display: flex;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .view-mode-toggle .toggle-btn {
    border-right: 1px solid #e5e7eb;
  }

  .view-mode-toggle .toggle-btn:last-child {
    border-right: none;
  }

  .toggle-btn:hover {
    background: #f9fafb;
  }

  .toggle-btn.active {
    background: #3b82f6;
    color: white;
  }

  .toggle-btn.active:hover {
    background: #2563eb;
  }

  .raw-json-container {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .raw-json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
  }

  .raw-json-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .raw-json {
    padding: 1rem;
    background: #1e293b;
    color: #e2e8f0;
    font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-x: auto;
    max-height: 600px;
    overflow-y: auto;
  }

  .step-type-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.5rem;
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .filter-btn:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .filter-btn.active {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #1d4ed8;
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

  .step-type-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .step-type-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .step-count {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .expand-toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    transition: all 0.2s;
  }

  .expand-toggle-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .step-type-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid;
  }

  .detail-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .detail-btn:hover {
    background: #2563eb;
  }

  .sequential-steps {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .step-card.sequential {
    border-left: 4px solid #3b82f6;
  }

  .step-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .step-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .step-meta span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .step-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .detail-section.error-section {
    background: #fef2f2;
    border-color: #fecaca;
  }

  .detail-section.error-section h4 {
    color: #dc2626;
  }

  .detail-section .copy-btn {
    position: relative;
    top: auto;
    right: auto;
    margin-top: 0.5rem;
    margin-left: auto;
    display: flex;
    width: fit-content;
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

  /* Final Response Styles */
  .final-response-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .response-section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .response-section h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .response-grid,
  .ai-output-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .response-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .response-item.full-width {
    grid-column: 1 / -1;
  }

  .response-item .field-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .context-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    color: #374151;
    border-radius: 0.375rem;
    font-weight: 500;
    font-size: 0.875rem;
    width: fit-content;
  }

  .user-message {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    padding: 1rem;
    color: #1e293b;
    line-height: 1.6;
    font-size: 0.875rem;
  }

  .execution-id {
    background: #1e293b;
    color: #e2e8f0;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    width: fit-content;
  }

  .decision-badge,
  .confidence-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-weight: 500;
    font-size: 0.875rem;
    border: 1px solid;
    width: fit-content;
  }

  .ai-reason {
    background: #fef7cd;
    border: 1px solid #fbbf24;
    border-radius: 0.375rem;
    padding: 1rem;
    color: #92400e;
    line-height: 1.6;
    font-size: 0.875rem;
    font-style: italic;
  }

  .final-message-container {
    position: relative;
  }

  .final-message {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 0.5rem;
    padding: 1.5rem;
    color: #0c4a6e;
    line-height: 1.7;
    font-size: 1rem;
    white-space: pre-wrap;
    margin-bottom: 1rem;
  }

  .raw-json-toggle {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .raw-response-container {
    position: relative;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .raw-response {
    padding: 1rem;
    background: #1e293b;
    color: #e2e8f0;
    font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-x: auto;
    margin: 0;
  }

  .raw-response-container .copy-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e2e8f0;
  }

  .raw-response-container .copy-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Enhanced Final Response styles */
  .ai-response-text {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 16px;
    margin: 8px 0 12px 0;
    white-space: pre-wrap;
    line-height: 1.6;
    color: #0c4a6e;
    font-size: 0.95rem;
  }

  .final-message-text {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 16px;
    margin: 8px 0 12px 0;
    white-space: pre-wrap;
    line-height: 1.6;
    color: #14532d;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .copy-btn.small {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    margin-top: 8px;
  }

  .raw-json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .raw-json-header h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #374151;
    font-size: 1.125rem;
  }

  .json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .json-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
  }
</style>
