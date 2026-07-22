<script>
  import { player } from '$lib/audio/player.svelte.js';
  import { buzzWrong } from '$lib/audio/sfx.js';
  import { SPEAK_TRY } from '$lib/content/feedback.js';
  import { tileVars } from '$lib/content/tiles.js';

  /**
   * Spell mode — one component, two tile sources:
   *   susun (Build): scrambled letter or syllable tiles, optionally with distractors
   *   ketik (Type):  a full a–z on-screen keyboard
   * The component checks once every slot is filled. A wrong attempt never clears the work; it
   * marks each letter green (right spot) or red (wrong spot), buzzes + shakes, speaks
   * a "coba lagi", and asks the parent to make the robot sad — so a pre-reader can
   * see exactly what to fix. Parent remounts per word (`{#key}`).
   *
   * @type {{ word: { w: string, e?: string }, voiceId: string, mode: 'susun'|'ketik', units?: string[], distractors?: string[], audioBucket?: number|string, oncomplete?: (firstTry: boolean) => void, onwrong?: () => void }}
   */
  let { word, voiceId, mode, units, distractors = [], audioBucket = 1, oncomplete, onwrong } = $props();

  // Encouragement that does NOT reveal the spelling (drop the "baca"/read line — this is writing).
  const TRY_AGAIN = SPEAK_TRY.filter((s) => !/baca/i.test(s));

  const QWERTY = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];
  const target = $derived(word.w.toLowerCase());
  const targetUnits = $derived(units?.map((unit) => unit.toLowerCase()) ?? [...target]);

  /** @type {(null | { ch: string, tileId?: number })[]} */
  let slots = $state([]);
  /** @type {{ id: number, ch: string, used: boolean }[]} */
  let bank = $state([]);
  let wrong = $state(false); // drives the wobble animation (retoggled to replay)
  let checked = $state(false); // true while showing the green/red wrong-feedback
  let solved = $state(false); // the whole word is correct — flash the slots emerald
  let firstTry = $state(true);

  /** @param {string[]} arr — shuffle, avoiding the original order */
  function scramble(arr) {
    let a = arr.slice();
    do {
      a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
    } while (new Set(arr).size > 1 && a.join('\u0000') === arr.join('\u0000'));
    return a;
  }

  // (Re)initialize for the current word — also covers the keyed remount per card.
  $effect(() => {
    slots = Array(targetUnits.length).fill(null);
    bank = mode === 'susun'
      ? scramble([...targetUnits, ...distractors]).map((ch, i) => ({ id: i, ch, used: false }))
      : [];
    wrong = false;
    checked = false;
    solved = false;
    firstTry = true;
  });

  /** Slot styling — emerald when solved/right, red for a letter in the wrong spot,
   * else amber (filled) / dashed (empty).
   * @param {null | { ch: string }} s @param {number} k */
  function slotClass(s, k) {
    if (solved) return 'border-emerald-500 bg-emerald-50 text-emerald-700';
    if (checked && s) {
      return s.ch === targetUnits[k]
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
        : 'border-red-400 bg-red-50 text-red-500';
    }
    return s
      ? 'border-amber-400 bg-amber-50 text-amber-600'
      : 'border-dashed border-slate-300 bg-white text-slate-300';
  }

  const assembled = $derived(slots.map((s) => s?.ch ?? '').join(''));

  function nextEmpty() {
    return slots.findIndex((s) => !s);
  }

  /** Place a scrambled tile (susun). @param {{ id: number, ch: string, used: boolean }} tile */
  function placeTile(tile) {
    if (tile.used) return;
    const k = nextEmpty();
    if (k < 0) return;
    slots[k] = { ch: tile.ch, tileId: tile.id };
    tile.used = true;
    wrong = false;
    checked = false;
    player.speak(voiceId, audioBucket, tile.ch);
    maybeAutoCheck();
  }

  /** Type a letter from the a–z grid (ketik). @param {string} ch */
  function placeChar(ch) {
    const k = nextEmpty();
    if (k < 0) return;
    slots[k] = { ch };
    wrong = false;
    checked = false;
    player.speak(voiceId, 1, ch);
    maybeAutoCheck();
  }

  /** Tap a filled slot to take the letter back. @param {number} k */
  function removeSlot(k) {
    const s = slots[k];
    if (!s) return;
    if (s.tileId != null) {
      const t = bank.find((b) => b.id === s.tileId);
      if (t) t.used = false;
    }
    slots[k] = null;
    wrong = false;
    checked = false;
  }

  /** Clear all placed letters (return tiles to the bank). */
  function reset() {
    for (const t of bank) t.used = false;
    slots = slots.map(() => null);
    wrong = false;
    checked = false;
  }

  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /** No "Cek" button — grade automatically once the last slot is filled. A short beat
   *  lets the placed letter's sound be heard before the result. */
  function maybeAutoCheck() {
    if (nextEmpty() >= 0) return; // not full yet
    setTimeout(() => {
      if (nextEmpty() >= 0 || checked) return; // changed during the beat, or already graded
      grade();
    }, 400);
  }

  function grade() {
    if (solved) return;
    if (assembled === target) {
      solved = true;
      setTimeout(() => oncomplete?.(firstTry), 650);
    } else {
      firstTry = false;
      buzzWrong();
      checked = true; // turn the wrong letters red, the right ones green
      onwrong?.(); // let the shell make the robot look sad
      player.speak(voiceId, 'words', pick(TRY_AGAIN)); // gentle spoken "coba lagi"
      wrong = false; // retoggle so the shake animation replays even on a repeat wrong
      requestAnimationFrame(() => (wrong = true));
    }
  }
