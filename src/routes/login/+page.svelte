<script lang="ts">
  import { enhance } from '$app/forms'
  import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-svelte'
  import type { ActionData } from './$types'

  export let form: ActionData
  let loading = false
  let showPassword = false
</script>

<svelte:head>
  <title>Login - CS AI Admin</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-inter">
  <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
    <div class="text-center">
      <h2 class="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
        Admin Portal
      </h2>
      <p class="mt-2 text-sm text-slate-600">
        Sign in to manage CS AI System
      </p>
    </div>
    
    <form 
      class="mt-8 space-y-6" 
      method="POST" 
      use:enhance={() => {
        loading = true
        return async ({ update }) => {
          loading = false
          await update()
        }
      }}
    >
      <div class="rounded-md shadow-sm space-y-4">
        <div>
          <label for="username" class="sr-only">Username</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={20} class="text-slate-400" />
            </div>
            <input 
              id="username" 
              name="username" 
              type="text" 
              required 
              class="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all" 
              placeholder="Username"
            >
          </div>
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={20} class="text-slate-400" />
            </div>
            <input 
              id="password" 
              name="password" 
              type={showPassword ? 'text' : 'password'} 
              required 
              class="appearance-none rounded-xl relative block w-full pl-10 pr-12 px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all" 
              placeholder="Password"
            >
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer z-20"
              on:click={() => (showPassword = !showPassword)}
              tabindex="-1"
            >
              {#if showPassword}
                <EyeOff size={20} />
              {:else}
                <Eye size={20} />
              {/if}
            </button>
          </div>
        </div>
      </div>

      {#if form?.missing}
        <div class="rounded-lg bg-red-50 p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={18} />
          Please enter both username and password.
        </div>
      {/if}

      {#if form?.incorrect}
        <div class="rounded-lg bg-red-50 p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={18} />
          Invalid username or password.
        </div>
      {/if}

      <div>
        <button 
          type="submit" 
          class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {#if loading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          {:else}
            Sign in
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  :global(body) {
    background-color: #f8fafc;
  }
</style>
