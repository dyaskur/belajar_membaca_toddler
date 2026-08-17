<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy, onMount } from 'svelte';
  import Confetti from '$lib/components/Confetti.svelte';
  import { player } from '$lib/audio/player.svelte.js';
  import { sfxJackpot } from '$lib/audio/sfx.js';
  import {
    CARI_KATA_LEVELS,
    generateBoard,
    pathBetween,
    wordAtPath
  } from '$lib/content/cari-kata.js';
  import {
    CARI_KATA_FUNNY,
    CARI_KATA_PRAISE,
    CARI_KATA_LINES,
    UNSAFE_WORDS
  } from '$lib/content/kata-catalog.js';
  import { profiles } from '$lib/stores/profiles.svelte.js';

  /** @type {'entry'|'playing'|'complete'} */
  let phase = $state('entry');
  /** @type {import('$lib/content/cari-kata.js').CariKataBoard|null} */
  let board = $state(null);
  /** @type {'mudah'|'sedang'|'sulit'} */
  let level = $state('mudah');
  let boardNumber = $state(0);
  let seedBase = $state(/** @type {string|number} */ (Date.now()));
  let selected = $state(/** @type {number[]} */ ([]));
  let tapAnchor = $state(/** @type {number|null} */ (null));
  let focusIndex = $state(0);
  let foundWords = $state(/** @type {string[]} */ ([]));
  let message = $state('');
  let hintIndex = $state(/** @type {number|null} */ (null));
  let reducedMotion = $state(false);
  let dragStart = /** @type {number|null} */ (null);
  let dragAxis = /** @type {'h'|'v'|null} */ (null);
  let dragMoved = false;
  let dragPointer = /** @type {number|null} */ (null);
  let hintTimer = /** @type {ReturnType<typeof setTimeout>|undefined} */ (undefined);
  let speechToken = 0;
  /** @type {HTMLDivElement|undefined} */
  let boardEl = $state(/** @type {HTMLDivElement|undefined} */ (undefined));
  /** @type {Confetti} */
  let confetti;

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const config = $derived(CARI_KATA_LEVELS[level]);
  const foundCells = $derived.by(() => {
    const cells = new Set();
    if (!board) return cells;
    for (const target of board.targets) {
      if (foundWords.includes(target.entry.w)) target.path.forEach((index) => cells.add(index));
    }
    return cells;
  });

  onMount(() => {
    if (!profiles.active) return goto(`${base}/belajar`);
    level = profiles.active.cariKataLevel ?? 'mudah';
    const querySeed = new URLSearchParams(location.search).get('seed');
    if (querySeed) seedBase = querySeed;
    reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    player.ensureLevel(voiceId, 2).catch(() => {});
    player.ensureLevel(voiceId, 'cari-kata').catch(() => {});
  });

  onDestroy(() => {
    speechToken++;
    player.stop();
    clearTimeout(hintTimer);
  });

  /** @param {any[]} items */
  const pick = (items) => items[Math.floor(Math.random() * items.length)];

  function scheduleHint() {
    clearTimeout(hintTimer);
    hintIndex = null;
    hintTimer = setTimeout(() => {
      const next = board?.targets.find((target) => !foundWords.includes(target.entry.w));
      hintIndex = next?.path[0] ?? null;
    }, 30_000);
  }

  /** @param {'mudah'|'sedang'|'sulit'} next */
  function start(next) {
    level = next;
    profiles.setCariKataLevel(next);
    boardNumber++;
    board = generateBoard(next, {
      seed: `${seedBase}-${boardNumber}`,
      collected: profiles.kataWords
    });
    selected = [];
    tapAnchor = null;
    foundWords = [];
    message = 'Temukan tiga kata!';
    hintIndex = null;
    phase = 'playing';
    scheduleHint();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
  }

  function newBoard() {
    start(level);
  }

  function back() {
    if (phase !== 'entry') {
      phase = 'entry';
      selected = [];
      tapAnchor = null;
      clearTimeout(hintTimer);
      player.stop();
      return;
    }
    goto(`${base}/belajar`);
  }

  /** @param {import('$lib/content/kata-catalog.js').CatalogWord} entry */
  async function speakWord(entry) {
    await Promise.all([
      player.ensureLevel(voiceId, 2),
      player.ensureLevel(voiceId, 'cari-kata')
    ]);
    if (player.variantCount(voiceId, 'cari-kata', entry.w) > 0) {
      return player.speak(voiceId, 'cari-kata', entry.w);
    }
    return player.speakChain(voiceId, 2, entry.syl, 70);
  }

  /** @param {string} line */
  async function speakLine(line) {
    await player.ensureLevel(voiceId, 'cari-kata');
    return player.speak(voiceId, 'cari-kata', line);
  }

  /** @param {number[]} path */
  async function commit(path) {
    if (!board || path.length < 2) return;
    const token = ++speechToken;
    const { w, entry } = wordAtPath(board.cells, path);
    selected = [];
    tapAnchor = null;
    hintIndex = null;

    if (UNSAFE_WORDS.includes(w)) {
      player.stop();
      message = CARI_KATA_LINES[2];
      return;
    }

    const target = board.targets.find((item) => item.entry.w === w && !foundWords.includes(w));
    if (!entry) {
      message = `${w} — hihihi, lucu ya!`;
      await player.speakChain(voiceId, 2, path.map((index) => board?.cells[index] ?? ''), 70);
      if (token !== speechToken) return;
      await speakLine(pick(CARI_KATA_FUNNY));
      return;
    }

    await speakWord(entry);
    if (token !== speechToken) return;

    if (entry.photo || entry.e) {
      const isNew = profiles.addKataWord(entry.w);
      message = target
        ? `${entry.w} ditemukan${isNew ? ' — BARU!' : '!'}`
        : `${entry.w} juga ada di Album Kata${isNew ? ' — BARU!' : '!'}`;
      confetti?.fire(target ? 65 : 30);
      sfxJackpot();
      if (target) {
        foundWords = [...foundWords, entry.w];
        scheduleHint();
      }
    } else {
      profiles.addKataBonus();
      message = `${entry.w} adalah kata bonus!`;
      confetti?.fire(22);
    }

    const allFound = foundWords.length === 3;
    if (allFound) {
      clearTimeout(hintTimer);
      phase = 'complete';
      confetti?.fire(120);
    }
    await speakLine(pick(CARI_KATA_PRAISE));
    if (token !== speechToken) return;
    if (allFound) {
      await speakLine(CARI_KATA_LINES[3]);
    }
  }

  /** @param {number} index */
  function handleTap(index) {
    if (!board) return;
    if (tapAnchor === null) {
      tapAnchor = index;
      selected = [index];
      message = 'Pilih kotak terakhir';
      return;
    }
    const path = pathBetween(tapAnchor, index, board.size);
    if (path.length >= 2) {
      void commit(path);
      return;
    }
    tapAnchor = index;
    selected = [index];
    message = 'Pilih ke kanan atau ke bawah';
  }

  /** @param {EventTarget|null} target */
  function targetIndex(target) {
    const cell = target instanceof Element ? target.closest('[data-cell]') : null;
    const raw = cell?.getAttribute('data-cell');
    return raw === null || raw === undefined ? null : Number(raw);
  }

  /** @param {PointerEvent} event */
  function pointerDown(event) {
    const index = targetIndex(event.target);
    if (index === null || !board) return;
    dragStart = index;
    dragAxis = null;
    dragMoved = false;
    dragPointer = event.pointerId;
    selected = [index];
    boardEl?.setPointerCapture(event.pointerId);
  }

  /** @param {PointerEvent} event */
  function pointerMove(event) {
    if (dragStart === null || dragPointer !== event.pointerId || !board) return;
    const underPointer = document.elementFromPoint(event.clientX, event.clientY);
    const index = targetIndex(underPointer);
    if (index === null || index === dragStart) return;
    const sr = Math.floor(dragStart / board.size);
    const sc = dragStart % board.size;
    const er = Math.floor(index / board.size);
    const ec = index % board.size;
    if (!dragAxis) dragAxis = Math.abs(ec - sc) >= Math.abs(er - sr) ? 'h' : 'v';
    const projected = dragAxis === 'h'
      ? sr * board.size + Math.max(sc, ec)
      : Math.max(sr, er) * board.size + sc;
    const path = pathBetween(dragStart, projected, board.size);
    if (path.length) {
      selected = path;
      dragMoved ||= path.length > 1;
    }
  }

  /** @param {PointerEvent} event */
  function pointerUp(event) {
    if (dragStart === null || dragPointer !== event.pointerId) return;
    const start = dragStart;
    const path = selected;
    if (boardEl?.hasPointerCapture(event.pointerId)) boardEl.releasePointerCapture(event.pointerId);
    dragStart = null;
    dragAxis = null;
    dragPointer = null;
    if (dragMoved && path.length >= 2) void commit(path);
    else handleTap(start);
    dragMoved = false;
  }

  function cancelSelection() {
    selected = [];
    tapAnchor = null;
    dragStart = null;
    dragPointer = null;
  }

  /** @param {KeyboardEvent} event @param {number} index */
  function cellKeydown(event, index) {
    if (!board) return;
    const row = Math.floor(index / board.size);
    const col = index % board.size;
    let next = index;
    if (event.key === 'ArrowLeft') next = row * board.size + Math.max(0, col - 1);
    else if (event.key === 'ArrowRight') next = row * board.size + Math.min(board.size - 1, col + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * board.size + col;
    else if (event.key === 'ArrowDown') next = Math.min(board.size - 1, row + 1) * board.size + col;
    else if (event.key === ' ') {
      event.preventDefault();
      if (tapAnchor === null) {
        tapAnchor = index;
        selected = [index];
      } else {
        const path = pathBetween(tapAnchor, index, board.size);
        if (path.length) selected = path;
      }
      return;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selected.length >= 2) void commit(selected);
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelSelection();
      return;
    } else return;

    event.preventDefault();
    focusIndex = next;
    const nextCell = boardEl?.querySelector(`button[data-cell="${next}"]`);
    if (nextCell instanceof HTMLElement) nextCell.focus();
    if (tapAnchor !== null) {
      const path = pathBetween(tapAnchor, next, board.size);
      if (path.length) selected = path;
    }
  }
