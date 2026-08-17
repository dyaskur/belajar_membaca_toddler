<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount, onDestroy } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { generateBoard, pathBetween, wordAtPath } from '$lib/content/cari-kata.js';
  import { catalogEntry, KATA_FUNNY, KATA_REAL, UNSAFE_WORDS } from '$lib/content/kata-catalog.js';
  import { DEFAULT_AVATAR, robotColor } from '$lib/content/avatars.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  const COLORS = ['bg-rose-400', 'bg-sky-400', 'bg-amber-400'];
  const pick = (/** @type {string[]} */ a) => a[Math.floor(Math.random() * a.length)];

  let phase = $state(/** @type {'home'|'playing'|'complete'} */ ('home'));
  /** @type {'mudah'|'sedang'|'sulit'} */
  let level = $state('mudah');
  let board = $state(/** @type {ReturnType<typeof generateBoard>|null} */ (null));
  /** @type {{ w: string, syl: string[], e?: string, photo?: boolean, path: number[] }[]} */
  let foundTargets = $state([]);
  /** @type {{ path: number[], color: string }[]} */
  let trails = $state([]);
  let selected = $state(/** @type {number[]} */ ([]));
  let anchor = $state(-1);
  let dragging = $state(false);
  let pending = $state(false);
  let busy = $state(false);
  let focusCell = $state(-1);
  let hintIdx = $state(-1);
  let reducedMotion = $state(false);

  /** @type {Confetti} */
  let confetti;
  let hintTimer = /** @type {ReturnType<typeof setTimeout>|undefined} */ (undefined);

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar ?? DEFAULT_AVATAR));
  const hintCell = $derived(hintIdx);
  const runText = $derived(
    selected.length >= 2 ? selected.map((i) => (board?.grid ?? [])[i]).join(' · ') : ''
  );

  onMount(() => {
    if (!profiles.active) return goto(`${base}/belajar`);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    level = profiles.cariKataLevel;
    player.ensureLevel(voiceId, 'cari-kata').catch(() => {});
    player.ensureLevel(voiceId, 2).catch(() => {});
  });

  onDestroy(() => {
    player.stop();
    clearTimeout(hintTimer);
  });

  /** @param {'mudah'|'sedang'|'sulit'} levelId */
  function startGame(levelId) {
    level = levelId;
    profiles.setCariKataLevel(levelId);
    const fresh = generateBoard(levelId, {
      seed: Math.floor(Math.random() * 0xffffffff),
      collected: profiles.kataWords
    });
    board = fresh;
    foundTargets = [];
    trails = [];
    selected = [];
    anchor = -1;
    pending = false;
    focusCell = -1;
    phase = 'playing';
    armHint();
  }

  function resumeHint() {
    armHint();
  }

  function armHint() {
    clearTimeout(hintTimer);
    hintIdx = -1;
    hintTimer = setTimeout(() => {
      const unfound = board?.targets.find((t) => !foundTargets.some((f) => f.w === t.w));
      if (unfound && phase === 'playing') hintIdx = unfound.path[0];
    }, 30000);
  }

  // --- Selection: drag + tap-tap ------------------------------------------

  /** @param {number} i */
  function beginSelection(i) {
    if (busy || !board || phase !== 'playing') return;
    hintIdx = -1;
    if (pending && anchor >= 0) {
      const run = pathBetween(anchor, i, board.size);
      if (run.length >= 2) {
        pending = false;
        selected = run;
        dragging = true;
        return;
      }
      // Second tap is not a valid forward run — fresh anchor instead.
      pending = false;
    }
    anchor = i;
    selected = [i];
    dragging = true;
  }

  /** @param {number} i */
  function extendSelection(i) {
    if (!dragging || !board || busy) return;
    const run = pathBetween(anchor, i, board.size);
    if (run.length >= 2) selected = run;
  }

  function endSelection() {
    if (!board || phase !== 'playing') return;
    dragging = false;
    if (selected.length >= 2) {
      const path = selected;
      selected = [];
      anchor = -1;
      commitRun(path);
    } else if (selected.length === 1) {
      pending = true; // tap-tap: await the second cell
    }
  }

  function onKeydown(/** @type {KeyboardEvent} */ e) {
    if (phase !== 'playing' || !board) return;
    const size = board.size;
    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const r = focusCell >= 0 ? Math.floor(focusCell / size) : 0;
      const c = focusCell >= 0 ? focusCell % size : 0;
      let nr = r;
      let nc = c;
      if (e.key === 'ArrowRight') nc = Math.min(c + 1, size - 1);
      if (e.key === 'ArrowLeft') nc = Math.max(c - 1, 0);
      if (e.key === 'ArrowDown') nr = Math.min(r + 1, size - 1);
      if (e.key === 'ArrowUp') nr = Math.max(r - 1, 0);
      focusCell = nr * size + nc;
      return;
    }
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (focusCell < 0) focusCell = 0;
      if (anchor < 0) {
        anchor = focusCell;
        selected = [focusCell];
      } else {
        const run = pathBetween(anchor, focusCell, size);
        if (run.length >= 2) selected = run;
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selected.length >= 2) endSelection();
      return;
    }
    if (e.key === 'Escape') {
      selected = [];
      anchor = -1;
      pending = false;
    }
  }

  // --- Result flow ----------------------------------------------------------

  /** @param {number[]} path */
  async function commitRun(path) {
    if (busy || !board) return;
    const { w } = wordAtPath(board.grid, path);
    if (!w) return;
    if (UNSAFE_WORDS.includes(w)) {
      // Defense in depth — generation should already prevent this.
      player.speak(voiceId, 'cari-kata', `Coba cari kata lain`).catch(() => {});
      return;
    }
    busy = true;
    const entry = catalogEntry(w);
    const isPicture = !!(entry && (entry.e || entry.photo));
    const target = board.targets.find((t) => t.w === w);

    if (target) {
      await player.speak(voiceId, 'cari-kata', w);
      if (!foundTargets.some((f) => f.w === w)) {
        foundTargets = [...foundTargets, target];
        trails = [...trails, { path, color: COLORS[foundTargets.length - 1] }];
        profiles.addKataWord(w);
        await player.speak(voiceId, 'cari-kata', pick(KATA_REAL));
        confetti?.fire(foundTargets.length === board.targets.length ? 80 : 30);
        if (foundTargets.length === board.targets.length) {
          phase = 'complete';
          await player.speak(voiceId, 'cari-kata', `Kamu menemukan semua kata!`);
          return;
        }
      } else {
        await player.speak(voiceId, 'cari-kata', pick(KATA_REAL));
      }
    } else if (entry) {
      await player.speak(voiceId, 'cari-kata', w);
      if (isPicture) {
        profiles.addKataWord(w);
      } else {
        profiles.addKataBonus();
        confetti?.fire(16);
      }
      await player.speak(voiceId, 'cari-kata', pick(KATA_REAL));
    } else {
      // Nonsense: sounding-out read, then a playful giggle. No penalty.
      const grid = /** @type {string[]} */ (board.grid);
      await player.speakChain(voiceId, 2, path.map((i) => grid[i]));
      await player.speak(voiceId, 'cari-kata', pick(KATA_FUNNY));
    }
    busy = false;
    armHint();
  }

  function newBoard() {
    startGame(level);
  }

  function replayTarget(/** @type {{ w: string }} */ t) {
    player.speak(voiceId, 'cari-kata', t.w).catch(() => {});
  }
