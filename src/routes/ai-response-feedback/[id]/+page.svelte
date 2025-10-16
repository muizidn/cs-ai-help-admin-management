<script lang="ts">
  import { page } from '$app/stores'
  import AIResponseFeedbackDetail from '$lib/components/AIResponseFeedbackDetail.svelte'

  $: feedbackId = $page.params.id
</script>

<svelte:head>
  <title>Feedback Details - CS AI Admin</title>
  <meta name="description" content="Detailed view of AI response feedback" />
</svelte:head>

<AIResponseFeedbackDetail {feedbackId} />