</script>

<svelte:head>
  <title>Cari Kata · Ayo Belajar Membaca</title>
</svelte:head>

<Confetti bind:this={confetti} />

<header class="mb-4 flex items-center justify-between">
  <button type="button" onclick={back} class="back-button" aria-label="Kembali">←</button>
  <span class="font-black text-amber-700">🔍 Cari Kata</span>
  <a
    href="{base}/stiker?tab=cari-kata"
    class="relative rounded-2xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-700 shadow"
  >
    📒 Album
    {#if profiles.newKataWordCount > 0}
      <span class="absolute -right-2 -top-2 rounded-full bg-rose-500 px-1.5 text-xs text-white">+{profiles.newKataWordCount}</span>
    {/if}
  </a>
</header>

{#if profiles.active}
  {#if phase === 'entry'}
    <main class="mx-auto grid w-full max-w-xl flex-1 place-content-center gap-6 pb-8 text-center">
      <div>
        <div class="mx-auto mb-3 grid h-24 w-24 place-items-center rounded-[2rem] bg-amber-100 text-5xl shadow-lg">🔍</div>
        <h1 class="text-3xl font-black text-slate-700">Cari Kata</h1>
        <p class="mt-2 font-bold text-slate-400">Geser suku kata dari kiri ke kanan atau dari atas ke bawah</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        {#each Object.values(CARI_KATA_LEVELS) as choice}
          <button
            type="button"
            onclick={() => start(choice.key)}
            class="level-button rounded-3xl px-4 py-5 text-white shadow-lg active:translate-y-1"
            style={`--level-color:${choice.color}`}
          >
            <strong class="block text-xl">{choice.label}</strong>
            <span class="text-sm font-bold opacity-85">{choice.size}×{choice.size} · {choice.counts.join('–')} suku</span>
          </button>
        {/each}
      </div>

      <a href="{base}/stiker?tab=cari-kata" class="rounded-2xl bg-white px-5 py-3 font-black text-amber-700 shadow">
        📒 Buka Album Kata
      </a>
    </main>
  {:else if board}
    <main class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
      <div class="flex items-center justify-between rounded-2xl bg-white px-4 py-2 shadow-sm">
        <span class="font-black text-slate-600">{config.label} · {board.size}×{board.size}</span>
        <span class="text-sm font-bold text-slate-400">{foundWords.length}/3 ditemukan</span>
      </div>

      <section aria-label="Kata yang dicari" class="grid grid-cols-3 gap-2">
        {#each board.targets as target (target.entry.w)}
          {@const found = foundWords.includes(target.entry.w)}
          <button
            type="button"
            data-target-word={target.entry.w}
            data-path={target.path.join(',')}
            onclick={() => speakWord(target.entry)}
            class="target-card rounded-2xl border-2 px-2 py-2 text-center shadow-sm active:scale-95"
            class:target-found={found}
            aria-label={`Dengarkan kata ${target.entry.w}${found ? ', ditemukan' : ''}`}
          >
            <span class="block text-2xl" aria-hidden="true">{found ? (target.entry.e ?? '🖼️') : '❔'}</span>
            <strong class="block truncate text-sm capitalize">{target.entry.w}</strong>
            <small class="font-bold opacity-60">{target.entry.syl.join(' · ')}</small>
          </button>
        {/each}
      </section>

      <div
        bind:this={boardEl}
        class="word-board mx-auto grid w-full max-w-[520px] gap-1.5 rounded-3xl bg-amber-100 p-2.5 shadow-inner"
        style={`grid-template-columns:repeat(${board.size},minmax(0,1fr))`}
        onpointerdown={pointerDown}
        onpointermove={pointerMove}
        onpointerup={pointerUp}
        onpointercancel={cancelSelection}
        role="grid"
        tabindex="-1"
        aria-label={`Papan Cari Kata ${board.size} kali ${board.size}`}
      >
        {#each board.cells as syllable, index}
          {@const active = selected.includes(index)}
          {@const permanent = foundCells.has(index)}
          <button
            type="button"
            data-cell={index}
            role="gridcell"
            tabindex={focusIndex === index ? 0 : -1}
            onfocus={() => (focusIndex = index)}
            onkeydown={(event) => cellKeydown(event, index)}
            class="board-cell aspect-square rounded-xl font-black uppercase shadow-sm"
            class:cell-selected={active}
            class:cell-found={permanent}
            class:cell-hint={hintIndex === index}
            class:reduce-hint={hintIndex === index && reducedMotion}
            aria-selected={active || permanent}
            aria-label={`Suku kata ${syllable}`}
          >{syllable}</button>
        {/each}
      </div>

      <p class="min-h-7 text-center text-sm font-black text-amber-700" aria-live="polite">{message}</p>

      <div class="mb-4 flex justify-center gap-2">
        <button type="button" onclick={cancelSelection} class="rounded-2xl bg-slate-100 px-4 py-2 font-bold text-slate-500">
          Batal
        </button>
        <button type="button" onclick={newBoard} class="rounded-2xl bg-amber-500 px-4 py-2 font-black text-white shadow">
          Papan Baru
        </button>
      </div>
    </main>
  {/if}

  {#if phase === 'complete'}
    <div class="fixed inset-0 z-40 grid place-items-center bg-slate-900/70 p-5">
      <div class="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="complete-title" tabindex="-1">
        <div class="text-6xl">🎉</div>
        <h2 id="complete-title" class="mt-3 text-2xl font-black text-slate-700">Semua ditemukan!</h2>
        <p class="mt-2 font-bold text-slate-400">Tiga kata sudah masuk ke Album Kata.</p>
        <div class="mt-6 grid gap-3">
          <button type="button" onclick={newBoard} class="rounded-2xl bg-amber-500 px-5 py-3 font-black text-white shadow-lg">Papan Baru</button>
          <button type="button" onclick={() => (phase = 'entry')} class="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-600">Kembali</button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .level-button { background: var(--level-color); box-shadow: 0 6px 0 color-mix(in srgb, var(--level-color), #000 26%); }
  .target-card { border-color: #fde68a; background: #fffbeb; color: #b45309; transition: transform 160ms, background 220ms; }
  .target-found { border-color: #34d399; background: #d1fae5; color: #047857; transform: rotateY(360deg); }
  .word-board { touch-action: none; }
  .board-cell { background: white; color: #475569; font-size: clamp(.9rem, 4.5vw, 1.4rem); transition: transform 120ms, background 120ms, color 120ms; }
  .cell-selected { background: #fbbf24; color: #78350f; transform: scale(.94); }
  .cell-found { background: #34d399; color: white; }
  .cell-hint { animation: hint-pulse 1s ease-in-out infinite; outline: 4px solid #f59e0b; outline-offset: -4px; }
  .reduce-hint { animation: none; }
  @keyframes hint-pulse { 50% { transform: scale(1.08); filter: brightness(1.08); } }
  @media (prefers-reduced-motion: reduce) {
    .level-button:active, .target-card:active, .cell-selected, .target-found { transform: none; }
    .cell-hint { animation: none; }
  }
</style>
