<script>
  import { player } from '$lib/audio/player.svelte.js';
  import { buzzWrong } from '$lib/audio/sfx.js';
  import { SPEAK_TRY } from '$lib/content/feedback.js';
  import { tileVars } from '$lib/content/tiles.js';

  /**
   * Build-the-word (susun) with SYLLABLE tiles — the Level 3 mechanic. The child drags the
   * scrambled syllables into order to spell the word. 3a is order-only; 3b/3c add 1–2 plausible
   * distractor syllable tiles (drawn from `pool`). A wrong auto-check never clears the work: it
   * marks each slot green (right spot) or red (wrong spot), buzzes + shakes, and speaks a gentle
   * "coba lagi". Solving first-try (no wrong check) reports firstTry=true for mastery. The parent
   * remounts per word via `{#key}`.
   *
   * @type {{
   *   word: string,
   *   syllables: string[],
   *   voiceId: string,
   *   pool?: string[],
   *   distractors?: number,
   *   oncomplete?: (firstTry: boolean) => void,
   *   onwrong?: () => void
   * }}
   */
  let { word, syllables, voiceId, pool = [], distractors = 0, oncomplete, onwrong } = $props();

  // Encouragement that does NOT reveal the answer (drop the "baca"/read line — this is building).
  const TRY_AGAIN = SPEAK_TRY.filter((s) => !/baca/i.test(s));

  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /** @param {string[]} arr — shuffle, avoiding the original order for arrays of length > 1
   * @returns {string[]} */
  function scramble(arr) {
    /** @type {string[]} */
    let a;
    do {
      a = arr
        .map((v) => /** @type {[number, string]} */ ([Math.random(), v]))
        .sort((x, y) => x[0] - y[0])
        .map((p) => p[1]);
    } while (arr.length > 1 && a.join('|') === arr.join('|'));
    return a;
  }

  /** @type {(null | { syl: string, tileId: number })[]} */
  let slots = $state([]);
  /** @type {{ id: number, syl: string, used: boolean }[]} */
  let bank = $state([]);
  let wrong = $state(false); // drives the shake (retoggled to replay)
  let checked = $state(false); // showing the green/red wrong-feedback
  let solved = $state(false); // the whole word is correct — slam + flash
  let hadWrong = false; // any wrong auto-check this word → not a first-try win

  // (Re)initialize for the current word — also covers the keyed remount per card.
  $effect(() => {
    const target = syllables;
    // Distractor tiles: syllables from other words in this pack, not already in the target.
    const extras = distractors > 0
      ? scramble([...new Set(pool)].filter((s) => !target.includes(s))).slice(0, distractors)
      : [];
    slots = Array(target.length).fill(null);
    bank = scramble([...target, ...extras]).map((syl, i) => ({ id: i, syl, used: false }));
    wrong = false;
    checked = false;
    solved = false;
    hadWrong = false;
  });

  const targetStr = $derived(syllables.join('|'));
  const assembled = $derived(slots.map((s) => s?.syl ?? '').join('|'));

  function nextEmpty() {
    return slots.findIndex((s) => !s);
  }

  /** Slot styling — gold when solved, green/red after a wrong check, else amber/empty. @param {null | { syl: string }} s @param {number} k */
  function slotClass(s, k) {
    if (solved) return 'border-amber-400 bg-amber-300 text-amber-900';
    if (checked && s) {
      return s.syl === syllables[k]
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
        : 'border-red-400 bg-red-50 text-red-500';
    }
    return s
      ? 'border-amber-400 bg-amber-50 text-amber-600'
      : 'border-dashed border-slate-300 bg-white text-slate-300';
  }

  /** Place a tile into the next empty slot. @param {{ id: number, syl: string, used: boolean }} tile */
  function placeTile(tile) {
    if (tile.used || solved) return;
    const k = nextEmpty();
    if (k < 0) return;
    slots[k] = { syl: tile.syl, tileId: tile.id };
    tile.used = true;
    wrong = false;
    checked = false;
    // Reuse the CV-syllable clip (pack 2) as a spelling aid; non-CV syllables fall back to synth.
    player.speak(voiceId, 2, tile.syl);
    maybeAutoCheck();
  }

  /** Tap a filled slot to take the syllable back. @param {number} k */
  function removeSlot(k) {
    const s = slots[k];
    if (!s || solved) return;
    const t = bank.find((b) => b.id === s.tileId);
    if (t) t.used = false;
    slots[k] = null;
    wrong = false;
    checked = false;
  }

  function reset() {
    if (solved) return;
    for (const t of bank) t.used = false;
    slots = slots.map(() => null);
    wrong = false;
    checked = false;
  }

  /** No "Cek" button — grade once the last slot is filled (a short beat lets its sound play). */
  function maybeAutoCheck() {
    if (nextEmpty() >= 0) return;
    setTimeout(() => {
      if (nextEmpty() >= 0 || checked || solved) return;
      grade();
    }, 420);
  }

  function grade() {
    if (assembled === targetStr) {
      solved = true;
      oncomplete?.(!hadWrong);
    } else {
      hadWrong = true;
      buzzWrong();
      checked = true; // turn wrong syllables red, right ones green
      onwrong?.();
      player.speak(voiceId, 'words', pick(TRY_AGAIN));
      wrong = false;
      requestAnimationFrame(() => (wrong = true));
    }
  }
</script>

<div class="flex w-full flex-col items-center gap-4">
  <!-- Answer slots (tap a filled one to take it back) -->
  <div class="flex flex-wrap justify-center gap-2" class:tile-wobble={wrong} class:slam={solved}>
    {#each slots as s, k (k)}
      <button
        onclick={() => removeSlot(k)}
        aria-label={s ? `Kotak ${k + 1}, ${s.syl}` : `Kotak ${k + 1}, kosong`}
        class="flex h-16 min-w-[3.5rem] items-center justify-center rounded-2xl border-2 px-3 text-2xl font-black lowercase transition {slotClass(s, k)}"
      >
        {s ? s.syl : ''}
      </button>
    {/each}
  </div>

  <!-- Wrong-feedback cue: red syllables are in the wrong spot, fix those. -->
  {#if checked && !solved}
    <p class="-mt-1 text-sm font-bold text-red-500">🔁 Coba lagi — perbaiki suku kata merah</p>
  {/if}

  <!-- Reset (hidden once solved). -->
  {#if !solved && slots.some(Boolean)}
    <button
      onclick={reset}
      class="-mt-1 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-bold text-slate-500 active:scale-95"
    >
      ↺ Ulang
    </button>
  {/if}

  <!-- Syllable tile bank (scrambled; distractors mixed in for 3b/3c). -->
  <div class="flex flex-wrap justify-center gap-2">
    {#each bank as t, i (t.id)}
      <button
        onclick={() => placeTile(t)}
        disabled={t.used || solved}
        style="{tileVars(i)}--tile-delay:{i * 40}ms"
        class="tile h-16 min-w-[3.5rem] rounded-2xl px-3 text-2xl font-black lowercase shadow {t.used ? 'opacity-30' : ''}"
      >
        {t.syl}
      </button>
    {/each}
  </div>
</div>

<style>
  /* Solved: the placed syllables slam together into the golden whole word. */
  .slam { animation: slam 0.45s cubic-bezier(0.2, 1.4, 0.5, 1); }
  @keyframes slam {
    0% { transform: scale(1); }
    35% { transform: scale(0.86); letter-spacing: -0.15em; }
    70% { transform: scale(1.12); }
    100% { transform: scale(1); }
  }
  @media (prefers-reduced-motion: reduce) { .slam { animation: none; } }
</style>
