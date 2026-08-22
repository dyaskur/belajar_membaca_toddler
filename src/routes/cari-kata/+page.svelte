<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy, onMount, tick } from 'svelte';
  import Confetti from '$lib/components/Confetti.svelte';
  import { player } from '$lib/audio/player.svelte.js';
  import { sfxJackpot } from '$lib/audio/sfx.js';
  import {
    CARI_KATA_LEVELS,
    generateBoard,
    pathBetween,
    pickStickerReward,
    wordAtPath
  } from '$lib/content/cari-kata.js';
  import {
    CARI_KATA_FUNNY,
    CARI_KATA_PRAISE,
    CARI_KATA_LINES,
    UNSAFE_WORDS
  } from '$lib/content/kata-catalog.js';
  import { profiles } from '$lib/stores/profiles.svelte.js';

  /** @type {'entry'|'playing'|'reward'} */
  let phase = $state('entry');
  /** @type {'gather'|'ready'|'shuffle'|'choose'|'opening'|'revealed'} */
  let rewardStage = $state('gather');
  let rewardEntries = $state(/** @type {import('$lib/content/kata-catalog.js').CatalogWord[]} */ ([]));
  let rewardedWord = $state(/** @type {import('$lib/content/kata-catalog.js').CatalogWord|null} */ (null));
  let chosenPrize = $state(/** @type {number|null} */ (null));
  let rewardIsNew = $state(false);
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
  let rewardTimer = /** @type {ReturnType<typeof setTimeout>|undefined} */ (undefined);
  let speechToken = 0;
  let brokenTargetImg = $state(/** @type {Set<string>} */ (new Set()));
  let brokenTargetSil = $state(/** @type {Set<string>} */ (new Set()));
  /** @type {HTMLDivElement|undefined} */
  let boardEl = $state(/** @type {HTMLDivElement|undefined} */ (undefined));
  /** @type {HTMLDivElement|undefined} */
  let rewardDialog = $state(/** @type {HTMLDivElement|undefined} */ (undefined));
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
    clearTimeout(rewardTimer);
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
    speechToken++;
    player.stop();
    clearTimeout(rewardTimer);
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
    rewardEntries = [];
    rewardedWord = null;
    chosenPrize = null;
    rewardIsNew = false;
    rewardStage = 'gather';
    phase = 'playing';
    scheduleHint();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
  }

  function newBoard() {
    start(level);
  }

  function back() {
    if (phase !== 'entry') {
      speechToken++;
      phase = 'entry';
      selected = [];
      tapAnchor = null;
      foundWords = [];
      rewardEntries = [];
      rewardedWord = null;
      chosenPrize = null;
      clearTimeout(hintTimer);
      clearTimeout(rewardTimer);
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

  async function focusRewardControl() {
    await tick();
    const control = rewardDialog?.querySelector('button:not([disabled]), a[href]');
    if (control instanceof HTMLElement) control.focus();
    else rewardDialog?.focus();
  }

  function beginReward() {
    if (!board) return;
    clearTimeout(hintTimer);
    clearTimeout(rewardTimer);
    rewardEntries = board.targets.map((target) => target.entry);
    rewardedWord = null;
    chosenPrize = null;
    rewardIsNew = false;
    rewardStage = 'gather';
    phase = 'reward';
    void focusRewardControl();
    rewardTimer = setTimeout(() => {
      if (phase !== 'reward' || rewardStage !== 'gather') return;
      rewardStage = 'ready';
      void focusRewardControl();
    }, reducedMotion ? 40 : 900);
  }

  function shuffleRewards() {
    if (rewardStage !== 'ready') return;
    speechToken++;
    player.stop();
    rewardStage = 'shuffle';
    clearTimeout(rewardTimer);
    rewardTimer = setTimeout(() => {
      if (phase !== 'reward' || rewardStage !== 'shuffle') return;
      rewardStage = 'choose';
      void focusRewardControl();
    }, reducedMotion ? 40 : 950);
  }

  /** @param {number} cardIndex */
  function choosePrize(cardIndex) {
    if (rewardStage !== 'choose') return;
    const prize = pickStickerReward(rewardEntries, profiles.kataWords);
    if (!prize) return;
    chosenPrize = cardIndex;
    rewardedWord = prize;
    rewardIsNew = profiles.addKataWord(prize.w);
    if (!rewardIsNew) profiles.addKataBonus();
    rewardStage = 'opening';
    message = rewardIsNew
      ? `Stiker baru: ${prize.w}!`
      : `${prize.w} sudah ada — dapat satu Kata Bonus!`;
    void focusRewardControl();
    clearTimeout(rewardTimer);
    rewardTimer = setTimeout(() => {
      if (phase !== 'reward' || rewardStage !== 'opening') return;
      rewardStage = 'revealed';
      sfxJackpot();
      confetti?.fire(120);
      void speakWord(prize);
      void focusRewardControl();
    }, reducedMotion ? 80 : 1050);
  }

  /** @param {KeyboardEvent} event */
  function rewardKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      back();
      return;
    }
    if (event.key !== 'Tab' || !rewardDialog) return;
    const controls = [...rewardDialog.querySelectorAll('button:not([disabled]), a[href]')];
    if (!controls.length) {
      event.preventDefault();
      rewardDialog.focus();
      return;
    }
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      if (last instanceof HTMLElement) last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      if (first instanceof HTMLElement) first.focus();
    }
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

    const boardTarget = board.targets.find((item) => item.entry.w === w);
    const target = boardTarget && !foundWords.includes(w) ? boardTarget : null;
    if (!entry) {
      message = `${w} — hihihi, lucu ya!`;
      await player.speakChain(voiceId, 2, path.map((index) => board?.cells[index] ?? ''), 70);
      if (token !== speechToken) return;
      await speakLine(pick(CARI_KATA_FUNNY));
      return;
    }

    await speakWord(entry);
    if (token !== speechToken) return;

    if (boardTarget && !target) {
      message = `${entry.w} sudah ditemukan`;
      return;
    }

    if (target) {
      foundWords = [...foundWords, entry.w];
      message = `${entry.w} ditemukan!`;
      confetti?.fire(38);
      sfxJackpot();
      if (foundWords.length < 3) scheduleHint();
    } else {
      profiles.addKataBonus();
      message = `${entry.w} adalah kata bonus!`;
      confetti?.fire(22);
    }

    const allFound = foundWords.length === 3;
    if (allFound) {
      beginReward();
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
            class="level-button rounded-3xl px-4 py-4 text-white shadow-lg active:translate-y-1"
            style={`--level-color:${choice.color}`}
            aria-label={`${choice.label}, ${choice.hint}, papan ${choice.size} kali ${choice.size}`}
          >
            <span class="level-icon mx-auto mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-3xl" aria-hidden="true">{choice.icon}</span>
            <strong class="block text-xl">{choice.label}</strong>
            <span class="block text-xs font-black uppercase tracking-wide opacity-90">{choice.hint}</span>
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
        <span class="font-black text-slate-600"><span aria-hidden="true">{config.icon}</span> {config.label} · {board.size}×{board.size}</span>
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
            <span class="target-picture mx-auto mb-1 grid h-11 w-11 place-items-center overflow-hidden rounded-xl" aria-hidden="true">
              {#if found}
                {#if target.entry.photo && target.entry.sil && !brokenTargetSil.has(target.entry.w)}
                  <img
                    src="{base}{target.entry.sil}"
                    alt=""
                    class="h-full w-full object-cover opacity-60"
                    onerror={() => (brokenTargetSil = new Set([...brokenTargetSil, target.entry.w]))}
                  />
                {:else}
                  <span class="emoji-silhouette text-3xl">{target.entry.e ?? '◆'}</span>
                {/if}
              {:else if target.entry.photo && target.entry.img && !brokenTargetImg.has(target.entry.w)}
                <img
                  src="{base}{target.entry.img}"
                  alt=""
                  class="h-full w-full object-cover"
                  onerror={() => (brokenTargetImg = new Set([...brokenTargetImg, target.entry.w]))}
                />
              {:else if target.entry.photo && target.entry.sil && !brokenTargetSil.has(target.entry.w)}
                <img
                  src="{base}{target.entry.sil}"
                  alt=""
                  class="h-full w-full object-cover opacity-60"
                  onerror={() => (brokenTargetSil = new Set([...brokenTargetSil, target.entry.w]))}
                />
              {:else}
                <span class="text-3xl">{target.entry.e ?? '◆'}</span>
              {/if}
            </span>
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

  {#if phase === 'reward' && board}
    <div class="reward-backdrop fixed inset-0 z-40 grid place-items-center bg-slate-950/65 p-5 backdrop-blur-sm">
      <div
        bind:this={rewardDialog}
        onkeydown={rewardKeydown}
        class="w-full max-w-md text-center text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-title"
        tabindex="-1"
      >
        <p class="text-5xl" aria-hidden="true">✨</p>
        <h2 id="reward-title" class="mt-2 text-3xl font-black">
          {rewardStage === 'choose'
            ? 'Pilih satu stiker!'
            : rewardStage === 'opening'
              ? 'Membuka stikermu…'
              : rewardStage === 'revealed'
                ? 'Selamat!'
                : 'Semua ditemukan!'}
        </h2>
        <p class="mt-2 font-bold text-slate-200">
          {rewardStage === 'choose'
            ? 'Ketuk satu kartu untuk membuka hadiahmu.'
            : rewardStage === 'opening'
              ? 'Kartumu sedang dibuka…'
              : rewardStage === 'revealed'
                ? (rewardIsNew ? 'Hebat! Kamu mendapat stiker baru!' : 'Hebat! Kamu mendapat satu Kata Bonus!')
                : rewardStage === 'ready'
                  ? 'Tekan tombol Acak Stiker, lalu pilih satu kartu.'
                  : 'Tiga kata berubah menjadi calon stiker.'}
        </p>

        <div
          class="prize-row mx-auto mt-7 grid max-w-sm grid-cols-3 gap-3"
          class:prize-gather={rewardStage === 'gather'}
          class:prize-shuffle={rewardStage === 'shuffle'}
          class:prize-picking={rewardStage === 'opening' || rewardStage === 'revealed'}
        >
          {#each rewardEntries as entry, index (entry.w)}
            {@const isChosen = chosenPrize === index}
            {#if rewardStage === 'choose' || rewardStage === 'opening' || rewardStage === 'revealed'}
              <button
                type="button"
                data-prize-card={index}
                data-prize-word={isChosen && rewardedWord ? rewardedWord.w : undefined}
                data-chosen-card={isChosen ? chosenPrize : undefined}
                data-reward-state={isChosen ? rewardStage : undefined}
                onclick={() => rewardStage === 'choose'
                  ? choosePrize(index)
                  : rewardStage === 'revealed' && isChosen && rewardedWord
                    ? speakWord(rewardedWord)
                    : undefined}
                disabled={rewardStage === 'opening' || ((rewardStage === 'revealed') && !isChosen)}
                class="prize-card prize-choice relative aspect-[.78] rounded-3xl border-0 bg-transparent p-0 shadow-2xl"
                class:prize-picked={isChosen && (rewardStage === 'opening' || rewardStage === 'revealed')}
                class:prize-not-picked={!isChosen && (rewardStage === 'opening' || rewardStage === 'revealed')}
                class:prize-left={index === 0}
                class:prize-right={index === 2}
                aria-label={rewardStage === 'choose'
                  ? `Pilih kartu stiker ${index + 1}`
                  : isChosen && rewardedWord
                    ? rewardStage === 'revealed'
                      ? `Dengarkan kata ${rewardedWord.w}`
                      : `Membuka stiker ${rewardedWord.w}`
                    : `Kartu stiker ${index + 1}`}
              >
                <span class="prize-flip-inner absolute inset-0 block">
                  <span class="prize-face prize-card-back absolute inset-0 grid place-items-center rounded-3xl border-4 border-white/70 bg-amber-400">
                    <span class="text-5xl text-amber-950" aria-hidden="true">★</span>
                  </span>
                  <span class="prize-face prize-card-front absolute inset-0 block overflow-hidden rounded-3xl border-4 border-white/70 bg-white p-2 text-slate-700">
                    {#if isChosen && rewardedWord}
                      {@const prize = rewardedWord}
                      <span class="grid h-[72%] place-items-center overflow-hidden rounded-2xl bg-amber-50">
                        {#if rewardStage === 'opening'}
                          {#if prize.photo && prize.sil && !brokenTargetSil.has(prize.w)}
                            <img
                              src="{base}{prize.sil}"
                              alt=""
                              data-reward-silhouette
                              class="h-full w-full object-cover opacity-60"
                              onerror={() => (brokenTargetSil = new Set([...brokenTargetSil, prize.w]))}
                            />
                          {:else}
                            <span class="emoji-silhouette text-6xl" data-reward-silhouette aria-hidden="true">{prize.e ?? '◆'}</span>
                          {/if}
                        {:else if rewardStage === 'revealed'}
                          {#if prize.photo && prize.img && !brokenTargetImg.has(prize.w)}
                            <img
                              src="{base}{prize.img}"
                              alt={prize.w}
                              data-reward-color
                              class="sticker-color h-full w-full object-cover"
                              onerror={() => (brokenTargetImg = new Set([...brokenTargetImg, prize.w]))}
                            />
                          {:else}
                            <span class="sticker-color text-6xl" data-reward-color aria-hidden="true">{prize.e ?? '◆'}</span>
                          {/if}
                        {/if}
                      </span>
                      {#if rewardStage === 'revealed'}
                        <strong class="mt-1 block truncate text-lg capitalize">{prize.w}</strong>
                        <span class="block truncate text-xs font-black text-amber-600">{prize.syl.join(' · ')}</span>
                      {:else}
                        <strong class="mt-3 block text-sm text-slate-400">Membuka…</strong>
                      {/if}
                    {/if}
                  </span>
                </span>
              </button>
            {:else}
              <div class="prize-card aspect-[.78] overflow-hidden rounded-3xl border-4 border-white/70 bg-white p-2 text-slate-700 shadow-2xl">
                {#if rewardStage === 'gather' || rewardStage === 'ready'}
                  <div class="grid h-[72%] place-items-center overflow-hidden rounded-2xl bg-slate-100">
                    {#if entry.photo && entry.sil && !brokenTargetSil.has(entry.w)}
                      <img
                        src="{base}{entry.sil}"
                        alt=""
                        class="h-full w-full object-cover opacity-60"
                        onerror={() => (brokenTargetSil = new Set([...brokenTargetSil, entry.w]))}
                      />
                    {:else}
                      <span class="emoji-silhouette text-6xl" aria-hidden="true">{entry.e ?? '◆'}</span>
                    {/if}
                  </div>
                  <strong class="mt-2 block truncate capitalize">{entry.w}</strong>
                {:else}
                  <div class="grid h-full place-items-center rounded-2xl bg-amber-400">
                    <span class="text-5xl text-amber-950" aria-hidden="true">★</span>
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>

        {#if rewardStage === 'ready'}
          <button type="button" onclick={shuffleRewards} class="mt-7 rounded-2xl bg-amber-400 px-8 py-3.5 text-lg font-black text-amber-950 shadow-xl active:translate-y-1">
            Acak Stiker!
          </button>
        {:else if rewardStage === 'shuffle'}
          <p class="mt-7 font-black text-amber-200" aria-live="polite">Mengacak…</p>
        {:else if rewardStage === 'opening'}
          <p class="mt-7 font-black text-amber-100" aria-live="polite">Lihat kartumu berputar!</p>
        {:else if rewardStage === 'revealed' && rewardedWord}
          <p class="mt-6 text-sm font-bold text-slate-200">
            {rewardIsNew ? 'Stiker sudah masuk ke Album Kata. Ketuk stikernya untuk mendengar.' : `${rewardedWord.w} sudah ada di albummu.`}
          </p>
          <div class="mx-auto mt-4 grid max-w-xs gap-3">
            <button type="button" onclick={newBoard} class="rounded-2xl bg-amber-400 px-5 py-3 font-black text-amber-950 shadow-lg">Main Lagi</button>
            <a href="{base}/stiker?tab=cari-kata" class="rounded-2xl bg-white px-5 py-3 font-black text-amber-700 shadow">Lihat Album</a>
            <button type="button" onclick={back} class="rounded-2xl bg-white/15 px-5 py-2.5 font-bold text-white">Kembali</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .level-button { background: var(--level-color); box-shadow: 0 6px 0 color-mix(in srgb, var(--level-color), #000 26%); }
  .level-icon { filter: drop-shadow(0 2px 1px rgb(0 0 0 / .12)); }
  .target-card { border-color: #fde68a; background: #fffbeb; color: #b45309; transition: transform 160ms, background 220ms; }
  .target-found { border-color: #34d399; background: #d1fae5; color: #047857; transform: rotateY(360deg); }
  .target-picture { background: #fef3c7; }
  .target-found .target-picture { background: #e2e8f0; }
  .emoji-silhouette { filter: grayscale(1) brightness(0); opacity: .42; }
  .word-board { touch-action: none; }
  .board-cell { background: white; color: #475569; font-size: clamp(.9rem, 4.5vw, 1.4rem); transition: transform 120ms, background 120ms, color 120ms; }
  .cell-selected { background: #fbbf24; color: #78350f; transform: scale(.94); }
  .cell-found { background: #34d399; color: white; }
  .cell-hint { animation: hint-pulse 1s ease-in-out infinite; outline: 4px solid #f59e0b; outline-offset: -4px; }
  .reduce-hint { animation: none; }
  .reward-backdrop { animation: backdrop-in 260ms ease-out both; }
  .prize-card { transform-style: preserve-3d; }
  .prize-gather .prize-card { animation: prize-arrive 720ms cubic-bezier(.2,.85,.25,1.18) both; }
  .prize-gather .prize-card:nth-child(2) { animation-delay: 90ms; }
  .prize-gather .prize-card:nth-child(3) { animation-delay: 180ms; }
  .prize-shuffle .prize-card { animation: prize-shuffle 900ms ease-in-out both; }
  .prize-shuffle .prize-card:nth-child(2) { animation-name: prize-shuffle-middle; }
  .prize-shuffle .prize-card:nth-child(3) { animation-direction: reverse; }
  .prize-choice {
    perspective: 900px;
    transition: opacity 420ms ease, transform 700ms cubic-bezier(.2,.82,.25,1.1);
    animation: card-ready 320ms ease-out;
  }
  .prize-flip-inner {
    transform-style: preserve-3d;
    transition: transform 720ms cubic-bezier(.2,.78,.24,1.08);
  }
  .prize-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .prize-card-front { transform: rotateY(180deg); }
  .prize-picked { z-index: 2; }
  .prize-picked .prize-flip-inner { transform: rotateY(180deg); }
  .prize-picking .prize-picked { transform: scale(1.2); }
  .prize-picking .prize-picked.prize-left { transform: translateX(calc(100% + .75rem)) scale(1.2); }
  .prize-picking .prize-picked.prize-right { transform: translateX(calc(-100% - .75rem)) scale(1.2); }
  .prize-not-picked { pointer-events: none; opacity: 0; transform: scale(.72); }
  .sticker-color { animation: sticker-color-in 520ms cubic-bezier(.16,.9,.28,1.25) both; }
  @keyframes backdrop-in { from { opacity: 0; } }
  @keyframes prize-arrive {
    from { opacity: 0; transform: translateY(-32vh) scale(.58) rotate(-5deg); }
    to { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
  }
  @keyframes prize-shuffle {
    0% { transform: translateX(0) rotateY(0); }
    35% { transform: translateX(110%) translateY(-10px) rotateY(90deg) rotate(5deg); }
    70% { transform: translateX(-110%) translateY(8px) rotateY(180deg) rotate(-4deg); }
    100% { transform: translateX(0) rotateY(360deg); }
  }
  @keyframes prize-shuffle-middle {
    0% { transform: translateY(0) rotateY(0); }
    45% { transform: translateY(-24px) scale(1.08) rotateY(180deg); }
    100% { transform: translateY(0) rotateY(360deg); }
  }
  @keyframes card-ready { from { opacity: 0; transform: rotateY(90deg) scale(.85); } }
  @keyframes sticker-color-in {
    from { opacity: .25; transform: scale(.78); filter: grayscale(1); }
    to { opacity: 1; transform: scale(1); filter: grayscale(0); }
  }
  @keyframes hint-pulse { 50% { transform: scale(1.08); filter: brightness(1.08); } }
  @media (prefers-reduced-motion: reduce) {
    .level-button:active, .target-card:active, .cell-selected, .target-found { transform: none; }
    .cell-hint, .reward-backdrop, .prize-card, .sticker-color { animation: none; }
    .prize-choice, .prize-flip-inner { transition: none; }
  }
</style>
