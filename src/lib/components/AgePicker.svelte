<script>
  import { AGE_BANDS } from '$lib/content/ages.js';

  /** @type {{ value: string }} */
  let { value = $bindable() } = $props();
</script>

<div class="grid grid-cols-3 gap-2">
  {#each AGE_BANDS as band (band.id)}
    <button
      type="button"
      aria-pressed={value === band.id}
      onclick={() => (value = band.id)}
      class="rounded-2xl px-2 py-4 text-center text-lg font-black active:scale-95
        {value === band.id ? 'bg-amber-400 text-white shadow' : 'bg-slate-100 text-slate-500'}"
    >
      {band.label}
    </button>
  {/each}
</div>
