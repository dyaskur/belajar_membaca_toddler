<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy, onMount } from 'svelte';
  import { DEFAULT_AVATAR, robotColor } from '$lib/content/avatars.js';
  import { feedbackForLevel } from '$lib/content/feedback.js';
  import {
    MESIN_BANK_GROUPS,
    MESIN_FUNNY,
    MESIN_REAL,
    MESIN_WORD_TOTAL,
    REEL_SETS,
    mesinAudioBucket,
    mesinPictureFor,
    mesinWordFor
  } from '$lib/content/mesin.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { reelThunk, sfxJackpot, spinTick } from '$lib/audio/sfx.js';
  import Confetti from '$lib/components/Confetti.svelte';
  import Robot from '$lib/components/Robot.svelte';

  const SPINS_PER_ROUND = 10;

  /** @typedef {{ sylA: string, sylB: string, indexA: number, indexB: number, combo: string, word: string | null }} Outcome */
  /** @typedef {{ word: string, emoji: string, isNew: boolean }} FoundWord */
  /** @typedef {{ kind: 'real'|'funny', word: string, emoji: string, isNew: boolean, phrase: string }} SpinResult */

  let setIndex = $state(0);
  let roundNumber = $state(1);
  let completedSpins = $state(0);
  let phase = $state(/** @type {'ready'|'spinning'|'reading'|'result'|'finished'} */ ('ready'));
  let mood = $state(/** @type {'idle'|'happy'|'sad'} */ ('idle'));
  let currentOutcome = $state(/** @type {Outcome | null} */ (null));
  let currentResult = $state(/** @type {SpinResult | null} */ (null));
  let roundFinds = $state(/** @type {FoundWord[]} */ ([]));
  let reelStopped = $state([true, true]);
  let displayIndexes = $state([0, 0]);
  let leverDown = $state(false);
  let bankOpen = $state(false);
  let reduceMotion = $state(false);
  let nonsenseStreak = 0;
  let lastCombo = '';
  let audioBlocked = false;
  let speechToken = 0;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let tickTimer;
  /** @type {ReturnType<typeof setTimeout>[]} */
  let timers = [];
  /** @type {Confetti} */
  let confetti;

  const activeSet = $derived(REEL_SETS[setIndex]);
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar ?? DEFAULT_AVATAR));
  const fb = $derived(feedbackForLevel(1));
  const bankSet = $derived(new Set(profiles.mesinWords));
  const bankCount = $derived(bankSet.size);
  const spinLabel = $derived(
    phase === 'ready'
      ? Math.min(completedSpins + 1, SPINS_PER_ROUND)
      : Math.max(1, Math.min(completedSpins || 1, SPINS_PER_ROUND))
  );

  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /**
   * Keep the game moving if a browser blocks audio and a playback promise never ends.
   * @param {number|string} level
   * @param {string} text
   * @param {number} [variant]
   */
  async function speakStep(level, text, variant = 0) {
    if (audioBlocked) return false;
    let timedOut = false;
    await Promise.race([
      player.speak(voiceId, level, text, variant),
      new Promise((resolve) =>
        setTimeout(() => {
          timedOut = true;
          resolve(undefined);
        }, 2500)
      )
    ]);
    if (timedOut) {
      audioBlocked = true;
      player.stop();
      return false;
    }
    return true;
  }

  onMount(async () => {
    if (!profiles.active) return goto(`${base}/belajar`);
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    await Promise.allSettled([
      player.ensureLevel(voiceId, 2),
      player.ensureLevel(voiceId, 'words'),
      player.ensureLevel(voiceId, 'mesin'),
      player.ensureLevel(voiceId, 1)
    ]);
  });

  onDestroy(() => {
    speechToken += 1;
    clearTimers();
    player.stop();
  });

  function clearTimers() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = undefined;
    timers.forEach(clearTimeout);
    timers = [];
  }

  /** @param {number} ms @param {() => void} fn */
  function queue(ms, fn) {
    const timer = setTimeout(fn, ms);
    timers.push(timer);
  }

  /** @param {number} reel */
  function reelItems(reel) {
    const items = reel === 0 ? activeSet.a : activeSet.b;
    return [...items, ...items, ...items];
  }

  /** @param {number} reel */
  function reelStyle(reel) {
    const items = reel === 0 ? activeSet.a : activeSet.b;
    const index = items.length + (displayIndexes[reel] ?? 0);
    return `transform: translateY(calc(${index} * -1 * var(--tile-h)));`;
  }

  /** @param {number} reel */
  function randomReelIndex(reel) {
    const items = reel === 0 ? activeSet.a : activeSet.b;
    return Math.floor(Math.random() * items.length);
  }

  /** @param {number} reel @param {number} index */
  function setDisplayIndex(reel, index) {
    const next = [...displayIndexes];
    next[reel] = index;
    displayIndexes = next;
  }

  /** @param {number} reel @param {number} index */
  function stopReel(reel, index) {
    setDisplayIndex(reel, index);
    const stopped = [...reelStopped];
    stopped[reel] = true;
    reelStopped = stopped;
    reelThunk();
  }

  function allOutcomes() {
    /** @type {Outcome[]} */
    const outcomes = [];
    activeSet.a.forEach((sylA, indexA) => {
      activeSet.b.forEach((sylB, indexB) => {
        const combo = `${sylA}-${sylB}`;
        outcomes.push({ sylA, sylB, indexA, indexB, combo, word: mesinWordFor(sylA, sylB) });
      });
    });
    return outcomes;
  }

  function pickOutcome() {
    const outcomes = allOutcomes();
    const available = outcomes.filter((outcome) => outcome.combo !== lastCombo);
    const pool = available.length ? available : outcomes;
    if (nonsenseStreak >= 3) {
      const real = pool.filter((outcome) => outcome.word);
      const newWords = real.filter((outcome) => outcome.word && !bankSet.has(outcome.word));
      const picked = pick(newWords.length ? newWords : real);
      lastCombo = picked.combo;
      return picked;
    }
    const picked = pick(pool);
    lastCombo = picked.combo;
    return picked;
  }

  function startSpin() {
    if (phase !== 'ready') return;
    const outcome = pickOutcome();
    speechToken += 1;
    player.stop();
    clearTimers();
    currentOutcome = outcome;
    currentResult = null;
    phase = 'spinning';
    mood = 'idle';
    leverDown = true;
    audioBlocked = false;

    if (reduceMotion) {
      reelStopped = [true, true];
      for (let i = 1; i <= 3; i++) {
        queue(i * 150, () => {
          displayIndexes = [randomReelIndex(0), randomReelIndex(1)];
        });
      }
      queue(650, () => stopReel(0, outcome.indexA));
      queue(950, () => stopReel(1, outcome.indexB));
      queue(1120, () => {
        leverDown = false;
        readResult(outcome);
      });
      return;
    }

    displayIndexes = [outcome.indexA, outcome.indexB];
    reelStopped = [false, false];
    tickTimer = setInterval(spinTick, 90);
    queue(1200, () => stopReel(0, outcome.indexA));
    queue(1500, () => stopReel(1, outcome.indexB));
    queue(1820, () => {
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = undefined;
      leverDown = false;
      readResult(outcome);
    });
  }

  /** @param {Outcome} outcome */
  async function readResult(outcome) {
    const token = ++speechToken;
    phase = 'reading';
    await speakStep(2, outcome.sylA, 1);
    if (token !== speechToken) return;
    await speakStep(2, outcome.sylB, 1);
    if (token !== speechToken) return;

    if (outcome.word) {
      const picture = mesinPictureFor(outcome.word);
      const result = {
        kind: /** @type {'real'} */ ('real'),
        word: outcome.word,
        emoji: picture?.e ?? '',
        isNew: profiles.addMesinWord(outcome.word),
        phrase: pick(MESIN_REAL)
      };
      currentResult = result;
      roundFinds = [...roundFinds, { word: result.word, emoji: result.emoji, isNew: result.isNew }];
      mood = 'happy';
      nonsenseStreak = 0;
      confetti?.fire(result.isNew ? 70 : 48);
      sfxJackpot();
      await speakStep(mesinAudioBucket(outcome.word), outcome.word);
      if (token !== speechToken) return;
      await speakStep('mesin', result.phrase);
      if (token !== speechToken) return;
    } else {
      const word = `${outcome.sylA}${outcome.sylB}`;
      const result = {
        kind: /** @type {'funny'} */ ('funny'),
        word,
        emoji: '',
        isNew: false,
        phrase: pick(MESIN_FUNNY)
      };
      currentResult = result;
      mood = 'happy';
      nonsenseStreak += 1;
      await speakStep(2, outcome.sylA);
      if (token !== speechToken) return;
      await speakStep(2, outcome.sylB);
      if (token !== speechToken) return;
      await speakStep('mesin', result.phrase);
      if (token !== speechToken) return;
    }

    completedSpins = completedSpins + 1;
    phase = 'result';
    queue(outcome.word ? 1500 : 1200, () => {
      if (token !== speechToken) return;
      if (completedSpins >= SPINS_PER_ROUND) {
        finishRound();
      } else {
        currentResult = null;
        mood = 'idle';
        phase = 'ready';
      }
    });
  }

  function finishRound() {
    phase = 'finished';
    mood = 'happy';
    currentResult = null;
    leverDown = false;
    clearTimers();
    confetti?.fire(80);
    sfxJackpot();
    speechToken += 1;
    player.speak(voiceId, 1, pick(fb.complete)).catch(() => {});
    // TODO(#16): awardSticker('mesin') when /stiker lands
  }

  function nextRound() {
    speechToken += 1;
    player.stop();
    clearTimers();
    roundNumber += 1;
    setIndex = (setIndex + 1) % REEL_SETS.length;
    completedSpins = 0;
    roundFinds = [];
    currentOutcome = null;
    currentResult = null;
    reelStopped = [true, true];
    displayIndexes = [0, 0];
    leverDown = false;
    nonsenseStreak = 0;
    lastCombo = '';
    mood = 'idle';
    phase = 'ready';
  }

  /** @param {string} word */
  function playBankWord(word) {
    speechToken += 1;
    player.speak(voiceId, mesinAudioBucket(word), word).catch(() => {});
  }
