<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { LEVELS, MASTERY } from '$lib/content/levels.js';
  import { onMount } from 'svelte';

  onMount(() => {
    if (!profiles.active) goto(`${base}/`);
  });

  const p = $derived(profiles.active);

  /** @param {number} id */
  function open(id) {
    goto(`${base}/belajar/${id}`);
  }
</script>

{#if p}
  <header class="mb-6 flex items-center justify-between">
    <a href="{base}/" class="text-2xl">⬅️</a>
    <div class="flex items-center gap-2">
      <span class="text-3xl">{p.avatar}</span>
      <span class="text-lg font-bold">{p.name}</span>
    </div>
    <a href="{base}/orang-tua" class="text-2xl">⚙️</a>
  </header>

  <div class="grid gap-4">
    {#each LEVELS as lvl (lvl.id)}
      {@const locked = !profiles.isLevelUnlocked(lvl.id)}
      {@const best = p.bestScore[lvl.id] ?? 0}
      {@const star = best >= MASTERY}
      <button
        disabled={locked}
        onclick={() => open(lvl.id)}
        class="flex items-center gap-4 rounded-3xl p-5 text-left shadow active:scale-[0.98] {locked
          ? 'bg-slate-100 opacity-60'
          : 'bg-white'}"
      >
        <span class="text-4xl">{locked ? '🔒' : star ? '⭐' : '📘'}</span>
        <span class="flex-1">
          <span class="block text-xl font-black">Level {lvl.id} · {lvl.title}</span>
          <span class="block text-sm text-slate-500">{lvl.subtitle}</span>
        </span>
        {#if !locked && best > 0}
          <span class="text-sm font-bold text-amber-500">{Math.round(best * 100)}%</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Bonus speaking activity (low-stakes, online-only) -->
  <button
    onclick={() => goto(`${base}/ucapkan`)}
    class="mt-4 flex items-center gap-4 rounded-3xl bg-teal-500 p-5 text-left text-white shadow active:scale-[0.98]"
  >
    <span class="text-4xl">🎤</span>
    <span class="flex-1">
      <span class="block text-xl font-black">Ucapkan!</span>
      <span class="block text-sm text-teal-50">Baca kata dengan suara</span>
    </span>
  </button>
{/if}