</script>

<div class="flex w-full flex-col items-center gap-4">
  <!-- Answer slots (tap a filled one to take it back) -->
  <div class="relative flex gap-2" class:tile-wobble={wrong} class:slots-merge={solved}>
    {#each slots as s, k (k)}
      <button
        onclick={() => removeSlot(k)}
        aria-label={s ? `Kotak ${k + 1}, ${s.ch}` : `Kotak ${k + 1}, kosong`}
        class="answer-slot flex h-14 min-w-12 items-center justify-center rounded-xl border-2 px-2 text-2xl font-black uppercase {slotClass(s, k)}"
      >
        {s ? s.ch : ''}
      </button>
    {/each}
    {#if solved}
      <span class="word-slam absolute inset-0 flex items-center justify-center text-4xl font-black uppercase text-emerald-600">
        {target}
      </span>
    {/if}
  </div>

  <!-- Wrong-feedback cue: red letters are in the wrong spot, fix those. -->
  {#if checked}
    <p class="-mt-1 text-sm font-bold text-red-500">🔁 Coba lagi — perbaiki huruf merah</p>
  {/if}

  <!-- Reset: clear all placed letters back to the bank. -->
  {#if slots.some(Boolean)}
    <button
      onclick={reset}
      class="-mt-1 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-bold text-slate-500 active:scale-95"
    >
      ↺ Ulang
    </button>
  {/if}

  {#if mode === 'susun'}
    <!-- Build: scrambled exact-letter tiles, colored by position (shared palette) -->
    <div class="flex flex-wrap justify-center gap-2">
      {#each bank as t, i (t.id)}
        <!-- data-unit is an e2e hook: tiles can repeat a syllable, so selecting by
             visible text alone is ambiguous. See tests/e2e/belajar-flow.spec.js. -->
        <button
          data-unit={t.ch}
          data-tile-id={t.id}
          onclick={() => placeTile(t)}
          disabled={t.used}
          style="{tileVars(i)}--tile-delay:{i * 40}ms"
          class="tile h-14 min-w-14 rounded-2xl px-3 text-2xl font-black uppercase shadow {t.used
            ? 'opacity-30'
            : ''}"
        >
          {t.ch}
        </button>
      {/each}
    </div>
  {:else}
    <!-- Type: full keyboard, QWERTY layout (rows stay centered like a real keyboard) -->
    <div class="flex w-full max-w-[360px] flex-col items-center gap-1.5">
      {#each QWERTY as row, ri (ri)}
        <div class="flex w-full justify-center gap-1">
          {#each row as ch (ch)}
            <button
              onclick={() => placeChar(ch)}
              class="flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg bg-sky-500 text-base font-black uppercase text-white shadow active:scale-95"
            >
              {ch}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .slots-merge .answer-slot { animation: merge-away 0.55s ease-in forwards; }
  .word-slam { animation: word-slam 0.65s cubic-bezier(.2, 1.5, .35, 1) both; }
  @keyframes merge-away {
    60% { transform: translateX(0) scale(1.08); opacity: 1; }
    100% { transform: scale(0.35); opacity: 0; }
  }
  @keyframes word-slam {
    0%, 55% { transform: scale(0.35); opacity: 0; }
    75% { transform: scale(1.25); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .slots-merge .answer-slot, .word-slam { animation-duration: 0.01ms; }
  }
</style>
