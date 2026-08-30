<script>
  /** @type {{ word: string, fallback?: string }} */
  let { word, fallback = '◆' } = $props();
</script>

{#if word === 'meja'}
  <svg class="h-9 w-9 text-amber-800" viewBox="0 0 64 64" aria-hidden="true" data-icon-word="meja">
    <rect x="7" y="17" width="50" height="11" rx="4" fill="currentColor" />
    <path d="M14 27h7l-2 25h-7l2-25Zm29 0h7l2 25h-7l-2-25Z" fill="currentColor" />
    <rect x="18" y="33" width="28" height="5" rx="2.5" fill="currentColor" opacity=".7" />
  </svg>
{:else if word === 'kuda'}
  <svg class="h-10 w-10 text-amber-800" viewBox="0 0 64 64" aria-hidden="true" data-icon-word="kuda">
    <path d="M13 27c3-7 10-10 21-9 7 1 12 4 14 10v12H20c-8 0-11-7-7-13Z" fill="currentColor" />
    <path d="m39 24 3-13 5 3 5-2 6 8-5 10-10 2-4-8Z" fill="currentColor" />
    <path d="M19 38h7l-2 17h-7l2-17Zm19 0h7l3 17h-7l-3-17Z" fill="currentColor" />
    <path d="M14 28C7 25 7 20 9 16c0 7 5 5 8 8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" />
  </svg>
{:else}
  <span class="text-3xl" aria-hidden="true">{fallback}</span>
{/if}