</script>

<svelte:head>
  <title>Cari Kata</title>
</svelte:head>

<svelte:window onpointerup={endSelection} />

<Confetti bind:this={confetti} />

{#if phase === 'home'}
  <div class="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
    <Robot mood="happy" size={130} head={rc.head} body={rc.body} />
    <h1 class="text-3xl font-black text-slate-800">🔍 Cari Kata</h1>
    <p class="max-w-sm text-lg text-slate-500">Geser jarimu di papan untuk menemukan kata tersembunyi!</p>

    <div class="grid w-full max-w-xs gap-3">
      <button
        onclick={() => startGame('mudah')}
        class="rounded-2xl bg-emerald-400 px-6 py-4 text-xl font-black text-white shadow-[0_6px_0_#059669] active:translate-y-1 active:shadow-none"
      >Mudah · 4×4</button>
      <button
        onclick={() => startGame('sedang')}
        class="rounded-2xl bg-sky-400 px-6 py-4 text-xl font-black text-white shadow-[0_6px_0_#0284c7] active:translate-y-1 active:shadow-none"
      >Sedang · 5×5</button>
      <button
        onclick={() => startGame('sulit')}
        class="rounded-2xl bg-violet-400 px-6 py-4 text-xl font-black text-white shadow-[0_6px_0_#7c3aed] active:translate-y-1 active:shadow-none"
      >Sulit · 6×6</button>
    </div>

    <button
      onclick={() => goto(`${base}/stiker?tab=cari-kata`)}
      class="rounded-2xl bg-amber-100 px-6 py-3 text-lg font-bold text-amber-700 active:scale-95"
    >📒 Album Kata</button>
  </div>
{:else}
  <header class="mb-2 flex items-center justify-between">
    <button onclick={() => { player.stop(); goto(`${base}/belajar`); }} class="back-button" aria-label="Kembali">←</button>
    <span class="text-center font-bold text-slate-500">🔍 Cari Kata · {level === 'mudah' ? 'Mudah' : level === 'sedang' ? 'Sedang' : 'Sulit'}</span>
    <button
      onclick={() => goto(`${base}/stiker?tab=cari-kata`, { state: { kata: 'open' } })}
      class="rounded-xl bg-orange-100 px-3 py-1 font-bold text-orange-600 active:scale-95"
      aria-label="Album Kata"
    >📒</button>
  </header>

  {#if phase === 'complete'}
    <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <Robot mood="happy" size={150} head={rc.head} body={rc.body} />
      <h2 class="text-3xl font-black text-slate-800">Kamu menemukan semua kata!</h2>
      <div class="flex flex-wrap justify-center gap-3 py-2">
        {#each foundTargets as t}
          <div class="rounded-2xl bg-white px-4 py-2 font-bold shadow">
            <span class="text-xl">{t.e || '🔍'} {t.w}</span>
          </div>
        {/each}
      </div>
      <div class="flex gap-3">
        <button
          onclick={newBoard}
          class="rounded-2xl bg-orange-500 px-6 py-4 text-lg font-bold text-white shadow active:scale-95"
        >Papan Baru</button>
        <button
          onclick={() => goto(`${base}/belajar`)}
          class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold shadow active:scale-95"
        >Kembali</button>
      </div>
    </div>
  {:else}
    <div class="flex flex-1 flex-col gap-3">
      <!-- Target cards -->
      <div class="grid grid-cols-3 gap-2">
        {#each board?.targets ?? [] as t, _i}
          {@const owned = foundTargets.some((f) => f.w === t.w)}
          <button
            data-word={t.w}
            data-found={owned}
            onclick={() => (owned ? replayTarget(t) : null)}
            disabled={!owned}
            class="flex flex-col items-center rounded-xl border-2 p-2 active:scale-95 disabled:active:scale-100 {owned ? 'border-amber-300 bg-amber-50 shadow-sm' : 'border-slate-100 bg-slate-50'}"
          >
            <span class="text-3xl">{owned ? (t.e || '🔍') : '❓'}</span>
            {#if owned}
              <span class="mt-1 text-sm font-bold text-slate-800">{t.w}</span>
            {:else}
              <span class="mt-1 text-sm font-bold text-slate-300">{'·'.repeat(t.syl.length)}</span>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Board -->
      <div
        class="relative mx-auto w-full max-w-sm"
        tabindex="0"
        role="grid"
        aria-label="Papan Cari Kata"
        onkeydown={onKeydown}
        onpointerup={endSelection}
        onpointercancel={endSelection}
      >
        <div
          class="grid gap-1.5"
          style="grid-template-columns: repeat({board?.size}, 1fr)"
        >
          {#each board?.grid ?? [] as cell, i}
            {@const found = trails.find((tr) => tr.path.includes(i))}
            <button
              role="gridcell"
              data-cell={i}
              aria-label="Suku kata {cell}"
              tabindex="-1"
              class={'flex aspect-square items-center justify-center rounded-xl border-2 text-lg font-black shadow-sm active:scale-95 ' +
                (found ? (found.color + ' border-transparent text-white') :
                 selected.includes(i) ? 'border-orange-400 bg-orange-100 text-slate-800 ring-4 ring-orange-300' :
                 hintCell === i ? ('border-sky-300 bg-sky-50 text-slate-800 ring-4 ring-sky-300 ' + (reducedMotion ? '' : 'animate-pulse')) :
                 focusCell === i ? 'border-orange-400 bg-orange-50 text-slate-800' :
                 'border-slate-200 bg-white text-slate-700')}
              onpointerdown={() => beginSelection(i)}
              onpointermove={() => extendSelection(i)}
            >{cell}</button>
          {/each}
        </div>
      </div>

      <p class="min-h-6 text-center text-sm text-slate-500">
        {runText || 'Geser atau ketuk dua sel'}
      </p>
    </div>
  {/if}
{/if}