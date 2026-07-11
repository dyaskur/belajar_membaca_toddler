<script>
  import { AGE_BANDS } from '$lib/content/profile-options.js';

  /** @type {{ value: import('$lib/content/profile-options.js').AgeBand }} */
  let { value = $bindable('<=4') } = $props();
</script>

<div class="grid gap-2 sm:grid-cols-3">
  {#each AGE_BANDS as option (option.id)}
    <button
      type="button"
      aria-pressed={value === option.id}
      onclick={() => (value = option.id)}
      class="min-h-24 rounded-2xl border-2 p-3 text-left shadow-sm active:scale-[0.98]
        {value === option.id
          ? 'border-amber-400 bg-amber-100 text-amber-900'
          : 'border-slate-100 bg-white text-slate-600'}"
    >
      <span class="block text-xl font-black">{option.label}</span>
      <span class="mt-1 block text-sm font-bold text-slate-500">{option.description}</span>
      <span class="mt-2 block text-xs font-bold uppercase text-slate-400">{option.quizTileCount} pilihan</span>
    </button>
  {/each}
</div>
