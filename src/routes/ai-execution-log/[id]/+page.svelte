<script lang="ts">
  import { page } from '$app/stores'
  import ExecutionLogDetail from '$lib/components/ExecutionLogDetail.svelte'

  $: executionId = $page.params.id
</script>

<svelte:head>
  <title>Execution Log Details - CS AI Admin</title>
  <meta name="description" content="Detailed view of AI inference execution log" />
</svelte:head>

<ExecutionLogDetail {executionId} />
