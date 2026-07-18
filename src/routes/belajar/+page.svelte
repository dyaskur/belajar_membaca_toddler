<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount, tick } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { NODES } from '$lib/content/levels.js';
  import { LOCKED_PREREQ } from '$lib/content/feedback.js';
  import { player } from '$lib/audio/player.svelte.js';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  const p = $derived(profiles.active);
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');

  /** @type {Confetti} */
  let confetti;
  let celebrating = $state(false); // robot hops on the node it just finished
  let shakePack = $state(/** @type {number|null} */ (null));
  let toast = $state('');
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let toastTimer;

  // Kid-facing path: Level 2's 2b/2c/2d fan out as a peer trio; the rest is a single spine.
  const spine = $derived(NODES.filter((n) => !['2b', '2c', '2d'].includes(n.key)));
  const trio = $derived(NODES.filter((n) => ['2b', '2c', '2d'].includes(n.key)));

  // The child's robot rests on the last-completed node (or the very first node to start).
  const robotPack = $derived.by(() => {
    let last = NODES[0]?.pack;
    for (const n of NODES) if (profiles.isLevelComplete(n.pack)) last = n.pack;
    return last;
  });

  // Soft per-node tint (unlocked). Locked nodes stay slate.
  const TINT = /** @type {Record<number, string>} */ ({
    1: '#fde68a', 2: '#bae6fd', 4: '#c7d2fe', 5: '#fbcfe8', 7: '#bbf7d0', 3: '#fed7aa', 8: '#ddd6fe', 9: '#fecaca'
  });

  onMount(async () => {
    if (!profiles.active) {
      goto(`${base}/`);
      return;
    }
    // Warm the level-1 bucket so the locked-tap line plays instantly on the first tap.
    player.ensureLevel(voiceId, 1).catch(() => {});
    // Arrived after finishing a new node? Hop + rain confetti, once per node.
    const done = profiles.completedNodeCount;
    if (done > profiles.pathCelebrated) {
      celebrating = true;
      await tick();
      confetti?.fire(80);
      setTimeout(() => confetti?.fire(50), 450);
      setTimeout(() => (celebrating = false), 1500);
      profiles.setPathCelebrated(done);
    }
  });

  /** @param {number} pack */
  function open(pack) {
    if (profiles.isNodeUnlocked(pack)) {
      goto(`${base}/belajar/${pack}`);
      return;
    }
    shakePack = pack;
    setTimeout(() => (shakePack = null), 500);
    player.speak(voiceId, 1, LOCKED_PREREQ);
    const label = profiles.lockedPrereqLabel(pack);
    toast = label ? `Selesaikan ${label} dulu, ya!` : 'Selesaikan pelajaran sebelumnya dulu, ya!';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 2600);
  }
</script>

<Confetti bind:this={confetti} />

