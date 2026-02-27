<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte"

  export let value = ""
  export let language = "json"
  export let theme = "vs" // 'vs' or 'vs-dark'
  export let options = {}

  let editorElement: HTMLDivElement
  let editor: any
  let monaco: any

  const dispatch = createEventDispatcher<{
    change: string
  }>()

  onMount(async () => {
    // Load Monaco from CDN to avoid worker configuration issues
    if (!(window as any).monaco) {
      const loaderScript = document.createElement("script")
      loaderScript.src =
        "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js"
      document.body.appendChild(loaderScript)

      await new Promise((resolve) => {
        loaderScript.onload = resolve
      })

      // Configure AMD loader
      const req = (window as any).require
      req.config({
        paths: {
          vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
        },
      })

      monaco = await new Promise((resolve) => {
        req(["vs/editor/editor.main"], () => {
          resolve((window as any).monaco)
        })
      })
    } else {
      monaco = (window as any).monaco
    }

    if (editorElement) {
      editor = monaco.editor.create(editorElement, {
        value,
        language,
        theme,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        fontSize: 14,
        tabSize: 2,
        ...options,
      })

      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue()
        dispatch("change", newValue)
      })
    }
  })

  // Update editor value if it changes externally
  $: if (editor && value !== editor.getValue()) {
    editor.setValue(value)
  }

  onDestroy(() => {
    if (editor) {
      editor.dispose()
    }
  })
</script>

<div
  bind:this={editorElement}
  class="w-full h-full min-h-[300px] border border-gray-300 rounded-md"
></div>

<style>
  :global(.monaco-editor) {
    padding-top: 8px;
    padding-bottom: 8px;
  }
</style>