</script>

<Confetti bind:this={confetti} />

<header class="mb-3 flex items-center justify-between gap-3">
  <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
  <div class="min-w-0 text-center">
    <div class="truncate text-base font-black text-slate-600">🎰 Mesin Kata</div>
    <div class="text-xs font-bold text-slate-400">Putaran {spinLabel}/{SPINS_PER_ROUND} · Set {activeSet.id}</div>
  </div>
  <button
    type="button"
    onclick={() => (bankOpen = true)}
    class="rounded-2xl bg-white px-3 py-2 text-sm font-black text-orange-500 shadow active:scale-95"
    aria-label="Buka Kata-kataku"
  >
    📚 {bankCount}/{MESIN_WORD_TOTAL}
  </button>
</header>

{#if phase === 'finished'}
  <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
    <Robot mood="happy" size={180} head={rc.head} body={rc.body} />
    <div>
      <h2 class="text-3xl font-black">Kamu menemukan {roundFinds.length} kata!</h2>
      <p class="mt-1 text-lg font-bold text-slate-500">Kata-kataku: {bankCount}/{MESIN_WORD_TOTAL}</p>
    </div>

    <div class="flex max-w-full flex-wrap justify-center gap-2">
      {#each roundFinds as found, i (`${found.word}-${i}`)}
        <button
          type="button"
          onclick={() => playBankWord(found.word)}
          class="rounded-2xl bg-white px-3 py-2 text-sm font-black text-slate-700 shadow"
        >
          {#if found.emoji}<span aria-hidden="true">{found.emoji}</span>{/if}
          {found.word}
          {#if found.isNew}<span class="ml-1 text-amber-500">Baru! ✨</span>{/if}
        </button>
      {/each}
    </div>

    <button onclick={() => (bankOpen = true)} class="rounded-2xl bg-white px-6 py-3 font-black text-orange-500 shadow active:scale-95">
      📚 Kata-kataku
    </button>

    <div class="flex flex-wrap justify-center gap-3">
      <button onclick={nextRound} class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95">
        Main Lagi
      </button>
      <button onclick={() => goto(`${base}/belajar`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">
        Selesai
      </button>
    </div>
  </div>
{:else}
  <div class="flex flex-1 flex-col gap-3">
    <div class="flex items-center justify-between rounded-3xl bg-white px-4 py-3 shadow">
      <div>
        <div class="text-xs font-black uppercase text-orange-400">Ronde {roundNumber}</div>
        <div class="text-sm font-bold text-slate-500">Kata baru: {roundFinds.filter((word) => word.isNew).length}</div>
      </div>
      <Robot {mood} size={78} head={rc.head} body={rc.body} />
      <div class="text-right">
        <div class="text-xs font-black uppercase text-slate-400">Mesin</div>
        <div class="text-sm font-bold text-slate-500">Set {activeSet.id}/3</div>
      </div>
    </div>

    <div class="rounded-3xl bg-slate-900 p-4 shadow-xl">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex gap-1">
          <span class="h-3 w-3 rounded-full bg-red-400"></span>
          <span class="h-3 w-3 rounded-full bg-amber-300"></span>
          <span class="h-3 w-3 rounded-full bg-emerald-300"></span>
        </div>
        <div class="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-orange-200">PUTAR KATA</div>
      </div>

      <div class="flex items-center justify-center gap-3">
        <div class="grid min-w-0 flex-1 grid-cols-2 gap-3">
          {#each [0, 1] as reel}
            <div class="reel-window rounded-3xl border-4 border-slate-700 bg-white shadow-inner">
              <div
                class="reel-strip"
                class:spinning={!reelStopped[reel] && !reduceMotion}
                class:reduced={reduceMotion}
                style={reelStyle(reel)}
              >
                {#each reelItems(reel) as syl}
                  <div class="reel-tile text-5xl font-black text-slate-800">{syl}</div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
        <div class="lever-base" aria-hidden="true">
          <div class="lever-arm" class:down={leverDown}></div>
          <div class="lever-knob"></div>
        </div>
      </div>
    </div>

    <button
      type="button"
      onclick={startSpin}
      disabled={phase !== 'ready'}
      class="min-h-24 rounded-3xl bg-orange-500 px-6 py-5 text-3xl font-black text-white shadow-lg active:scale-95 disabled:bg-slate-300 disabled:text-slate-500"
    >
      {#if phase === 'ready'}
        PUTAR! 🎰
      {:else if phase === 'spinning'}
        Berputar...
      {:else if phase === 'reading'}
        Membaca...
      {:else}
        Hore!
      {/if}
    </button>

    <div class="min-h-24 rounded-3xl bg-white p-4 text-center shadow">
      {#if currentResult}
        <div class:funny-wobble={currentResult.kind === 'funny'}>
          {#if currentResult.kind === 'real'}
            <div class="text-sm font-black uppercase text-green-500">Kata beneran!</div>
            <div class="mt-1 flex items-center justify-center gap-3 text-5xl font-black text-slate-900">
              {#if currentResult.emoji}<span aria-hidden="true">{currentResult.emoji}</span>{/if}
              <span>{currentResult.word}</span>
            </div>
            {#if currentResult.isNew}
              <div class="mt-2 text-sm font-black text-amber-500">Baru! ✨</div>
            {/if}
          {:else}
            <div class="text-sm font-black uppercase text-orange-500">Kata lucu!</div>
            <div class="mt-1 text-5xl font-black text-slate-900">{currentResult.word}</div>
          {/if}
        </div>
      {:else}
        <div class="flex h-full min-h-16 items-center justify-center text-sm font-bold text-slate-400">
          {phase === 'ready' ? 'Tekan PUTAR!' : 'Dengar suku katanya...'}
        </div>
      {/if}
    </div>

    <div class="flex min-h-14 flex-wrap gap-2">
      {#each roundFinds as found, i (`round-${found.word}-${i}`)}
        <button
          type="button"
          onclick={() => playBankWord(found.word)}
          class="rounded-2xl bg-white px-3 py-2 text-sm font-black text-slate-700 shadow"
        >
          {#if found.emoji}<span aria-hidden="true">{found.emoji}</span>{/if}
          {found.word}
          {#if found.isNew}<span class="ml-1 text-amber-500">Baru! ✨</span>{/if}
        </button>
      {/each}
    </div>
  </div>
{/if}

{#if bankOpen}
  <div class="fixed inset-0 z-40 overflow-y-auto bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Kata-kataku">
    <div class="mx-auto max-w-2xl rounded-3xl bg-white p-4 shadow-2xl">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black text-slate-800">📚 Kata-kataku</h2>
          <p class="text-sm font-bold text-slate-500">{bankCount}/{MESIN_WORD_TOTAL} kata</p>
        </div>
        <button onclick={() => (bankOpen = false)} class="rounded-2xl bg-slate-100 px-4 py-2 font-black active:scale-95">Tutup</button>
      </div>

      {#if bankCount >= MESIN_WORD_TOTAL}
        <div class="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-center font-black text-amber-600">🌟 Semua kata terkumpul!</div>
      {/if}

      <div class="grid gap-4">
        {#each MESIN_BANK_GROUPS as group (group.id)}
          <section>
            <h3 class="mb-2 text-sm font-black uppercase text-orange-400">Set {group.id}</h3>
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {#each group.words as word}
                {@const found = bankSet.has(word)}
                {@const picture = mesinPictureFor(word)}
                {#if found}
                  <button
                    type="button"
                    onclick={() => playBankWord(word)}
                    class="min-h-16 rounded-2xl bg-orange-50 px-2 py-2 text-center text-sm font-black text-slate-800 shadow-sm active:scale-95"
                  >
                    {#if picture}<span class="block text-xl" aria-hidden="true">{picture.e}</span>{/if}
                    <span>{word}</span>
                  </button>
                {:else}
                  <div class="grid min-h-16 place-items-center rounded-2xl bg-slate-100 text-2xl font-black text-slate-300">❓</div>
                {/if}
              {/each}
            </div>
          </section>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .reel-window {
    --tile-h: 78px;
    height: var(--tile-h);
    overflow: hidden;
  }

  .reel-strip {
    display: flex;
    flex-direction: column;
    transition: transform 500ms cubic-bezier(0.25, 1.4, 0.5, 1);
    will-change: transform;
  }

  .reel-strip.spinning {
    animation: reel-spin 0.4s linear infinite;
    transition: none;
  }

  .reel-strip.reduced {
    transition: none;
  }

  .reel-tile {
    display: grid;
    height: var(--tile-h);
    place-items: center;
  }

  .lever-base {
    position: relative;
    width: 26px;
    height: 112px;
    border-radius: 999px;
    background: #334155;
  }

  .lever-arm {
    position: absolute;
    left: 10px;
    top: 12px;
    width: 6px;
    height: 62px;
    border-radius: 999px;
    background: #cbd5e1;
    transform-origin: 50% 88%;
    transition: transform 260ms ease;
  }

  .lever-arm.down {
    transform: rotate(20deg) translateY(18px);
  }

  .lever-knob {
    position: absolute;
    left: 3px;
    top: 4px;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: #fb923c;
    box-shadow: 0 4px 0 #c2410c;
    transition: transform 260ms ease;
  }

  .lever-arm.down + .lever-knob {
    transform: translateY(52px);
  }

  .funny-wobble {
    animation: funny-wobble 0.48s ease;
  }

  @keyframes reel-spin {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(calc(var(--tile-h) * -8));
    }
  }

  @keyframes funny-wobble {
    0%, 100% {
      transform: rotate(0);
    }
    20% {
      transform: rotate(-3deg) scale(1.02);
    }
    45% {
      transform: rotate(3deg) scale(1.02);
    }
    70% {
      transform: rotate(-2deg);
    }
  }

  @media (min-width: 640px) {
    .reel-window {
      --tile-h: 92px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .reel-strip,
    .lever-arm,
    .lever-knob,
    .funny-wobble {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