{#if p}
  <header class="mb-4 flex items-center justify-between">
    <a href="{base}/" class="text-2xl">⬅️</a>
    <div class="flex items-center gap-2">
      <RobotAvatar color={p.avatar} size={32} />
      <span class="text-lg font-bold">{p.name}</span>
    </div>
    <a href="{base}/orang-tua" class="text-2xl">⚙️</a>
  </header>

  {#snippet medallion(/** @type {typeof NODES[number]} */ node, /** @type {number} */ size)}
    {@const unlocked = profiles.isNodeUnlocked(node.pack)}
    {@const complete = profiles.isLevelComplete(node.pack)}
    {@const progress = profiles.levelProgress(node.pack)}
    {@const pulse = unlocked && !complete}
    {@const onRobot = node.pack === robotPack}
    <div class="relative flex flex-col items-center">
      <!-- Child's robot perches above the node it's resting on -->
      {#if onRobot}
        <div class="pointer-events-none absolute -top-11 z-10 {celebrating ? 'robot-hop' : 'robot-bob'}">
          <RobotAvatar color={p.avatar} size={46} />
        </div>
      {/if}
      <button
        onclick={() => open(node.pack)}
        aria-label={`${node.title}${unlocked ? '' : ' (terkunci)'}`}
        style="width:{size}px; height:{size}px; {unlocked ? `background:${TINT[node.pack]};` : ''}"
        class="path-node relative flex items-center justify-center rounded-full shadow-lg
          {unlocked ? 'text-slate-800' : 'bg-slate-200 text-slate-400'}
          {complete ? 'ring-4 ring-amber-300' : ''}
          {pulse ? 'node-pulse ring-4 ring-white' : ''}
          {shakePack === node.pack ? 'node-shake' : ''}"
      >
        <span style="font-size:{size * 0.42}px">{unlocked ? node.icon : '🔒'}</span>
        {#if complete}
          <span class="absolute -right-1 -top-1 text-xl drop-shadow" aria-hidden="true">⭐</span>
        {:else if unlocked && progress > 0}
          <span
            class="absolute -bottom-1 rounded-full bg-white/90 px-1.5 text-[0.6rem] font-black text-amber-600 shadow"
            >{Math.round(progress * 100)}%</span
          >
        {/if}
      </button>
      <span class="mt-1 text-xs font-black text-slate-600">{node.title}</span>
      <span class="text-[0.6rem] font-bold text-slate-300">{node.key}</span>
    </div>
  {/snippet}

  <!-- Adventure path: serpentine spine + peer trio, robot travelling the completed nodes -->
  <div class="relative flex flex-col items-center pb-2">
    {#each spine as node, i (node.pack)}
      {@render medallion(node, i === 0 ? 92 : 84)}

      {#if node.key === '2a'}
        <!-- branch down into the 2b/2c/2d trio -->
        <div class="path-conn"></div>
        <div class="flex items-start justify-center gap-4">
          {#each trio as t (t.pack)}
            {@render medallion(t, 72)}
          {/each}
        </div>
        <div class="path-conn"></div>
      {:else if i < spine.length - 1}
        <div class="path-conn"></div>
      {/if}
    {/each}
  </div>

  <!-- Bonus activities — a separate strip below the path -->
  <p class="mb-2 mt-4 text-center text-xs font-bold uppercase tracking-wide text-slate-400">Permainan</p>
  <div class="grid grid-cols-5 gap-2">
    {#each [{ href: 'abjad', icon: '🔤', label: 'Abjad', bg: 'bg-indigo-500' }, { href: 'cocokkan', icon: '🧩', label: 'Cocokkan', bg: 'bg-emerald-500' }, { href: 'ucapkan', icon: '🎤', label: 'Ucapkan', bg: 'bg-teal-500' }, { href: 'menulis', icon: '✍️', label: 'Menulis', bg: 'bg-violet-500' }, { href: 'mesin', icon: '🎰', label: 'Mesin', bg: 'bg-orange-500' }] as b (b.href)}
      <button
        onclick={() => goto(`${base}/${b.href}`)}
        class="flex flex-col items-center gap-1 rounded-2xl {b.bg} p-2.5 text-white shadow active:scale-95"
      >
        <span class="text-2xl">{b.icon}</span>
        <span class="text-[0.65rem] font-bold">{b.label}</span>
      </button>
    {/each}
  </div>

  <!-- Locked-node toast: names the specific prerequisite in text. -->
  {#if toast}
    <div
      role="status"
      class="pointer-events-none fixed inset-x-0 bottom-6 z-40 mx-auto w-fit max-w-[90%] rounded-full bg-slate-800 px-5 py-2.5 text-center text-sm font-bold text-white shadow-lg"
    >
      🔒 {toast}
    </div>
  {/if}
{/if}

<style>
  .path-node {
    border: 4px solid rgba(255, 255, 255, 0.7);
    transition: transform 0.12s ease;
    animation: node-in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }
  .path-node:active {
    transform: scale(0.9);
  }
  @keyframes node-in {
    0% { transform: scale(0.3); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  /* Dashed "road" between path nodes. */
  .path-conn {
    width: 0;
    height: 26px;
    border-left: 4px dashed #cbd5e1;
    margin: 2px 0;
  }

  /* Unlocked-but-unfinished nodes gently pulse to invite a tap. */
  .node-pulse { animation: node-pulse 1.8s ease-in-out infinite; }
  @keyframes node-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
    50% { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0); }
  }

  /* Robot idles with a soft bob; hops with a big bounce on a fresh arrival. */
  .robot-bob { animation: robot-bob 2.4s ease-in-out infinite; }
  @keyframes robot-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  .robot-hop { animation: robot-hop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 3; }
  @keyframes robot-hop {
    0% { transform: translateY(0) scale(1); }
    35% { transform: translateY(-26px) scale(1.1); }
    70% { transform: translateY(0) scale(0.94); }
    100% { transform: translateY(0) scale(1); }
  }

  .node-shake { animation: node-shake 0.5s ease; }
  @keyframes node-shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .node-pulse, .robot-bob, .robot-hop, .node-shake, .path-node { animation: none; }
  }
</style>
