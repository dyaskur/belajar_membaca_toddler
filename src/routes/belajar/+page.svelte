<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { getLevel } from '$lib/content/levels.js';
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

  /** @param {number} lvlId @param {boolean} locked */
  function handleTap(lvlId, locked) {
    if (locked) {
      wobblingId = lvlId;
      setTimeout(() => wobblingId = 0, 400);
      toastMsg = 'Selesaikan pelajaran sebelumnya dulu, ya!';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastMsg = '', 3000);
      if (p) player.speak(p.voiceId, 'words', 'Selesaikan pelajaran sebelumnya dulu, ya!');
      return;
    }
    goto(`${base}/belajar/${lvlId}`);
  }

  // Active node is the highest incomplete but unlocked node.
  // If all are completed, it sits on the last one.
  const pathIds = [1, 2, 4, 5, 7, 3, 8, 9];
  const activeNodeId = $derived.by(() => {
    let lastUnlocked = 1;
    for (const id of pathIds) {
      if (profiles.isLevelUnlocked(id)) {
        lastUnlocked = id;
        if (!profiles.isLevelComplete(id)) return id;
      }
    }
    return lastUnlocked;
  });

  /** @param {number} id */
  function getLevelState(id) {
    const locked = !profiles.isLevelUnlocked(id);
    const complete = profiles.isLevelComplete(id);
    return { locked, complete };
  }

  /** @type {Record<number, string>} */
  const icons = {
    1: '🔤',
    2: '💬',
    4: '🔠',
    5: '🗣️',
    7: '🧩',
    3: '📝',
    8: '📚',
    9: '📖'
  };
</script>

