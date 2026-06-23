<script>
  import { player } from '$lib/audio/player.svelte.js';
  import { buzzWrong } from '$lib/audio/sfx.js';
  import { SPEAK_TRY } from '$lib/content/feedback.js';

  /**
   * Spell mode — one component, two tile sources:
   *   susun (Build): scrambled tiles of exactly the word's letters
   *   ketik (Type):  a full a–z on-screen keyboard
   * Child fills the slots, then taps "Cek". A wrong check never clears the work; it
   * marks each letter green (right spot) or red (wrong spot), buzzes + shakes, speaks
   * a "coba lagi", and asks the parent to make the robot sad — so a pre-reader can
   * see exactly what to fix. Parent remounts per word (`{#key}`).
   *
   * @type {{ word: { w: string, e: string }, voiceId: string, mode: 'susun'|'ketik', oncomplete?: () => void, onwrong?: () => void }}
   */
  let { word, voiceId, mode, oncomplete, onwrong } = $props();

  // Encouragement that does NOT reveal the spelling (drop the "baca"/read line — this is writing).
  const TRY_AGAIN = SPEAK_TRY.filter((s) => !/baca/i.test(s));

  const QWERTY = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];
  const target = $derived(word.w.toLowerCase());

  /** @type {(null | { ch: string, tileId?: number })[]} */
  let slots = $state([]);
  /** @type {{ id: number, ch: string, used: boolean }[]} */
  let bank = $state([]);
  let wrong = $state(false); // drives the shake animation (retoggled to replay)
  let checked = $state(false); // true while showing the green/red wrong-feedback

  /** @param {string[]} arr — shuffle, avoiding the original order */
  function scramble(arr) {
    let a;
    do {
      a = arr.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);
    } while (arr.length > 1 && a.join('') === arr.join(''));
    return a;
  }

  // (Re)initialize for the current word — also covers the keyed remount per card.
  $effect(() => {
    slots = Array(target.length).fill(null);
    bank = mode === 'susun' ? scramble([...target]).map((ch, i) => ({ id: i, ch, used: false })) : [];
    wrong = false;
    checked = false;
  });

  /** Slot styling — green/red while showing wrong feedback, else amber/empty.
   * @param {null | { ch: string }} s @param {number} k */
  function slotClass(s, k) {
    if (checked && s) {
      return s.ch === target[k]
        ? 'border-green-400 bg-green-50 text-green-600'
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
    if (assembled === target) {
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
  <div class="flex gap-2" class:shake={wrong}>
    {#each slots as s, k (k)}
      <button
        onclick={() => removeSlot(k)}
        class="flex h-14 w-12 items-center justify-center rounded-xl border-2 text-2xl font-black uppercase {slotClass(s, k)}"
      >
        {s ? s.ch : ''}
      </button>
    {/each}
  </div>

  <!-- Wrong-feedback cue: red letters are in the wrong spot, fix those. -->
  {#if checked}
    <p class="-mt-1 text-sm font-bold text-red-500">🔁 Coba lagi — perbaiki huruf merah</p>
  {/if}

  {#if mode === 'susun'}
    <!-- Build: scrambled exact-letter tiles -->
    <div class="flex flex-wrap justify-center gap-2">
      {#each bank as t (t.id)}
        <button
          onclick={() => placeTile(t)}
          disabled={t.used}
          class="h-14 w-14 rounded-2xl bg-rose-500 text-2xl font-black uppercase text-white shadow active:scale-95 {t.used ? 'opacity-25' : ''}"
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
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }
  .shake { animation: shake 0.3s ease-in-out; }
  @media (prefers-reduced-motion: reduce) {
    .shake { animation: none; }
  }
</style>
