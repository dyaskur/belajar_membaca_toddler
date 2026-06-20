<script>
  import { player } from '$lib/audio/player.svelte.js';
  import { buzzWrong } from '$lib/audio/sfx.js';

  /**
   * Spell mode — one component, two tile sources:
   *   susun (Build): scrambled tiles of exactly the word's letters
   *   ketik (Type):  a full a–z on-screen keyboard
   * Child fills the slots, then taps "Cek". A wrong check shakes + buzzes but never
   * clears the work (gentle, app-wide tone). Parent remounts per word (`{#key}`).
   *
   * @type {{ word: { w: string, e: string }, voiceId: string, mode: 'susun'|'ketik', oncomplete?: () => void }}
   */
  let { word, voiceId, mode, oncomplete } = $props();

  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const target = $derived(word.w.toLowerCase());

  /** @type {(null | { ch: string, tileId?: number })[]} */
  let slots = $state([]);
  /** @type {{ id: number, ch: string, used: boolean }[]} */
  let bank = $state([]);
  let wrong = $state(false);

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
  });

  const filled = $derived(slots.length > 0 && slots.every(Boolean));
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
    player.speak(voiceId, 1, tile.ch); // reuse the per-letter clip as a spelling aid
  }

  /** Type a letter from the a–z grid (ketik). @param {string} ch */
  function placeChar(ch) {
    const k = nextEmpty();
    if (k < 0) return;
    slots[k] = { ch };
    wrong = false;
    player.speak(voiceId, 1, ch);
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
  }

  function cek() {
    if (!filled) return;
    if (assembled === target) {
      oncomplete?.();
    } else {
      buzzWrong();
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
        class="flex h-14 w-12 items-center justify-center rounded-xl border-2 text-2xl font-black uppercase
          {s ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-dashed border-slate-300 bg-white text-slate-300'}"
      >
        {s ? s.ch : ''}
      </button>
    {/each}
  </div>

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
    <!-- Type: full a–z keyboard, alphabetical -->
    <div class="grid grid-cols-7 gap-1.5">
      {#each ALPHABET as ch (ch)}
        <button
          onclick={() => placeChar(ch)}
          class="flex h-10 items-center justify-center rounded-lg bg-sky-500 text-lg font-black uppercase text-white shadow active:scale-95"
        >
          {ch}
        </button>
      {/each}
    </div>
  {/if}

  <button
    onclick={cek}
    disabled={!filled}
    class="w-full max-w-[280px] rounded-2xl py-4 text-xl font-black text-white active:scale-95 {filled ? 'bg-green-500' : 'bg-slate-300'}"
  >
    ✅ Cek
  </button>
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
