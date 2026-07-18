<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { LEVELS } from '$lib/content/levels.js';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';
  import { player } from '$lib/audio/player.svelte.js';
  import { onMount } from 'svelte';

  onMount(() => {
    if (!profiles.active) goto(`${base}/`);
  });

  const p = $derived(profiles.active);

  let wobblingId = $state(0);
  let toastMsg = $state('');
  /** @type {any} */
  let toastTimer;

  /** @param {import('$lib/content/levels.js').Level} lvl @param {boolean} locked */
  function handleTap(lvl, locked) {
    if (locked) {
      wobblingId = lvl.id;
      setTimeout(() => wobblingId = 0, 400);
      toastMsg = 'Selesaikan pelajaran sebelumnya dulu, ya!';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastMsg = '', 3000);
      if (p) player.speak(p.voiceId, 'words', 'Selesaikan pelajaran sebelumnya dulu, ya!');
      return;
    }
    goto(`${base}/belajar/${lvl.id}`);
  }
</script>

{#if p}
  <header class="mb-6 flex items-center justify-between">
    <a href="{base}/" class="text-2xl">⬅️</a>
    <div class="flex items-center gap-2">
      <RobotAvatar color={p.avatar} size={32} />
      <span class="text-lg font-bold">{p.name}</span>
    </div>
    <a href="{base}/orang-tua" class="text-2xl">⚙️</a>
  </header>

  <!-- Free-explore alphabet reference (no scoring) -->
  <button
    onclick={() => goto(`${base}/abjad`)}
    class="mb-4 flex items-center gap-4 rounded-3xl bg-indigo-500 p-5 text-left text-white shadow active:scale-[0.98]"
  >
    <span class="text-4xl">🔤</span>
    <span class="flex-1">
      <span class="block text-xl font-black">Abjad A-Z</span>
      <span class="block text-sm text-indigo-50">Dengar semua huruf</span>
    </span>
  </button>

  <div class="grid gap-4">
    {#each LEVELS as lvl (lvl.id)}
      {@const locked = !profiles.isLevelUnlocked(lvl.id)}
      {@const progress = profiles.levelProgress(lvl.id)}
      {@const star = profiles.isLevelComplete(lvl.id)}
      <button
        onclick={() => handleTap(lvl, locked)}
        class="flex items-center gap-4 rounded-3xl p-5 text-left shadow active:scale-[0.98] {locked
          ? 'bg-slate-100 opacity-60'
          : 'bg-white'} {wobblingId === lvl.id ? 'tile-wobble' : ''}"
      >
        <span class="text-4xl">{locked ? '🔒' : star ? '⭐' : '📘'}</span>
        <span class="flex-1">
          <span class="block text-xl font-black">Level {lvl.node ?? lvl.id} · {lvl.title}</span>
          <span class="block text-sm text-slate-500">{lvl.subtitle}</span>
        </span>
        {#if !locked && progress > 0}
          <span class="text-sm font-bold text-amber-500">{Math.round(progress * 100)}%</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Bonus matching activity (low-stakes, fully offline except optional audio fallback) -->
  <button
    onclick={() => goto(`${base}/cocokkan`)}
    class="mt-4 flex items-center gap-4 rounded-3xl bg-emerald-500 p-5 text-left text-white shadow active:scale-[0.98]"
  >
    <span class="text-4xl">🧩</span>
    <span class="flex-1">
      <span class="block text-xl font-black">Cocokkan</span>
      <span class="block text-sm text-emerald-50">Geser kata ke gambar</span>
    </span>
  </button>

  <!-- Bonus speaking activity (low-stakes, online-only) -->
  <button
    onclick={() => goto(`${base}/ucapkan`)}
    class="mt-3 flex items-center gap-4 rounded-3xl bg-teal-500 p-5 text-left text-white shadow active:scale-[0.98]"
  >
    <span class="text-4xl">🎤</span>
    <span class="flex-1">
      <span class="block text-xl font-black">Ucapkan!</span>
      <span class="block text-sm text-teal-50">Baca kata dengan suara</span>
    </span>
  </button>

  <!-- Bonus writing activity (low-stakes, fully offline) -->
  <button
    onclick={() => goto(`${base}/menulis`)}
    class="mt-3 flex items-center gap-4 rounded-3xl bg-violet-500 p-5 text-left text-white shadow active:scale-[0.98]"
  >
    <span class="text-4xl">✍️</span>
    <span class="flex-1">
      <span class="block text-xl font-black">Belajar Menulis</span>
      <span class="block text-sm text-violet-100">Tiru, susun, dan ketik kata</span>
    </span>
  </button>

  <!-- Mesin Kata slot machine game (fully offline) -->
  <button
    onclick={() => goto(`${base}/mesin`)}
    class="mt-3 flex items-center gap-4 rounded-3xl bg-orange-500 p-5 text-left text-white shadow active:scale-[0.98]"
  >
    <span class="text-4xl">🎰</span>
    <span class="flex-1">
      <span class="block text-xl font-black">Mesin Kata</span>
      <span class="block text-sm text-orange-100">Putar dan temukan kata</span>
    </span>
  </button>
{/if}

{#if toastMsg}
  <div class="fixed bottom-10 left-1/2 z-50 w-[90%] -translate-x-1/2 animate-pop rounded-full bg-slate-800 px-6 py-4 text-center text-sm font-bold text-white shadow-lg">
    {toastMsg}
  </div>
{/if}

<style>
  :global(.animate-pop) { animation: pop 0.4s ease; }
  @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.1); } 100% { transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { :global(.animate-pop) { animation: none; } }
</style>
