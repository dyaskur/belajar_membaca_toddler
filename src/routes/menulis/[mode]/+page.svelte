<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { robotColor } from '$lib/content/avatars.js';
  import { PICTURE_WORDS } from '$lib/content/words.js';
  import { feedbackForLevel } from '$lib/content/feedback.js';
  import { WRITE_DECK, TRACE_MAX_LEN, writeMode } from '$lib/content/menulis.js';
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

  const cur = $derived(deck[idx]);
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar));
  const fb = $derived(feedbackForLevel(1));

  /** @template T @param {T[]} a */
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);
  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  onMount(async () => {
    if (!profiles.active || !mode) return goto(`${base}/menulis`);
    const pool = modeId === 'tiru' ? PICTURE_WORDS.filter((w) => w.w.length <= TRACE_MAX_LEN) : PICTURE_WORDS;
    deck = shuffle(pool).slice(0, WRITE_DECK);
    await player.ensureLevel(voiceId, 1); // praise + per-letter clips
    speakWord(deck[0]);
  });

  onDestroy(() => player.stop());

  /** @param {{ w: string, e: string } | undefined} word */
  function speakWord(word) {
    if (word) player.speak(voiceId, 'words', word.w); // reuse the words-bucket clip
  }

  // Called by a mode component when the word has been written correctly.
  async function wordDone() {
    done++;
    mood = 'happy';
    confetti?.fire(36);
    chimeCorrect();
    await player.speak(voiceId, 1, pick(fb.correct));
    setTimeout(next, 600);
  }

  function next() {
    mood = 'idle';
    if (idx + 1 >= deck.length) {
      finished = true;
      return;
    }
    idx++;
    speakWord(deck[idx]);
  }

  function skip() {
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
    <Robot mood="happy" size={180} head={rc.head} body={rc.body} />
    <h2 class="text-3xl font-black">Pintar! 🌟</h2>
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
    <div class="flex items-center justify-center text-7xl sm:text-8xl">{cur.e}</div>

    {#key idx}
      {#if modeId === 'tiru'}
        <TraceWord word={cur} {voiceId} oncomplete={wordDone} />
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
