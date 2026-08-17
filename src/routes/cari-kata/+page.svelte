<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy, onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect, sfxJackpot } from '$lib/audio/sfx.js';
  import { DEFAULT_AVATAR, robotColor } from '$lib/content/avatars.js';
  import { catalogEntry, syllableLabel } from '$lib/content/kata-catalog.js';
  import {
    CARI_BONUS,
    CARI_DONE,
    CARI_FOUND,
    CARI_FUNNY,
    CARI_INTRO,
    CARI_SKIP,
    DIFFICULTIES,
    TARGETS_PER_BOARD,
    makeBoard,
    readSelection
  } from '$lib/content/cari-kata.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  /** Syllable clips live in the level-2 bucket; whole words in their own bucket. */
  const SYLLABLE_BUCKET = 2;
  const WORD_BUCKET = 'cari-kata';
  /** Idle time before the first syllable of an unfound word starts pulsing. */
  const HINT_AFTER_MS = 30000;

  let phase = $state(/** @type {'pick'|'play'|'done'} */ ('pick'));
  let board = $state(/** @type {import('$lib/content/cari-kata.js').Board|null} */ (null));
  let found = $state(/** @type {string[]} */ ([]));
  /** Cells belonging to a found target, keyed "r:c", so the trail stays on the board. */
  let trail = $state(/** @type {Record<string, boolean>} */ ({}));
  /** The run being swiped right now. */
  let sel = $state(/** @type {{ row: number, col: number, len: number, dr: number, dc: number }|null} */ (null));
  /** Tap anchor — survives between taps so tap-here-then-tap-there works. */
  let anchor = $state(/** @type {{ row: number, col: number }|null} */ (null));
  let pointerId = $state(/** @type {number|null} */ (null));
  let result = $state(
    /** @type {{ word: string, kind: 'target'|'bonus'|'nonsense'|'blocked', isNew: boolean, e?: string }|null} */ (null)
  );
  let mood = $state(/** @type {'idle'|'happy'|'sad'} */ ('idle'));
  let say = $state('');
  let hintCells = $state(/** @type {Record<string, boolean>} */ ({}));
  let reducedMotion = $state(false);
  /** @type {Confetti} */
  let confetti;

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar ?? DEFAULT_AVATAR));
  const targets = $derived(board?.targets ?? []);
  const remaining = $derived(targets.filter((t) => !found.includes(t.word)));
  const albumBadge = $derived(profiles.newKataWordCount);

  let hintTimer = /** @type {ReturnType<typeof setTimeout>|undefined} */ (undefined);
  let resultTimer = /** @type {ReturnType<typeof setTimeout>|undefined} */ (undefined);

  onMount(() => {
    if (!profiles.active) return goto(`${base}/belajar`);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    player.ensureLevel(voiceId, SYLLABLE_BUCKET).catch(() => {});
    player.ensureLevel(voiceId, WORD_BUCKET).catch(() => {});
  });

  onDestroy(() => {
    player.stop();
    clearTimeout(hintTimer);
    clearTimeout(resultTimer);
  });

  /**
   * Speak a word the natural way when we have a clip for it, otherwise chain its syllables.
   * Nonsense always chains — there can never be a clip for it.
   * @param {string[]} syllables
   */
  function speakWord(syllables) {
    const word = syllables.join('');
    if (player.variantCount(voiceId, WORD_BUCKET, word) > 0) {
      return player.speak(voiceId, WORD_BUCKET, word);
    }
    return player.speakChain(voiceId, SYLLABLE_BUCKET, syllables);
  }

  /**
   * Speak one of the game's own lines. Unlike a word, a phrase has no syllable fallback, so
   * until the `cari-kata` bucket is generated this stays silent rather than handing the
   * child a robotic device voice reading Indonesian with an English accent — the line is on
   * screen either way.
   * @param {string} text
   */
  function speakLine(text) {
    if (player.variantCount(voiceId, WORD_BUCKET, text) === 0) return Promise.resolve();
    return player.speak(voiceId, WORD_BUCKET, text);
  }

  /** @param {string[]} pool */
  function pick(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** @param {'mudah'|'sedang'|'sulit'} key */
  function start(key) {
    profiles.setCariKataLevel(key);
    board = makeBoard(key, { owned: new Set(profiles.kataWords) });
    found = [];
    trail = {};
    result = null;
    hintCells = {};
    mood = 'idle';
    phase = 'play';
    say = CARI_INTRO;
    speakLine(CARI_INTRO).catch(() => {});
    armHint();
  }

  function armHint() {
    clearTimeout(hintTimer);
    hintCells = {};
    hintTimer = setTimeout(() => {
      const next = remaining[0];
      if (next) hintCells = { [`${next.row}:${next.col}`]: true };
    }, HINT_AFTER_MS);
  }

  // --- selection ---------------------------------------------------------

  /** @param {number} row @param {number} col */
  function beginAt(row, col) {
    anchor = { row, col };
    sel = { row, col, len: 1, dr: 0, dc: 0 };
  }

  /**
   * Extend the selection to (row, col). The run locks to the anchor's row or column —
   * whichever the finger left first — and only ever runs right or down.
   * @param {number} row @param {number} col
   */
  function extendTo(row, col) {
    if (!anchor) return;
    const dRow = row - anchor.row;
    const dCol = col - anchor.col;
    if (dRow < 0 || dCol < 0) return; // backwards is not a selection
    if (dRow > 0 && dCol > 0) return; // diagonals are not a selection
    if (dRow === 0 && dCol === 0) {
      sel = { row: anchor.row, col: anchor.col, len: 1, dr: 0, dc: 0 };
      return;
    }
    const dr = dRow > 0 ? 1 : 0;
    const dc = dCol > 0 ? 1 : 0;
    sel = { row: anchor.row, col: anchor.col, len: (dRow || dCol) + 1, dr, dc };
  }

  /** @param {import('$lib/content/cari-kata.js').Board} b @param {{ row: number, col: number, len: number, dr: number, dc: number }} run */
  function syllablesOf(b, run) {
    return Array.from({ length: run.len }, (_, i) => b.cells[run.row + run.dr * i][run.col + run.dc * i]);
  }

  /** @param {number} row @param {number} col */
  function isSelected(row, col) {
    if (!sel) return false;
    for (let i = 0; i < sel.len; i++) {
      if (sel.row + sel.dr * i === row && sel.col + sel.dc * i === col) return true;
    }
    return false;
  }

  function commit() {
    const b = board;
    const run = sel;
    anchor = null;
    sel = null;
    pointerId = null;
    if (!b || !run || run.len < 2) return;

    const syllables = syllablesOf(b, run);
    const outcome = readSelection(syllables, targets.map((t) => t.word));
    clearTimeout(resultTimer);
    clearTimeout(hintTimer);
    hintCells = {};

    if (outcome.kind === 'blocked') {
      // Never spoken. Board generation makes this near-impossible; this is the backstop.
      result = { word: '', kind: 'blocked', isNew: false };
      say = CARI_SKIP;
      speakLine(CARI_SKIP).catch(() => {});
      resultTimer = setTimeout(clearResult, 1600);
      return;
    }

    const isTarget = outcome.kind === 'target';
    const collectible = Boolean(outcome.entry && (outcome.entry.photo || outcome.entry.e));
    const isNew = collectible && !profiles.hasKataWord(outcome.word);

    if (isTarget) {
      found = [...found, outcome.word];
      for (let i = 0; i < run.len; i++) trail[`${run.row + run.dr * i}:${run.col + run.dc * i}`] = true;
    }
    if (collectible) {
      profiles.awardKataWord(outcome.word);
    } else if (outcome.kind === 'bonus') {
      // Real, but there is no card to hand back — count the effort instead.
      profiles.countKataBonus();
    }
    if (isTarget || outcome.kind === 'bonus') {
      mood = 'happy';
      chimeCorrect();
      if (isTarget && !reducedMotion) confetti?.fire();
    } else {
      mood = 'idle';
    }

    result = { word: outcome.word, kind: outcome.kind, isNew, e: outcome.entry?.e };

    // Always read the selection — that is the whole point of the mode — then react.
    speakWord(syllables)
      .then(() => {
        if (result?.word !== outcome.word) return;
        const line = isTarget ? pick(CARI_FOUND) : outcome.kind === 'bonus' ? pick(CARI_BONUS) : pick(CARI_FUNNY);
        say = line;
        return speakLine(line);
      })
      .catch(() => {})
      .finally(() => {
        if (isTarget && found.length >= TARGETS_PER_BOARD) finish();
      });

    resultTimer = setTimeout(clearResult, isTarget ? 2600 : 2000);
  }

  function clearResult() {
    result = null;
    mood = 'idle';
    say = '';
    if (phase === 'play') armHint();
  }

  function finish() {
    phase = 'done';
    say = CARI_DONE;
    sfxJackpot();
    if (!reducedMotion) confetti?.fire(40);
    speakLine(CARI_DONE).catch(() => {});
  }

  // --- pointer / keyboard ------------------------------------------------

  /**
   * One press handles both styles:
   *   - drag: press a cell, slide to the last one, release
   *   - tap-tap: tap the first cell, then tap the last one (the anchor waits in between)
   * Tap-tap is the one that matters — dragging across a grid is genuinely hard at three.
   * @param {PointerEvent} event @param {number} row @param {number} col
   */
  function cellDown(event, row, col) {
    if (phase !== 'play') return;
    /** @type {HTMLElement} */ (event.currentTarget).setPointerCapture(event.pointerId);
    pointerId = event.pointerId;
    if (!anchor) {
      beginAt(row, col);
    } else if (anchor.row === row && anchor.col === col) {
      // pressing the anchor again takes it back
      anchor = null;
      sel = null;
    } else {
      extendTo(row, col); // second tap of a tap-tap — released below
    }
  }

  /** @param {PointerEvent} event */
  function gridMove(event) {
    if (pointerId === null || event.pointerId !== pointerId || !anchor) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    const cell = el instanceof HTMLElement ? el.closest('[data-cell]') : null;
    if (!(cell instanceof HTMLElement)) return;
    const [row, col] = (cell.dataset.cell ?? '').split(':').map(Number);
    if (Number.isFinite(row) && Number.isFinite(col)) extendTo(row, col);
  }

  /**
   * Release. A run of two or more cells is an answer; a single cell is the first tap of a
   * tap-tap, so the anchor is left standing and nothing is committed.
   * @param {PointerEvent} event
   */
  function cellUp(event) {
    if (pointerId !== null && event.pointerId !== pointerId) return;
    pointerId = null;
    if (sel && sel.len >= 2) commit();
  }

  /** Keyboard equivalent of the two taps. @param {KeyboardEvent} event @param {number} row @param {number} col */
  function cellKeydown(event, row, col) {
    if (event.key === 'Escape') {
      anchor = null;
      sel = null;
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (phase !== 'play') return;
    if (!anchor) {
      beginAt(row, col);
      return;
    }
    if (anchor.row === row && anchor.col === col) {
      anchor = null;
      sel = null;
      return;
    }
    extendTo(row, col);
    if (sel && sel.len >= 2) commit();
  }

  /** @param {import('$lib/content/cari-kata.js').Placement} placement */
  function sayTarget(placement) {
    speakWord(placement.syl).catch(() => {});
  }
</script>

<svelte:head><title>Cari Kata</title></svelte:head>

<div class="min-h-dvh bg-gradient-to-b from-amber-50 to-orange-100 px-4 pb-10 pt-4">
  <div class="mx-auto flex max-w-2xl flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <a href="{base}/belajar" class="back-button" aria-label="Kembali">←</a>
      {#if phase !== 'pick'}
        <span class="shrink-0 font-black text-amber-700">🔍 {found.length}/{TARGETS_PER_BOARD}</span>
      {/if}
      <a
        href="{base}/stiker?album=kata"
        class="relative shrink-0 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-black text-amber-700 shadow"
      >
        📔 Album
        {#if albumBadge > 0}
          <span
            class="absolute -right-1 -top-1 rounded-full bg-rose-500 px-2 text-xs font-black text-white"
          >+{albumBadge}</span>
        {/if}
      </a>
    </div>

    {#if phase === 'pick'}
      <div class="flex flex-col items-center gap-6 pt-6 text-center">
        <span class="text-6xl" aria-hidden="true">🔍</span>
        <div>
          <h1 class="text-3xl font-black text-amber-900">Cari Kata</h1>
          <p class="text-amber-800">Geser cari kata tersembunyi di papan</p>
        </div>
        <div class="grid w-full gap-3">
          {#each DIFFICULTIES as tier (tier.key)}
            <button
              type="button"
              onclick={() => start(tier.key)}
              class="tile flex items-center justify-between rounded-3xl px-6 py-5 text-left font-black shadow"
              style="--tile-bg:#fde68a;--tile-border:#f59e0b;--tile-text:#78350f;"
            >
              <span class="flex items-center gap-3 text-2xl">
                <span aria-hidden="true">{tier.icon}</span>{tier.title}
              </span>
              <span class="text-sm font-bold opacity-70">{tier.size}×{tier.size}</span>
            </button>
          {/each}
        </div>
        {#if profiles.kataBonus > 0}
          <p class="text-sm font-bold text-amber-700">Kata bonus ditemukan: {profiles.kataBonus}</p>
        {/if}
      </div>
    {:else if board}
      <div class="flex items-start gap-3">
        <Robot mood={mood} size={72} head={rc.head} body={rc.body} interactive={false} />
        <p class="min-h-14 flex-1 rounded-3xl bg-white/80 px-4 py-3 font-bold text-amber-900 shadow">
          {say || 'Geser dari kiri ke kanan atau dari atas ke bawah.'}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2">
        {#each targets as target (target.word)}
          {@const done = found.includes(target.word)}
          {@const entry = catalogEntry(target.word)}
          <button
            type="button"
            onclick={() => sayTarget(target)}
            class="flex flex-col items-center gap-1 rounded-2xl border-4 bg-white px-2 py-3 shadow transition
              {done ? 'border-emerald-400 opacity-60' : 'border-amber-200'}"
          >
            <span class="text-3xl" aria-hidden="true">{entry?.e ?? '🖼️'}</span>
            <span class="text-xs font-black text-amber-900">
              {done ? target.word : entry ? syllableLabel(entry) : ''}
            </span>
            {#if done}<span class="text-xs font-black text-emerald-600">✓ ketemu</span>{/if}
          </button>
        {/each}
      </div>

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="grid touch-none gap-1.5"
        style="grid-template-columns: repeat({board.size}, minmax(0, 1fr));"
        onpointermove={gridMove}
        onpointerup={cellUp}
        onpointercancel={cellUp}
      >
        {#each board.cells as row, r}
          {#each row as syllable, c}
            {@const key = `${r}:${c}`}
            <button
              type="button"
              data-cell={key}
              onpointerdown={(event) => cellDown(event, r, c)}
              onkeydown={(event) => cellKeydown(event, r, c)}
              aria-pressed={isSelected(r, c)}
              aria-label="Suku kata {syllable}"
              class="tile aspect-square touch-none rounded-2xl text-center text-xl font-black shadow
                {trail[key] ? 'tile-won' : ''}
                {isSelected(r, c) ? 'z-10 scale-105 ring-4 ring-amber-500' : ''}
                {hintCells[key] && !reducedMotion ? 'animate-pulse' : ''}
                {hintCells[key] && reducedMotion ? 'ring-4 ring-sky-400' : ''}"
              style="--tile-bg:#fff7ed;--tile-border:#fdba74;--tile-text:#7c2d12;"
            >{syllable}</button>
          {/each}
        {/each}
      </div>

      {#if result}
        <div class="rounded-3xl bg-white px-5 py-4 text-center shadow-lg">
          {#if result.kind === 'blocked'}
            <p class="text-lg font-black text-slate-500">{CARI_SKIP}</p>
          {:else}
            <p class="text-3xl font-black text-amber-900">
              {result.e ? `${result.e} ` : ''}{result.word}
            </p>
            {#if result.kind === 'target'}
              <p class="font-bold text-emerald-600">{result.isNew ? '✨ Kartu baru di album!' : '✓ Ketemu!'}</p>
            {:else if result.kind === 'bonus'}
              <p class="font-bold text-sky-600">Kata bonus!</p>
            {:else}
              <p class="font-bold text-slate-500">Itu bukan kata — seru juga bunyinya!</p>
            {/if}
          {/if}
        </div>
      {/if}

      {#if phase === 'done'}
        <div class="flex flex-col gap-3 rounded-3xl bg-white px-6 py-6 text-center shadow-lg">
          <p class="text-2xl font-black text-emerald-600">{CARI_DONE}</p>
          <button
            type="button"
            onclick={() => start(board?.difficulty ?? 'mudah')}
            class="tile rounded-3xl px-6 py-4 text-xl font-black shadow"
            style="--tile-bg:#bbf7d0;--tile-border:#22c55e;--tile-text:#14532d;"
          >Papan Baru</button>
          <button
            type="button"
            onclick={() => (phase = 'pick')}
            class="rounded-3xl px-6 py-3 font-bold text-amber-800"
          >Ganti tingkat</button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<Confetti bind:this={confetti} />
