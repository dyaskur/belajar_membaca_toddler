<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { getLevel, getLesson, MASTERY } from '$lib/content/levels.js';
  import { buildLessonRound, pick } from '$lib/game/quiz.js';
  import { feedbackForLevel, SAY_BUKAN, SAY_RETRY } from '$lib/content/feedback.js';
  import { promptsForLevel } from '$lib/content/prompts.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect, buzzWrong } from '$lib/audio/sfx.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  const levelId = $derived(Number($page.params.level));
  const lessonIndex = $derived(Number($page.params.lesson));
  const level = $derived(getLevel(levelId));
  const lesson = $derived(getLesson(levelId, lessonIndex));

  /** @type {'teach'|'practice'|'done'} */
  let phase = $state('teach');
  let teachIdx = $state(0);
  let round = $state(/** @type {ReturnType<typeof buildLessonRound>} */ ([]));
  let idx = $state(0);
  let correct = $state(0);
  let streak = $state(0);
  let busy = $state(false); // ignore taps while feedback audio plays
  let mistakeThisQ = $state(false); // any wrong tap on the current question
  let wrongTiles = $state(/** @type {Set<string>} */ (new Set())); // disabled wrong tiles
  /** @type {string|null} */
  let chosenId = $state(null);
  /** @type {'idle'|'happy'|'sad'} */
  let mood = $state('idle');
  let replayN = $state(0);
  /** @type {Confetti} */
  let confetti;

  const current = $derived(round[idx]);
  const fb = $derived(feedbackForLevel(levelId));
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const teachItem = $derived(lesson?.items[teachIdx]);
  const progress = $derived(
    phase === 'teach'
      ? lesson
        ? ((teachIdx + 1) / lesson.items.length) * 100
        : 0
      : round.length
        ? (idx / round.length) * 100
        : 0
  );

  onMount(async () => {
    if (!profiles.active || !level || !lesson) return goto(`${base}/belajar/${levelId}`);
    await player.ensureLevel(voiceId, levelId);
    player.prefetchNext(voiceId, levelId);
    round = buildLessonRound(levelId, lessonIndex);
    sayTeach();
  });

  const beat = () => new Promise((r) => setTimeout(r, 250));

  // --- Teach phase ---
  function sayTeach() {
    if (teachItem) player.speak(voiceId, levelId, teachItem.text);
  }
  function teachNext() {
    if (!lesson) return;
    if (teachIdx + 1 >= lesson.items.length) {
      phase = 'practice';
      askCurrent();
      return;
    }
    teachIdx++;
    sayTeach();
  }

  // --- Practice phase ---
  async function askCurrent() {
    if (!current) return;
    replayN = 0;
    mood = 'idle';
    await player.speak(voiceId, levelId, pick(promptsForLevel(levelId)));
    await beat();
    if (current) await player.speak(voiceId, levelId, current.target.text, 0);
  }

  function replay() {
    if (!current) return;
    const count = player.variantCount(voiceId, levelId, current.target.text) || 1;
    replayN = (replayN + 1) % count;
    player.speak(voiceId, levelId, current.target.text, replayN);
  }

  /** @param {import('$lib/content/levels.js').Item} tile */
  async function choose(tile) {
    if (busy || !current || wrongTiles.has(tile.id)) return;
    const right = tile.id === current.target.id;
    busy = true;
    chosenId = tile.id;
    if (right) {
      // First-try only counts toward mastery; retries still let them learn.
      if (!mistakeThisQ) correct++;
      streak = mistakeThisQ ? 0 : streak + 1;
      mood = 'happy';
      confetti?.fire(streak >= 3 ? 44 : 28);
      chimeCorrect();
      await player.speak(voiceId, levelId, pick(fb.correct));
      busy = false;
      setTimeout(next, 550);
    } else {
      // Contextual correction: "<lead>. Itu <tapped>. Coba cari <target>." Then retry.
      mistakeThisQ = true;
      streak = 0;
      wrongTiles = new Set([...wrongTiles, tile.id]);
      mood = 'sad';
      buzzWrong();
      // "Maaf, kamu salah. Ini bukan <correct answer>. Coba lagi."
      // (names the TARGET they should find, not the tile they tapped)
      await player.speak(voiceId, levelId, pick(fb.wrong));
      await player.speak(voiceId, levelId, SAY_BUKAN);
      await player.speak(voiceId, levelId, current.target.text, 1);
      await player.speak(voiceId, levelId, SAY_RETRY);
      mood = 'idle';
      chosenId = null;
      busy = false; // same question stays — child tries again
    }
  }

  function next() {
    chosenId = null;
    mood = 'idle';
    mistakeThisQ = false;
    wrongTiles = new Set();
    if (idx + 1 >= round.length) return finish();
    idx++;
    askCurrent();
  }

  async function finish() {
    phase = 'done';
    const s = round.length ? correct / round.length : 0;
    const ok = s >= MASTERY;
    mood = ok ? 'happy' : 'sad';
    profiles.recordLessonResult(levelId, lessonIndex, s, ok);
    if (ok) confetti?.fire(60);
    await player.speak(voiceId, levelId, pick(fb.complete));
  }

  const score = $derived(round.length ? correct / round.length : 0);
  const passed = $derived(score >= MASTERY);
