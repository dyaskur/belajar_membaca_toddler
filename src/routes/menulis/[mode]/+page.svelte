<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { robotColor } from '$lib/content/avatars.js';
  import { PICTURE_WORDS } from '$lib/content/words.js';
  import { feedbackForLevel, LESSON_FAIL } from '$lib/content/feedback.js';
  import { WRITE_DECK, TRACE_MAX_LEN, writeMode, susunLeadIn, susunSyllables } from '$lib/content/menulis.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect } from '$lib/audio/sfx.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';
  import TraceWord from '$lib/components/TraceWord.svelte';
  import SpellWord from '$lib/components/SpellWord.svelte';

  const modeId = $derived($page.params.mode);
  const mode = $derived(writeMode(modeId));

  let deck = $state(/** @type {{ w: string, e: string }[]} */ ([]));
  let idx = $state(0);
  let done = $state(0); // words written correctly
  let finished = $state(false);
  /** @type {'idle'|'happy'|'sad'} */
  let mood = $state('idle');
  /** @type {Confetti} */
  let confetti;
  /** @type {HTMLElement | undefined} */
  let picEl = $state();

  /** Celebrate a written word with a burst from the picture (all three modes). */
  function celebrateWord() {
    const r = picEl?.getBoundingClientRect();
    if (r) confetti?.burst(r.left + r.width / 2, r.top + r.height / 2, 30);
    else confetti?.fire(36);
  }

  const cur = $derived(deck[idx]);
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar));
  const fb = $derived(feedbackForLevel(1));
  // Result tiers for the finish screen: pass = at least half written correctly.
  const passMark = $derived(Math.ceil(deck.length / 2));
  const passed = $derived(deck.length > 0 && done >= passMark);
  const perfect = $derived(deck.length > 0 && done === deck.length);

  /** @template T @param {T[]} a */
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);
  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  onMount(async () => {
    if (!profiles.active || !mode) return goto(`${base}/menulis`);
    const pool = modeId === 'tiru' ? PICTURE_WORDS.filter((w) => w.w.length <= TRACE_MAX_LEN) : PICTURE_WORDS;
    deck = shuffle(pool).slice(0, WRITE_DECK);
    try {
      await player.ensureLevel(voiceId, 1); // praise + per-letter clips
    } catch {
      /* audio is optional — start the game even if the pack fails to load */
    }
    speakWord(deck[0]);
  });

  /** Pending wordDone→next timer, so skip() can't double-advance. */
  let advanceTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);

  onDestroy(() => {
    player.stop();
    clearTimeout(advanceTimer);
  });

  /** @param {{ w: string, e: string } | undefined} word */
  async function speakWord(word) {
    if (!word) return;
    if (modeId === 'susun') {
      // "Ayo susun kata mobil" (normal) then "mo, bil" slow with a gap (variant 1).
      await player.speak(voiceId, 'words', susunLeadIn(word.w));
      await player.speak(voiceId, 'words', susunSyllables(word.w), 1);
    } else {
      player.speak(voiceId, 'words', word.w);
    }
  }

  // Called by a mode component when the word has been written correctly.
  async function wordDone() {
    const at = idx; // the word being completed
    const w = cur?.w; // capture before the await (idx advances afterwards)
    done++;
    mood = 'happy';
    celebrateWord();
    chimeCorrect();
    await player.speak(voiceId, 1, pick(fb.correct)); // praise, e.g. "Betul!"
    if (w) await player.speak(voiceId, 'words', w); // then the word, e.g. "susu"
    if (idx !== at) return; // skipped (or advanced) during the await — don't double-advance
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(next, 400);
  }

  function next() {
    mood = 'idle';
    if (idx + 1 >= deck.length) {
      finish();
      return;
    }
    idx++;
    speakWord(deck[idx]);
  }

  // End-of-game: celebrate a pass, or gently encourage if too few were correct.
  async function finish() {
    finished = true;
    if (done >= Math.ceil(deck.length / 2)) {
      mood = 'happy';
      confetti?.fire(60);
      chimeCorrect();
      await player.speak(voiceId, 1, pick(fb.complete)); // e.g. "Kamu hebat! Selesai!"
    } else {
      mood = 'sad';
      await player.speak(voiceId, 1, LESSON_FAIL); // "Yah, kamu belum berhasil. Ayo coba lagi, ya!"
    }
  }

  function skip() {
    clearTimeout(advanceTimer); // cancel any pending wordDone→next so we advance once
    player.stop();
    next();
  }
</script>

<Confetti bind:this={confetti} />

<header class="mb-3 flex items-center justify-between">
  <button onclick={() => goto(`${base}/menulis`)} class="text-2xl" aria-label="Kembali">⬅️</button>
  <span class="font-bold text-slate-500">{mode?.icon} {mode?.title}</span>
  <span class="text-sm text-slate-400">{Math.min(idx + 1, deck.length)}/{deck.length}</span>
</header>

{#if finished}
  <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
    <Robot mood={passed ? 'happy' : 'sad'} size={180} head={rc.head} body={rc.body} />
    <h2 class="text-3xl font-black">
      {perfect ? 'Hebat! Semua benar! 🌟' : passed ? 'Pintar! 🌟' : 'Ayo belajar lagi! 💪'}
    </h2>
    <p class="text-xl">Benar {done} dari {deck.length} kata</p>
    <div class="flex gap-3">
      <button onclick={() => location.reload()} class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95">Lagi</button>
      <button onclick={() => goto(`${base}/menulis`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Selesai</button>
    </div>
  </div>
{:else if cur}
  <div class="flex flex-1 flex-col items-center justify-start gap-4">
    <Robot {mood} size={110} head={rc.head} body={rc.body} />

    <!-- Picture (emoji now; an illustration `img` can replace it later) -->
    <div bind:this={picEl} class="flex items-center justify-center text-7xl sm:text-8xl">{cur.e}</div>

    {#key idx}
      {#if modeId === 'tiru'}
        <TraceWord word={cur} {voiceId} oncomplete={wordDone} onwrong={() => (mood = 'sad')} />
      {:else}
        <SpellWord
          word={cur}
          {voiceId}
          mode={/** @type {'susun'|'ketik'} */ (modeId)}
          oncomplete={wordDone}
          onwrong={() => (mood = 'sad')}
        />
      {/if}
    {/key}

    <button onclick={skip} class="text-sm font-bold text-slate-400 underline">Lewati ➡️</button>
  </div>
{/if}
