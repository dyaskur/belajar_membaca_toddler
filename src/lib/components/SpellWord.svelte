<script>
  import { player } from '$lib/audio/player.svelte.js';
  import { buzzWrong } from '$lib/audio/sfx.js';
  import { SPEAK_TRY } from '$lib/content/feedback.js';
  import { tileVars } from '$lib/content/tiles.js';

  /**
   * Spell mode — one component, two tile sources:
   *   susun (Build): scrambled tiles of exactly the word's letters
   *   susun-suku: scrambled syllable tiles + distractors
   *   ketik (Type):  a full a–z on-screen keyboard
   * Child fills the slots, then taps "Cek". A wrong check never clears the work; it
   * marks each letter green (right spot) or red (wrong spot), buzzes + shakes, speaks
   * a "coba lagi", and asks the parent to make the robot sad — so a pre-reader can
   * see exactly what to fix. Parent remounts per word (`{#key}`).
   *
   * @type {{ word: { w: string, e?: string }, voiceId: string, mode: 'susun'|'susun-suku'|'ketik', syllables?: string[], distractors?: string[], oncomplete?: () => void, onwrong?: () => void }}
   */
  let { word, voiceId, mode, syllables, distractors, oncomplete, onwrong } = $props();

  // Encouragement that does NOT reveal the spelling (drop the "baca"/read line — this is writing).
  const TRY_AGAIN = SPEAK_TRY.filter((s) => !/baca/i.test(s));

  const QWERTY = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];
  const targetStr = $derived(word.w.toLowerCase());
  const targetArr = $derived(mode === 'susun-suku' ? (syllables || []) : [...targetStr]);

  /** @type {(null | { ch: string, tileId?: number })[]} */
  let slots = $state([]);
  /** @type {{ id: number, ch: string, used: boolean }[]} */
  let bank = $state([]);
  let wrong = $state(false); // drives the wobble animation (retoggled to replay)
  let checked = $state(false); // true while showing the green/red wrong-feedback
  let solved = $state(false); // the whole word is correct — flash the slots emerald

  /** @param {string[]} arr — shuffle, avoiding the original order @returns {string[]} */
  function scramble(arr) {
    let a;
    do {
      a = arr.map((v) => /** @type {[number, string]} */ ([Math.random(), v])).sort((x, y) => x[0] - y[0]).map((p) => p[1]);
    } while (arr.length > 1 && a.join('') === arr.join(''));
    return a;
  }

  // (Re)initialize for the current word — also covers the keyed remount per card.
  $effect(() => {
    slots = Array(targetArr.length).fill(null);
    const bankItems = mode === 'susun-suku' ? [...targetArr, ...(distractors || [])] : [...targetArr];
    bank = (mode === 'susun' || mode === 'susun-suku') ? scramble(bankItems).map((ch, i) => ({ id: i, ch, used: false })) : [];
    wrong = false;
    checked = false;
    solved = false;
  });

  /** Slot styling — emerald when solved/right, red for a letter in the wrong spot,
   * else amber (filled) / dashed (empty).
   * @param {null | { ch: string }} s @param {number} k */
  function slotClass(s, k) {
    if (solved) return 'border-emerald-500 bg-emerald-50 text-emerald-700';
    if (checked && s) {
      return s.ch === targetArr[k]
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
    player.speak(voiceId, 1, tile.ch); // reuse the per-letter clip as a spelling aid
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
    if (assembled === targetStr) {
      solved = true;
      oncomplete?.();
    } else {
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
  <div class="flex gap-2" class:tile-wobble={wrong}>
    {#each slots as s, k (k)}
      <button
        onclick={() => removeSlot(k)}
        aria-label={s ? `Kotak ${k + 1}, ${s.ch}` : `Kotak ${k + 1}, kosong`}
        class="flex h-14 items-center justify-center rounded-xl border-2 text-2xl font-black uppercase {slotClass(s, k)} {mode === 'susun-suku' ? 'min-w-[3.5rem] px-2' : 'w-12'}"
      >
        {s ? s.ch : ''}
      </button>
    {/each}
  </div>

  <!-- Wrong-feedback cue: red letters are in the wrong spot, fix those. -->
  {#if checked}
    <p class="-mt-1 text-sm font-bold text-red-500">🔁 Coba lagi — perbaiki {mode === 'susun-suku' ? 'kotak' : 'huruf'} merah</p>
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

  {#if mode === 'susun' || mode === 'susun-suku'}
    <!-- Build: scrambled tiles, colored by position (shared palette) -->
    <div class="flex flex-wrap justify-center gap-2">
      {#each bank as t, i (t.id)}
        <button
          onclick={() => placeTile(t)}
          disabled={t.used}
          style="{tileVars(i)}--tile-delay:{i * 40}ms"
          class="tile h-14 rounded-2xl text-2xl font-black uppercase shadow {mode === 'susun-suku' ? 'min-w-[3.5rem] px-2' : 'w-14'} {t.used
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