</script>

<Confetti bind:this={confetti} />

{#if level && lesson}
  <header class="mb-3 flex items-center justify-between">
    <button onclick={() => goto(`${base}/belajar/${levelId}`)} class="text-2xl" aria-label="Kembali">⬅️</button>
    <span class="font-bold text-slate-500">Level {levelId} · Pelajaran {lessonIndex + 1}</span>
    <span class="text-sm text-slate-400">
      {#if phase === 'teach'}{teachIdx + 1}/{lesson.items.length}{:else if phase === 'practice'}{Math.min(idx + 1, round.length)}/{round.length}{/if}
    </span>
  </header>

  <div class="mb-6 h-3 w-full overflow-hidden rounded-full bg-slate-200">
    <div class="h-full rounded-full bg-amber-400 transition-all duration-500" style="width:{progress}%"></div>
  </div>

  {#if phase === 'teach'}
    <div class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <span class="text-sm font-bold uppercase tracking-wide text-amber-500">Ayo kenali</span>
      <button
        onclick={sayTeach}
        class="flex h-44 w-44 items-center justify-center rounded-[2rem] bg-white text-7xl font-black shadow-lg active:scale-95"
        aria-label="Dengar"
      >
        {teachItem?.display ?? teachItem?.text}
      </button>
      <button onclick={sayTeach} class="flex items-center gap-2 rounded-full bg-amber-100 px-5 py-2 active:scale-95">
        <span class="text-2xl">🔊</span><span class="font-bold text-amber-700">Dengar</span>
      </button>
      <button
        onclick={teachNext}
        class="rounded-2xl bg-amber-500 px-8 py-4 text-lg font-bold text-white active:scale-95"
      >
        {lesson && teachIdx + 1 >= lesson.items.length ? 'Mulai Latihan ▶' : 'Lanjut →'}
      </button>
    </div>
  {:else if phase === 'practice' && current}
    <div class="relative flex flex-1 flex-col items-center justify-start gap-5">
      {#if streak >= 2}
        <div class="absolute right-0 top-0 animate-pop rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-white shadow">
          🔥 {streak} beruntun!
        </div>
      {/if}
      <Robot {mood} size={150} />
      <button onclick={replay} class="flex items-center gap-3 rounded-full bg-amber-100 px-6 py-3 active:scale-95" aria-label="Dengar lagi">
        <span class="text-3xl">🔊</span><span class="font-bold text-amber-700">Dengar lagi</span>
      </button>
      <div class="grid w-full grid-cols-3 gap-4">
        {#each current.tiles as tile (tile.id)}
          {@const isRight = tile.id === current.target.id}
          {@const isWrong = wrongTiles.has(tile.id)}
          {@const isWon = busy && chosenId === tile.id && isRight}
          <button
            onclick={() => choose(tile)}
            disabled={busy || isWrong}
            class="flex aspect-square items-center justify-center rounded-3xl text-4xl font-black shadow transition active:scale-95 sm:text-5xl
              {isWon ? 'animate-pop bg-green-400 text-white' : ''}
              {isWrong ? 'animate-shake bg-red-300 text-white opacity-50' : ''}
              {!isWon && !isWrong ? 'bg-white' : ''}"
          >
            {tile.display ?? tile.text}
          </button>
        {/each}
      </div>
    </div>
  {:else if phase === 'done'}
    <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <Robot {mood} size={190} />
      <h2 class="text-3xl font-black">{passed ? 'Hebat! ⭐' : 'Coba lagi, ya! 💪'}</h2>
      <p class="text-xl">Skor: {correct}/{round.length} ({Math.round(score * 100)}%)</p>
      <div class="flex gap-3">
        <button onclick={() => location.reload()} class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95">Ulangi</button>
        <button onclick={() => goto(`${base}/belajar/${levelId}`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Selesai</button>
      </div>
    </div>
  {/if}
{/if}

<style>
  :global(.animate-pop) { animation: pop 0.4s ease; }
  :global(.animate-shake) { animation: shake 0.4s ease; }
  @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
  @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
  @media (prefers-reduced-motion: reduce) { :global(.animate-pop), :global(.animate-shake) { animation: none; } }
</style>
