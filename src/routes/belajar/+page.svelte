<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { LEVELS, getLevel, levelLabel } from '$lib/content/levels.js';
  import { LOCKED_LEVEL } from '$lib/content/feedback.js';
  import { player } from '$lib/audio/player.svelte.js';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';
  import { onDestroy, onMount } from 'svelte';

  onMount(() => {
    if (!profiles.active) goto(`${base}/`);
  });

  const p = $derived(profiles.active);
  let lockedId = $state(/** @type {number|null} */ (null));
  let toast = $state('');
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let toastTimer;

  const NODE_ICONS = /** @type {Record<number, string>} */ ({ 1: '🔤', 2: '🅱️', 4: '📦', 5: '🔗', 7: '🧱', 3: '🧩', 8: '🧩', 9: '🏁' });

  onDestroy(() => {
    if (toastTimer) clearTimeout(toastTimer);
    player.stop();
  });

  /** @param {number} id */
  async function open(id) {
    if (profiles.isLevelUnlocked(id)) return goto(`${base}/belajar/${id}`);
    lockedId = id;
    const missing = profiles.missingPrerequisites(id)
      .map((pack) => `${levelLabel(pack)} ${getLevel(pack)?.title ?? ''}`)
      .join(', ');
    toast = `Selesaikan ${missing} dulu`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = '';
      lockedId = null;
    }, 3200);
    const voiceId = p?.voiceId ?? 'ibu-dewi';
    await player.ensureLevel(voiceId, 1);
    player.speak(voiceId, 1, LOCKED_LEVEL);
  }
</script>

{#if p}
  <header class="mb-6 flex items-center justify-between">
    <a href="{base}/" class="text-2xl">⬅️</a>
    <div class="flex items-center gap-2">
      <RobotAvatar color={p.avatar} size={32} />
      <span class="text-lg font-bold">{p.name}</span>
    </div>
    <a href="{base}/orang-tua" class="text-2xl" aria-label="Pengaturan Orang Tua">⚙️</a>
  </header>

  <h1 class="mb-5 text-center text-2xl font-black text-amber-600">Jalur Belajar</h1>
  <div class="grid gap-6">
    {#each [1, 2, 3] as stage}
      <section>
        <h2 class="mb-2 text-sm font-black uppercase tracking-wider text-slate-400">Level {stage}</h2>
        <div class="grid gap-3 {stage === 2 ? 'sm:grid-cols-2' : ''}">
          {#each LEVELS.filter((lvl) => lvl.stage === stage) as lvl (lvl.id)}
            {@const locked = !profiles.isLevelUnlocked(lvl.id)}
            {@const progress = profiles.levelProgress(lvl.id)}
            {@const star = profiles.isLevelComplete(lvl.id)}
            <button
              onclick={() => open(lvl.id)}
              aria-disabled={locked}
              class:locked-shake={lockedId === lvl.id}
              class="flex items-center gap-4 rounded-3xl p-4 text-left shadow active:scale-[0.98] {locked
                ? 'bg-slate-100 text-slate-400'
                : 'bg-white'}"
            >
              <span class="relative text-4xl">
                {NODE_ICONS[lvl.id]}
                {#if locked}<span class="absolute -bottom-1 -right-2 text-xl">🔒</span>{/if}
              </span>
              <span class="flex-1">
                <span class="block text-xs font-black uppercase tracking-wide text-amber-500">{lvl.label}</span>
                <span class="block text-lg font-black">{lvl.title}</span>
                <span class="block text-xs text-slate-500">{lvl.subtitle}</span>
              </span>
              {#if star}
                <span class="text-2xl">⭐</span>
              {:else if !locked && progress > 0}
                <span class="text-sm font-bold text-amber-500">{Math.round(progress * 100)}%</span>
              {/if}
            </button>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  {#if toast}
    <div class="fixed bottom-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-800 px-5 py-3 text-center font-bold text-white shadow-xl" role="status">
      {toast}
    </div>
  {/if}

  <h2 class="mb-3 mt-7 text-sm font-black uppercase tracking-wider text-slate-400">Bonus</h2>

  <!-- Free-explore alphabet reference (no scoring) -->
  <button
    onclick={() => goto(`${base}/abjad`)}
    class="flex w-full items-center gap-4 rounded-3xl bg-indigo-500 p-5 text-left text-white shadow active:scale-[0.98]"
  >
    <span class="text-4xl">🔤</span>
    <span class="flex-1">
      <span class="block text-xl font-black">Abjad A-Z</span>
      <span class="block text-sm text-indigo-50">Dengar semua huruf</span>
    </span>
  </button>

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

<style>
  .locked-shake { animation: locked-shake 0.45s ease; }
  @keyframes locked-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    50% { transform: translateX(7px); }
    75% { transform: translateX(-4px); }
  }
  @media (prefers-reduced-motion: reduce) { .locked-shake { animation: none; } }
</style>
