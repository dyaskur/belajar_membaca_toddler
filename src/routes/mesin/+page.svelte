<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy, onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { DEFAULT_AVATAR, robotColor } from '$lib/content/avatars.js';
  import { feedbackForLevel } from '$lib/content/feedback.js';
  import {
    REEL_SETS,
    SPINS_PER_ROUND,
    PITY_STREAK,
    BANK_GROUPS,
    BANK_TOTAL,
    MESIN_REAL,
    MESIN_FUNNY,
    mesinWordFor,
    mesinEmoji,
    mesinAudioBucket
  } from '$lib/content/mesin.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect, reelThunk, sfxJackpot, spinTick } from '$lib/audio/sfx.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  /** Reel window row height in px — must match h-24 tiles and the CSS keyframes below. */
  const TILE_H = 96;
  const REEL_LEN = 8;

  /** @typedef {{ mode: 'rest'|'spin'|'land', target: number }} Reel */

  /** @type {'ready'|'spinning'|'reading'|'finished'} */
  let phase = $state('ready');
  let round = $state(0); // 0-based; reel set = round % REEL_SETS.length
  let spin = $state(0); // spins started this round (1-based once playing)
  let found = $state(/** @type {{ w: string, e: string | null, isNew: boolean }[]} */ ([]));
  let result = $state(
    /** @type {{ kind: 'real' | 'funny', word: string, emoji: string | null, isNew: boolean } | null} */ (null)
  );
  let reelA = $state(/** @type {Reel} */ ({ mode: 'rest', target: 0 }));
  let reelB = $state(/** @type {Reel} */ ({ mode: 'rest', target: 0 }));
  /** @type {'idle'|'happy'|'sad'} */
  let mood = $state('idle');
  let bankOpen = $state(false);
  /** @type {Confetti} */
  let confetti;

  let nonsenseStreak = 0;
  let lastCombo = /** @type {[number, number] | null} */ (null);
  let reducedMotion = false;
  let speechToken = 0;
  let tickTimer = /** @type {ReturnType<typeof setInterval> | undefined} */ (undefined);
  let stopTimerA = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  let stopTimerB = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  let resultTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  let moodTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar ?? DEFAULT_AVATAR));
  const fb = $derived(feedbackForLevel(1));
  const set = $derived(REEL_SETS[round % REEL_SETS.length]);
  const bankSet = $derived(new Set(profiles.mesinWords));
  const bankCount = $derived(profiles.mesinWords.length);
  const displaySpin = $derived(Math.max(spin, 1));

  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  onMount(async () => {
    if (!profiles.active) return goto(`${base}/belajar`);
    reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    await Promise.allSettled([
      player.ensureLevel(voiceId, 2),
      player.ensureLevel(voiceId, 'words'),
      player.ensureLevel(voiceId, 'mesin'),
      player.ensureLevel(voiceId, 1)
    ]);
  });

  onDestroy(() => {
    player.stop();
    clearTimers();
    clearTimeout(moodTimer);
  });

  function clearTimers() {
    clearInterval(tickTimer);
    clearTimeout(stopTimerA);
    clearTimeout(stopTimerB);
    clearTimeout(resultTimer);
  }

  /**
   * Pick the outcome BEFORE the animation starts (rigged for joy): never the
   * previous combo; after PITY_STREAK nonsense spins force a real word,
   * preferring ones not yet in the bank.
   * @returns {[number, number]}
   */
  function pickOutcome() {
    /** @type {[number, number][]} */
    const all = [];
    for (let i = 0; i < set.a.length; i++) {
      for (let j = 0; j < set.b.length; j++) {
        if (lastCombo && lastCombo[0] === i && lastCombo[1] === j) continue;
        all.push([i, j]);
      }
    }
    const real = all.filter(([i, j]) => mesinWordFor(set.a[i], set.b[j]));
    if (nonsenseStreak >= PITY_STREAK && real.length) {
      const fresh = real.filter(([i, j]) => !bankSet.has(set.a[i] + set.b[j]));
      return pick(fresh.length ? fresh : real);
    }
    return pick(all);
  }

  function putar() {
    if (phase !== 'ready') return;
    const [ai, bi] = pickOutcome();
    lastCombo = [ai, bi];
    spin += 1;
    phase = 'spinning';
    result = null;
    mood = 'idle';
    speechToken += 1;
    player.stop();
    clearTimers();
    clearTimeout(moodTimer);

    if (reducedMotion) {
      // No scrolling strips: flick through 3 discrete syllable swaps, then land.
      let flicks = 0;
      tickTimer = setInterval(() => {
        flicks += 1;
        if (flicks < 3) {
          reelA = { mode: 'rest', target: Math.floor(Math.random() * REEL_LEN) };
          reelB = { mode: 'rest', target: Math.floor(Math.random() * REEL_LEN) };
          return;
        }
        clearInterval(tickTimer);
        reelA = { mode: 'rest', target: ai };
        reelB = { mode: 'rest', target: bi };
        reelThunk();
        resultTimer = setTimeout(() => readResult(ai, bi), 300);
      }, 200);
      return;
    }

    reelA = { mode: 'spin', target: ai };
    reelB = { mode: 'spin', target: bi };
    tickTimer = setInterval(spinTick, 90);
    stopTimerA = setTimeout(() => {
      reelA = { mode: 'land', target: ai };
      reelThunk();
    }, 1200);
    stopTimerB = setTimeout(() => {
      reelB = { mode: 'land', target: bi };
      reelThunk();
      clearInterval(tickTimer);
      // Let the landing bounce settle before the machine starts reading.
      resultTimer = setTimeout(() => readResult(ai, bi), 600);
    }, 1500);
  }

  /** @param {number} ai @param {number} bi */
  async function readResult(ai, bi) {
    phase = 'reading';
    const sa = set.a[ai];
    const sb = set.b[bi];
    const word = mesinWordFor(sa, sb);
    const token = ++speechToken;
    try {
      // Each syllable slowly (slow variant of the existing level-2 clips) …
      await player.speak(voiceId, 2, sa, 1);
      if (token !== speechToken) return;
      await player.speak(voiceId, 2, sb, 1);
      if (token !== speechToken) return;

      if (word) {
        const emoji = mesinEmoji(word);
        const isNew = profiles.addMesinWord(word);
        result = { kind: 'real', word, emoji, isNew };
        found = [...found, { w: word, e: emoji, isNew }];
        nonsenseStreak = 0;
        mood = 'happy';
        confetti?.fire(40);
        sfxJackpot();
        await player.speak(voiceId, mesinAudioBucket(word), word);
        if (token !== speechToken) return;
        await player.speak(voiceId, 'mesin', pick(MESIN_REAL));
      } else {
        // Nonsense blend: the two syllable clips back-to-back at normal speed —
        // hearing them snap together IS the blending lesson.
        result = { kind: 'funny', word: sa + sb, emoji: null, isNew: false };
        nonsenseStreak += 1;
        await player.speak(voiceId, 2, sa, 0);
        if (token !== speechToken) return;
        await player.speak(voiceId, 2, sb, 0);
        if (token !== speechToken) return;
        mood = 'happy'; // a giggle moment, never a failure
        clearTimeout(moodTimer);
        moodTimer = setTimeout(() => {
          if (result?.kind === 'funny') mood = 'idle';
        }, 1400);
        await player.speak(voiceId, 'mesin', pick(MESIN_FUNNY));
      }
    } catch {
      /* audio hiccup — keep the game moving */
    }
    if (token !== speechToken) return;
    if (spin >= SPINS_PER_ROUND) finishRound();
    else phase = 'ready';
  }

  function finishRound() {
    // TODO(#16): awardSticker('mesin') when /stiker lands
    phase = 'finished';
    result = null;
    mood = 'happy';
    confetti?.fire(70);
    chimeCorrect();
    speechToken += 1;
    player.speak(voiceId, 1, pick(fb.complete)).catch(() => {});
  }

  /** @param {number} nextRound */
  function startRound(nextRound) {
    round = nextRound;
    spin = 0;
    found = [];
    result = null;
    nonsenseStreak = 0;
    lastCombo = null;
    reelA = { mode: 'rest', target: 0 };
    reelB = { mode: 'rest', target: 0 };
    mood = 'idle';
    phase = 'ready';
    speechToken += 1;
    player.stop();
    clearTimers();
    clearTimeout(moodTimer);
  }

  /** Bank overlay: tap a found word to hear it. @param {string} w */
  function speakBankWord(w) {
    speechToken += 1;
    player.speak(voiceId, mesinAudioBucket(w), w).catch(() => {});
  }

  /** Strip offset (px) for a resting/landed reel — the middle copy of the strip. @param {Reel} r */
  function reelOffset(r) {
    return -(REEL_LEN + r.target) * TILE_H;
  }