{#if p}
  <header class="mb-6 flex items-center justify-between px-4">
    <a href="{base}/" class="text-2xl">⬅️</a>
    <div class="flex items-center gap-2">
      <RobotAvatar color={p.avatar} size={32} />
      <span class="text-lg font-bold">{p.name}</span>
    </div>
    <a href="{base}/orang-tua" class="text-2xl">⚙️</a>
  </header>

  <div class="relative mx-auto flex w-full max-w-[320px] flex-col items-center pb-12 pt-4">
    
    <!-- Row 1 -->
    {@render node(1, true)}

    <!-- Line 1 to 2 -->
    <div class="my-1 h-8 w-2 rounded-full bg-slate-200"></div>

    <!-- Row 2 -->
    {@render node(2, true)}

    <!-- Line 2 down to branch -->
    <div class="mt-1 h-6 w-2 rounded-t-full bg-slate-200"></div>

    <!-- Branch SVG -->
    <svg class="h-6 w-full" viewBox="0 0 320 24" preserveAspectRatio="none">
      <line x1="40" y1="4" x2="280" y2="4" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round" />
      <line x1="40" y1="4" x2="40" y2="24" stroke="#e2e8f0" stroke-width="8" />
      <line x1="120" y1="4" x2="120" y2="24" stroke="#e2e8f0" stroke-width="8" />
      <line x1="200" y1="4" x2="200" y2="24" stroke="#e2e8f0" stroke-width="8" />
      <line x1="280" y1="4" x2="280" y2="24" stroke="#e2e8f0" stroke-width="8" />
    </svg>

    <!-- Row 3 -->
    <div class="flex w-full justify-between -mt-1 relative z-10">
      {@render node(4, false)}
      {@render node(5, false)}
      {@render node(7, false)}
      {@render node(3, false)}
    </div>

    <!-- Converge SVG -->
    <svg class="h-8 w-full -mt-1" viewBox="0 0 320 32" preserveAspectRatio="none">
      <line x1="40" y1="0" x2="40" y2="16" stroke="#e2e8f0" stroke-width="8" />
      <line x1="120" y1="0" x2="120" y2="16" stroke="#e2e8f0" stroke-width="8" />
      <line x1="200" y1="0" x2="200" y2="16" stroke="#e2e8f0" stroke-width="8" />
      <line x1="280" y1="0" x2="280" y2="16" stroke="#e2e8f0" stroke-width="8" />
      <line x1="40" y1="16" x2="280" y2="16" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round" />
      <line x1="160" y1="16" x2="160" y2="32" stroke="#e2e8f0" stroke-width="8" />
    </svg>

    <!-- Row 4 -->
    {@render node(8, true)}

    <!-- Line 8 to 9 -->
    <div class="my-1 h-8 w-2 rounded-full bg-slate-200"></div>

    <!-- Row 5 -->
    {@render node(9, true)}

  </div>

  <div class="mt-4 px-4 pb-12">
    <h3 class="mb-3 text-lg font-bold text-slate-500">Bonus</h3>
    <div class="flex snap-x gap-4 overflow-x-auto pb-4 pt-1">
      <button
        onclick={() => goto(`${base}/abjad`)}
        class="flex min-w-[140px] shrink-0 snap-start flex-col items-center gap-2 rounded-3xl bg-indigo-500 p-4 text-white shadow-sm active:scale-95"
      >
        <span class="text-4xl">🔤</span>
        <span class="font-black">Abjad A-Z</span>
      </button>

      <button
        onclick={() => goto(`${base}/cocokkan`)}
        class="flex min-w-[140px] shrink-0 snap-start flex-col items-center gap-2 rounded-3xl bg-emerald-500 p-4 text-white shadow-sm active:scale-95"
      >
        <span class="text-4xl">🧩</span>
        <span class="font-black">Cocokkan</span>
      </button>

      <button
        onclick={() => goto(`${base}/ucapkan`)}
        class="flex min-w-[140px] shrink-0 snap-start flex-col items-center gap-2 rounded-3xl bg-teal-500 p-4 text-white shadow-sm active:scale-95"
      >
        <span class="text-4xl">🎤</span>
        <span class="font-black">Ucapkan</span>
      </button>

      <button
        onclick={() => goto(`${base}/menulis`)}
        class="flex min-w-[140px] shrink-0 snap-start flex-col items-center gap-2 rounded-3xl bg-violet-500 p-4 text-white shadow-sm active:scale-95"
      >
        <span class="text-4xl">✍️</span>
        <span class="font-black">Menulis</span>
      </button>

      <button
        onclick={() => goto(`${base}/mesin`)}
        class="flex min-w-[140px] shrink-0 snap-start flex-col items-center gap-2 rounded-3xl bg-orange-500 p-4 text-white shadow-sm active:scale-95"
      >
        <span class="text-4xl">🎰</span>
        <span class="font-black">Mesin Kata</span>
      </button>
    </div>
  </div>
{/if}

{#snippet node(/** @type {number} */ id, /** @type {boolean} */ large)}
  {@const state = getLevelState(id)}
  {@const lvl = getLevel(id)}
  <button 
    class="relative flex flex-col items-center justify-start gap-1 outline-none transition-transform active:scale-90 {wobblingId === id ? 'tile-wobble' : ''} {large ? 'w-24' : 'w-[70px]'}"
    onclick={() => handleTap(id, state.locked)}
  >
    <div class="relative flex items-center justify-center rounded-full border-4 shadow-sm transition-colors
      {large ? 'h-20 w-20 text-4xl' : 'h-[70px] w-[70px] text-3xl'}
      {state.locked ? 'bg-slate-50 border-slate-200 text-slate-300' 
       : state.complete ? 'bg-amber-100 border-amber-400 text-amber-600' 
       : 'bg-white border-sky-400'}
      {!state.locked && !state.complete ? 'shadow-sky-200 shadow-lg' : ''}"
    >
      <!-- Background pulsing for unlocked but not complete nodes -->
      {#if !state.locked && !state.complete}
        <div class="absolute inset-0 -z-10 rounded-full bg-sky-200 animate-ping opacity-75" style="animation-duration: 2s;"></div>
      {/if}

      <span>{state.locked ? '🔒' : state.complete ? '⭐' : icons[id]}</span>
      
      <!-- Robot Avatar -->
      {#if activeNodeId === id}
        <div class="absolute {large ? '-top-10 -right-5' : '-top-10 -right-6'} z-20 pointer-events-none drop-shadow-md {state.complete ? '' : 'animate-bounce-slow'}">
          <RobotAvatar color={p?.avatar || 'blue'} size={54} />
        </div>
      {/if}
    </div>
    <div class="flex flex-col items-center leading-tight">
      <span class="text-[13px] font-black {state.locked ? 'text-slate-400' : 'text-slate-600'}">{lvl?.node}</span>
      {#if large}
        <span class="text-[10px] font-bold {state.locked ? 'text-slate-300' : 'text-slate-400'} leading-none px-1 text-center truncate w-full">{lvl?.title}</span>
      {/if}
    </div>
  </button>
{/snippet}

{#if toastMsg}
  <div class="fixed bottom-10 left-1/2 z-50 w-[90%] max-w-[300px] -translate-x-1/2 animate-pop rounded-full bg-slate-800 px-6 py-4 text-center text-sm font-bold text-white shadow-lg">
    {toastMsg}
  </div>
{/if}

<style>
  :global(.animate-pop) { animation: pop 0.4s ease; }
  @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.1); } 100% { transform: scale(1); } }
  
  .animate-bounce-slow { animation: bounce 2s infinite; }
  @keyframes bounce { 
    0%, 100% { transform: translateY(0); } 
    50% { transform: translateY(-8px); } 
  }
  
  :global(.tile-wobble) { animation: wobble 0.4s ease-in-out; }
  @keyframes wobble {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px) rotate(-5deg); }
    40% { transform: translateX(8px) rotate(5deg); }
    60% { transform: translateX(-4px) rotate(-2deg); }
    80% { transform: translateX(4px) rotate(2deg); }
  }

  /* Hide scrollbar for bonus strip */
  ::-webkit-scrollbar {
    display: none;
  }
</style>
