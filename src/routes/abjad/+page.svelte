<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { ABJAD, ABJAD_BUCKET } from '$lib/content/abjad.js';
  import { player } from '$lib/audio/player.svelte.js';

  /** @typedef {'letter'|'object'|'both'} ContentMode */
  /** @typedef {'upper'|'lower'|'both'} CaseMode */

  let contentMode = $state(/** @type {ContentMode} */ ('both'));
  let caseMode = $state(/** @type {CaseMode} */ ('both'));
  let playing = $state(false);
  let activeIndex = $state(-1);
  // Single source of truth for "the current playback action". Bumped on every stop, tap,
  // or play-all start so stale awaited sequences abandon themselves.
  let epoch = 0;

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const showLetter = $derived(contentMode !== 'object');
  const showObject = $derived(contentMode !== 'letter');

  const CONTENT_TABS = /** @type {{ id: ContentMode, label: string }[]} */ ([
    { id: 'letter', label: 'Huruf' },
    { id: 'object', label: 'Gambar' },
    { id: 'both', label: 'Keduanya' }
  ]);
  const CASE_TABS = /** @type {{ id: CaseMode, label: string }[]} */ ([
    { id: 'upper', label: 'ABC' },
    { id: 'lower', label: 'abc' },
    { id: 'both', label: 'Aa' }
  ]);

  onMount(async () => {
    if (!profiles.active) return goto(`${base}/belajar`);
    // Letters come from Level 1; object words from the dedicated abjad bucket.
    await Promise.all([
      player.ensureLevel(voiceId, 1),
      player.ensureLevel(voiceId, ABJAD_BUCKET)
    ]);
  });

  onDestroy(() => stopAll());

  const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

  /** @param {string} letter */
  function letterDisplay(letter) {
    if (caseMode === 'upper') return letter.toUpperCase();
    if (caseMode === 'lower') return letter;
    return letter.toUpperCase() + letter; // both → "Aa"
  }

  /**
   * Speak a cell per the current content mode. In "both" mode it plays the letter then
   * the word, bailing between the two if `myEpoch` was superseded.
   * @param {(typeof ABJAD)[number]} item @param {number} myEpoch
   */
  async function speakCell(item, myEpoch) {
    if (contentMode === 'object') {
      await player.speak(voiceId, ABJAD_BUCKET, item.word);
      return;
    }
    if (contentMode === 'letter') {
      await player.speak(voiceId, 1, item.letter);
      return;
    }
    await player.speak(voiceId, 1, item.letter);
    if (myEpoch !== epoch) return;
    await player.speak(voiceId, ABJAD_BUCKET, item.word);
  }

  /** @param {number} i */
  function scrollToCell(i) {
    if (!browser) return;
    document.getElementById(`abjad-cell-${i}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /** Stop any tap or play-all in flight and clear the highlight. */
  function stopAll() {
    epoch++;
    playing = false;
    activeIndex = -1;
    player.stop();
  }

  /** @param {number} i */
  async function tapCell(i) {
    stopAll();
    const myEpoch = ++epoch;
    activeIndex = i;
    await speakCell(ABJAD[i], myEpoch);
    if (myEpoch === epoch) activeIndex = -1;
  }

  async function playAll() {
    if (playing) {
      stopAll();
      return;
    }
    const myEpoch = ++epoch;
    playing = true;
    for (let i = 0; i < ABJAD.length; i++) {
      if (myEpoch !== epoch) return;
      activeIndex = i;
      scrollToCell(i);
      await speakCell(ABJAD[i], myEpoch);
      if (myEpoch !== epoch) return;
      await sleep(180); // small gap between letters
    }
    if (myEpoch === epoch) {
      playing = false;
      activeIndex = -1;
    }
  }

  /** @param {ContentMode} mode */
  function setContent(mode) {
    stopAll();
    contentMode = mode;
  }
  /** @param {CaseMode} mode */
  function setCase(mode) {
    stopAll();
    caseMode = mode;
  }
</script>

<header class="mb-4 flex items-center justify-between">
  <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
  <span class="font-bold text-slate-500">🔤 Abjad</span>
  <span class="w-7"></span>
</header>

<!-- Content-mode tabs -->
<div class="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
  {#each CONTENT_TABS as tab (tab.id)}
    <button
      onclick={() => setContent(tab.id)}
      class="rounded-xl py-2 text-sm font-bold active:scale-95 {contentMode === tab.id
        ? 'bg-amber-500 text-white shadow'
        : 'text-slate-600'}"
    >
      {tab.label}
    </button>
  {/each}
</div>

<!-- Case tabs — hidden in object-only mode (no letter shown) -->
{#if showLetter}
  <div class="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
    {#each CASE_TABS as tab (tab.id)}
      <button
        onclick={() => setCase(tab.id)}
        class="rounded-xl py-2 text-sm font-bold active:scale-95 {caseMode === tab.id
          ? 'bg-teal-500 text-white shadow'
          : 'text-slate-600'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>
{/if}

<!-- Play all / stop -->
<button
  onclick={playAll}
  class="mb-4 w-full rounded-2xl py-3 text-lg font-black text-white active:scale-95 {playing
    ? 'bg-red-500'
    : 'bg-amber-500'}"
>
  {playing ? '⏹️ Berhenti' : '▶️ Putar Semua'}
</button>

<div class="grid grid-cols-3 gap-3 pb-6 sm:grid-cols-5">
  {#each ABJAD as item, i (item.letter)}
    <button
      id="abjad-cell-{i}"
      onclick={() => tapCell(i)}
      class="flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-3 shadow transition active:scale-95 {activeIndex ===
      i
        ? 'ring-4 ring-amber-400'
        : ''}"
    >
      {#if showLetter}
        <span class="text-4xl font-black text-amber-600 sm:text-5xl">{letterDisplay(item.letter)}</span>
      {/if}
      {#if showObject}
        <span class="text-4xl leading-none">{item.emoji}</span>
        <span class="text-xs font-bold text-slate-500">{item.word}</span>
      {/if}
    </button>
  {/each}
</div>