</script>

<Confetti bind:this={confetti} />

<header class="mb-3 flex items-center justify-between">
  <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
  <span class="font-bold text-slate-500">🎰 Mesin Kata · Putaran {displaySpin}/{SPINS_PER_ROUND}</span>
  <button
    onclick={() => (bankOpen = true)}
    class="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-700 active:scale-95"
    aria-label="Kata-kataku"
  >
    📚 {bankCount}/{BANK_TOTAL}
  </button>
</header>

{#if phase === 'finished'}
  <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
    <Robot mood="happy" size={180} head={rc.head} body={rc.body} />
    <h2 class="text-3xl font-black">Hebat! 🌟</h2>
    <p class="text-xl">Kamu menemukan {found.length} kata!</p>
    {#if found.length}
      <div class="flex max-w-sm flex-wrap justify-center gap-2">
        {#each found as f, i (i)}
          <span class="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-lg font-black shadow">
            {#if f.e}<span aria-hidden="true">{f.e}</span>{/if}
            {f.w}
            {#if f.isNew}<span class="text-xs text-amber-500">Baru! ✨</span>{/if}
          </span>
        {/each}
      </div>
    {/if}
    <button
      onclick={() => (bankOpen = true)}
      class="rounded-full bg-amber-100 px-4 py-2 font-black text-amber-700 active:scale-95"
    >
      📚 Kata-kataku: {bankCount}/{BANK_TOTAL}
    </button>
    <div class="flex gap-3">
      <button
        onclick={() => startRound(round + 1)}
        class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95"
      >
        Main Lagi
      </button>
      <button
        onclick={() => goto(`${base}/belajar`)}
        class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95"
      >
        Selesai
      </button>
    </div>
  </div>
{:else}
  <div class="flex flex-1 flex-col items-center gap-4">
    <Robot {mood} size={86} head={rc.head} body={rc.body} />

    <!-- The machine -->
    <div class="relative rounded-3xl bg-gradient-to-b from-amber-400 to-orange-500 p-5 pr-10 shadow-lg">
      <div class="flex gap-3">
        {#each [reelA, reelB] as reel, r (r)}
          {@const syls = r === 0 ? set.a : set.b}
          <div class="h-24 w-28 overflow-hidden rounded-2xl border-4 border-amber-200 bg-white shadow-inner">
            <div
              class="reel-strip {reel.mode === 'spin' ? 'reel-spinning' : ''} {reel.mode === 'land' ? 'reel-landing' : ''}"
              style="transform: translateY({reel.mode === 'spin' ? 0 : reelOffset(reel)}px)"
            >
              {#each [0, 1, 2] as copy (copy)}
                {#each syls as syl (copy + syl)}
                  <div class="flex h-24 items-center justify-center text-4xl font-black text-slate-800">{syl}</div>
                {/each}
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- Decorative lever (the real control is the big PUTAR button) -->
      <div class="absolute -right-2 top-1/2 -translate-y-1/2" aria-hidden="true">
        <div class="lever {phase === 'spinning' ? 'lever-down' : ''}">
          <div class="mx-auto h-4 w-4 rounded-full bg-red-500 shadow"></div>
          <div class="mx-auto h-10 w-1.5 rounded-full bg-slate-300"></div>
        </div>
        <div class="mx-auto h-3 w-3 rounded-full bg-slate-400"></div>
      </div>
    </div>

    <!-- Result card -->
    {#if result}
      <div
        class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl bg-white px-6 py-3 shadow {result.kind ===
        'funny'
          ? 'wobble'
          : ''}"
      >
        <div class="flex items-center gap-3">
          {#if result.emoji}<span class="text-5xl" aria-hidden="true">{result.emoji}</span>{/if}
          <span class="text-4xl font-black">{result.word}</span>
        </div>
        {#if result.kind === 'real'}
          <span class="font-black text-green-600">
            Kata beneran! 🎉
            {#if result.isNew}<span class="text-amber-500">Baru! ✨</span>{/if}
          </span>
        {:else}
          <span class="font-black text-slate-400">Kata lucu! 😄</span>
        {/if}
      </div>
    {:else}
      <div class="min-h-24"></div>
    {/if}

    <!-- Words found this round -->
    {#if found.length}
      <div class="flex max-w-sm flex-wrap justify-center gap-2">
        {#each found as f, i (i)}
          <span class="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-black shadow">
            {#if f.e}<span aria-hidden="true">{f.e}</span>{/if}
            {f.w}
            {#if f.isNew}<span class="text-xs text-amber-500">Baru! ✨</span>{/if}
          </span>
        {/each}
      </div>
    {/if}

    <div class="flex-1"></div>

    <button
      onclick={putar}
      disabled={phase !== 'ready'}
      class="mb-2 min-h-24 w-full max-w-sm rounded-3xl bg-red-500 text-3xl font-black text-white shadow-lg active:scale-95 disabled:opacity-60"
    >
      PUTAR! 🎰
    </button>
  </div>
{/if}

<!-- "Kata-kataku" word bank overlay -->
{#if bankOpen}
  <div class="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
    <button class="absolute inset-0 bg-black/40" onclick={() => (bankOpen = false)} aria-label="Tutup"></button>
    <div class="relative z-50 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xl font-black">📚 Kata-kataku {bankCount}/{BANK_TOTAL}</h2>
        <button onclick={() => (bankOpen = false)} class="text-2xl" aria-label="Tutup">✖️</button>
      </div>
      {#if bankCount >= BANK_TOTAL}
        <p class="mb-3 text-center font-black text-amber-500">🌟 Semua kata sudah kamu temukan! 🌟</p>
      {/if}
      {#each BANK_GROUPS as group, i (i)}
        <h3 class="mb-2 mt-4 text-sm font-black text-slate-400">Mesin {i + 1}</h3>
        <div class="grid grid-cols-3 gap-2">
          {#each group as w (w)}
            {#if bankSet.has(w)}
              <button
                onclick={() => speakBankWord(w)}
                class="flex flex-col items-center rounded-2xl bg-amber-50 px-2 py-2 font-black text-slate-800 shadow-sm active:scale-95"
              >
                {#if mesinEmoji(w)}<span class="text-2xl" aria-hidden="true">{mesinEmoji(w)}</span>{/if}
                <span>{w}</span>
              </button>
            {:else}
              <div class="flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-300">❓</div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .reel-strip {
    will-change: transform;
  }
  /* One full 8-tile cycle (8 × 96px). The strip holds 3 copies, so looping
     0 → -768px is seamless. Keep in sync with TILE_H / REEL_LEN. */
  .reel-spinning {
    animation: reel-spin 0.4s linear infinite;
  }
  @keyframes reel-spin {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-768px);
    }
  }
  /* Landing: fast final sweep onto the target with an overshoot bounce. */
  .reel-landing {
    transition: transform 0.5s cubic-bezier(0.25, 1.4, 0.5, 1);
  }

  .lever {
    transform-origin: bottom center;
    transition: transform 0.25s ease-in;
  }
  .lever-down {
    transform: rotate(160deg);
  }

  .wobble {
    animation: wobble 0.6s ease-in-out;
  }
  @keyframes wobble {
    0%,
    100% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(-4deg);
    }
    50% {
      transform: rotate(4deg);
    }
    75% {
      transform: rotate(-2deg);
    }
  }
</style>
