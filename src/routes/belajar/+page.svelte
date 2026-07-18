<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { NODES } from '$lib/content/levels.js';
  import { LOCKED_PREREQ } from '$lib/content/feedback.js';
  import { player } from '$lib/audio/player.svelte.js';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    if (!profiles.active) goto(`${base}/`);
  });

  const p = $derived(profiles.active);
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');

  // Locked-node feedback: which node is shaking + the prerequisite toast text.
  let shakePack = $state(/** @type {number|null} */ (null));
  let toast = $state('');
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let toastTimer;

  // Kid-facing path: Level 2 keeps its 2b/2c/2d trio side by side; everything else is a
  // single node in the spine.
  const spine = $derived(NODES.filter((n) => !['2b', '2c', '2d'].includes(n.key)));
  const trio = $derived(NODES.filter((n) => ['2b', '2c', '2d'].includes(n.key)));

  /** @param {number} pack */
  function open(pack) {
    if (profiles.isNodeUnlocked(pack)) {
      goto(`${base}/belajar/${pack}`);
      return;
    }
    // Locked: shake, speak one generic line, and name the specific prerequisite on screen.
    shakePack = pack;
    setTimeout(() => (shakePack = null), 500);
    player.speak(voiceId, 1, LOCKED_PREREQ);
    const label = profiles.lockedPrereqLabel(pack);
    toast = label ? `Selesaikan ${label} dulu, ya!` : 'Selesaikan pelajaran sebelumnya dulu, ya!';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 2600);
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

  <!-- Adventure path (plain functional version; robot avatar + motion arrive in PR2) -->
  <div class="flex flex-col items-center gap-3">
    {#each spine as node (node.pack)}
      {@const unlocked = profiles.isNodeUnlocked(node.pack)}
      {@const complete = profiles.isLevelComplete(node.pack)}
      {@const progress = profiles.levelProgress(node.pack)}
      <button
        onclick={() => open(node.pack)}
        aria-label={`${node.title}${unlocked ? '' : ' (terkunci)'}`}
        class="flex w-full max-w-sm items-center gap-4 rounded-3xl p-4 text-left shadow transition active:scale-[0.98]
          {unlocked ? 'bg-white' : 'bg-slate-100 opacity-70'}
          {shakePack === node.pack ? 'node-shake' : ''}"
      >
        <span class="text-4xl">{unlocked ? (complete ? '⭐' : node.icon) : '🔒'}</span>
        <span class="flex-1">
          <span class="block text-lg font-black">{node.title}</span>
          <span class="block text-xs text-slate-400">{node.key}</span>
        </span>
        {#if unlocked && progress > 0 && !complete}
          <span class="text-sm font-bold text-amber-500">{Math.round(progress * 100)}%</span>
        {/if}
      </button>

      <!-- The 2b/2c/2d peer trio opens together right after 2a. -->
      {#if node.key === '2a'}
        <div class="grid w-full max-w-sm grid-cols-3 gap-2">
          {#each trio as t (t.pack)}
            {@const tUnlocked = profiles.isNodeUnlocked(t.pack)}
            {@const tComplete = profiles.isLevelComplete(t.pack)}
            <button
              onclick={() => open(t.pack)}
              aria-label={`${t.title}${tUnlocked ? '' : ' (terkunci)'}`}
              class="flex flex-col items-center gap-1 rounded-2xl p-3 shadow transition active:scale-95
                {tUnlocked ? 'bg-white' : 'bg-slate-100 opacity-70'}
                {shakePack === t.pack ? 'node-shake' : ''}"
            >
              <span class="text-3xl">{tUnlocked ? (tComplete ? '⭐' : t.icon) : '🔒'}</span>
              <span class="text-center text-[0.7rem] font-bold leading-tight text-slate-500">{t.title}</span>
              <span class="text-[0.6rem] text-slate-300">{t.key}</span>
            </button>
          {/each}
        </div>
      {/if}
    {/each}
  </div>

  <!-- Bonus activities (low-stakes side games) -->
  <div class="mt-6 grid gap-3">
    <button
      onclick={() => goto(`${base}/abjad`)}
      class="flex items-center gap-4 rounded-3xl bg-indigo-500 p-4 text-left text-white shadow active:scale-[0.98]"
    >
      <span class="text-3xl">🔤</span>
      <span class="flex-1">
        <span class="block text-lg font-black">Abjad A-Z</span>
        <span class="block text-xs text-indigo-50">Dengar semua huruf</span>
      </span>
    </button>
    <button
      onclick={() => goto(`${base}/cocokkan`)}
      class="flex items-center gap-4 rounded-3xl bg-emerald-500 p-4 text-left text-white shadow active:scale-[0.98]"
    >
      <span class="text-3xl">🧩</span>
      <span class="flex-1">
        <span class="block text-lg font-black">Cocokkan</span>
        <span class="block text-xs text-emerald-50">Geser kata ke gambar</span>
      </span>
    </button>
    <button
      onclick={() => goto(`${base}/ucapkan`)}
      class="flex items-center gap-4 rounded-3xl bg-teal-500 p-4 text-left text-white shadow active:scale-[0.98]"
    >
      <span class="text-3xl">🎤</span>
      <span class="flex-1">
        <span class="block text-lg font-black">Ucapkan!</span>
        <span class="block text-xs text-teal-50">Baca kata dengan suara</span>
      </span>
    </button>
    <button
      onclick={() => goto(`${base}/menulis`)}
      class="flex items-center gap-4 rounded-3xl bg-violet-500 p-4 text-left text-white shadow active:scale-[0.98]"
    >
      <span class="text-3xl">✍️</span>
      <span class="flex-1">
        <span class="block text-lg font-black">Belajar Menulis</span>
        <span class="block text-xs text-violet-100">Tiru, susun, dan ketik kata</span>
      </span>
    </button>
    <button
      onclick={() => goto(`${base}/mesin`)}
      class="flex items-center gap-4 rounded-3xl bg-orange-500 p-4 text-left text-white shadow active:scale-[0.98]"
    >
      <span class="text-3xl">🎰</span>
      <span class="flex-1">
        <span class="block text-lg font-black">Mesin Kata</span>
        <span class="block text-xs text-orange-100">Putar dan temukan kata</span>
      </span>
    </button>
  </div>

  <!-- Locked-node toast: names the specific prerequisite in text. -->
  {#if toast}
    <div
      role="status"
      class="pointer-events-none fixed inset-x-0 bottom-6 z-20 mx-auto w-fit max-w-[90%] rounded-full bg-slate-800 px-5 py-2.5 text-center text-sm font-bold text-white shadow-lg"
    >
      🔒 {toast}
    </div>
  {/if}
{/if}

<style>
  .node-shake { animation: node-shake 0.5s ease; }
  @keyframes node-shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  @media (prefers-reduced-motion: reduce) { .node-shake { animation: none; } }
</style>
