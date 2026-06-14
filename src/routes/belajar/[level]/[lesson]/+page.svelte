<script>
  import { page } from '$app/stores';
  import { goto, afterNavigate } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { getLevel, getLesson, lessonsForLevel, MASTERY } from '$lib/content/levels.js';
  import { buildLessonRound, buildExamRound, pick } from '$lib/game/quiz.js';
  import {
    feedbackForLevel,
    SAY_INI,
    SAY_FIND,
    LESSON_FAIL,
    EXAM_PASS,
    EXAM_FAIL
  } from '$lib/content/feedback.js';
  import { promptsForLevel } from '$lib/content/prompts.js';
  import { introText, typeWord } from '$lib/content/teach.js';
  import { decompose, BLEND_LEVELS } from '$lib/content/blend.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect, buzzWrong } from '$lib/audio/sfx.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  const levelId = $derived(Number($page.params.level));
  const lessonIndex = $derived(Number($page.params.lesson));
  const level = $derived(getLevel(levelId));
  const lesson = $derived(getLesson(levelId, lessonIndex));
  const isExam = $derived(lesson?.exam ?? false);

  /** @type {'teach'|'practice'|'done'} */
  let phase = $state('teach');
  let highlightIdx = $state(-1); // which letter is lit while the intro narrates
  let introDone = $state(false);
  let round = $state(/** @type {ReturnType<typeof buildLessonRound>} */ ([]));
  let idx = $state(0);
  let correct = $state(0);
  let streak = $state(0);
  let asking = $state(false); // question audio playing -> tiles locked
  let resolving = $state(false); // correct answer chosen -> advancing -> tiles locked
  let mistakeThisQ = $state(false); // any wrong tap on the current question
  let wrongTiles = $state(/** @type {Set<string>} */ (new Set())); // disabled wrong tiles
  let turnToken = 0; // bumped on each choose() so a stale wrong-feedback sequence bails
  /** @type {string|null} */
  let chosenId = $state(null);
  /** @type {'idle'|'happy'|'sad'} */
  let mood = $state('idle');
  let replayN = $state(0);
  /** @type {Confetti} */
  let confetti;
  // Bumped on (re)start / leave so stale async narration sequences abandon themselves.
  let runId = 0;

  onDestroy(() => {
    runId++;
    player.stop();
  });

  const current = $derived(round[idx]);
  const fb = $derived(feedbackForLevel(levelId));
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const progress = $derived(
    phase === 'teach' ? 0 : round.length ? (idx / round.length) * 100 : 0
  );
  const totalLessons = $derived(lessonsForLevel(levelId).length);
  const hasNextLesson = $derived(lessonIndex + 1 < totalLessons);

  function resetState() {
    phase = 'teach';
    highlightIdx = -1;
    introDone = false;
    round = [];
    idx = 0;
    correct = 0;
    streak = 0;
    asking = false;
    resolving = false;
    mistakeThisQ = false;
    wrongTiles = new Set();
    chosenId = null;
    mood = 'idle';
    replayN = 0;
  }

  // Runs on first load AND on lesson->lesson navigation (same route, component reused).
  async function startLesson() {
    runId++;
    player.stop();
    resetState();
    if (!profiles.active || !level || !lesson) return goto(`${base}/belajar/${levelId}`);
    await player.ensureLevel(voiceId, levelId);
    player.prefetchNext(voiceId, levelId);
    if (isExam) {
      round = buildExamRound(levelId); // no teaching — whole-level test
      phase = 'practice';
      askCurrent();
    } else {
      round = buildLessonRound(levelId, lessonIndex);
      runIntro();
    }
  }

  afterNavigate(() => startLesson());

  function goNextLesson() {
    if (hasNextLesson) goto(`${base}/belajar/${levelId}/${lessonIndex + 1}`);
    else goto(`${base}/belajar/${levelId}`);
  }

  const beat = () => new Promise((r) => setTimeout(r, 250));

  // --- Teach phase: narrate the lesson, lighting up each item as it's spoken ---
  async function runIntro() {
    if (!lesson) return;
    const my = runId;
    const items = lesson.items;
    introDone = false;
    highlightIdx = -1;
    // One fluid clip: "Kita akan belajar empat huruf, yaitu" ...
    await player.speak(voiceId, levelId, introText(levelId, items.length));
    if (runId !== my || phase !== 'teach') return;
    // ... then each item, lit up while its blend is spoken
    for (let i = 0; i < items.length; i++) {
      highlightIdx = i;
      await narrateItem(my, items[i].text);
      if (runId !== my || phase !== 'teach') return;
    }
    introDone = true;
  }

  /**
   * Speak an item. For syllable/word levels, blend it: each letter, each syllable,
   * then the whole thing (e.g. "be, o, bo, el, a, la, bola").
   * @param {number} my @param {string} text
   */
  async function narrateItem(my, text) {
    if (!BLEND_LEVELS.has(levelId)) {
      await player.speak(voiceId, levelId, text);
      return;
    }
    const d = decompose(levelId, text);
    for (const syl of d.syllables) {
      for (const L of syl.letters) {
        await player.speak(voiceId, 1, L); // letter name (from Level 1)
        if (runId !== my || phase !== 'teach') return;
      }
      if (d.multi) {
        await player.speak(voiceId, 2, syl.text); // the syllable (from Level 2)
        if (runId !== my || phase !== 'teach') return;
      }
    }
    await player.speak(voiceId, levelId, text); // the whole syllable/word
  }

  /** Tap an item to hear its blend (and show the breakdown). @param {number} i */
  async function sayOne(i) {
    if (!lesson) return;
    const my = runId;
    highlightIdx = i;
    await narrateItem(my, lesson.items[i].text);
  }

  function startPractice() {
    player.stop();
    phase = 'practice';
    askCurrent();
  }

  // --- Practice phase ---
  async function askCurrent() {
    if (!current) return;
    const my = runId;
    const myIdx = idx;
    replayN = 0;
    mood = 'idle';
    asking = true; // lock tiles while the question is read
    await player.speak(voiceId, levelId, pick(promptsForLevel(levelId)));
    if (runId !== my) return;
    await beat();
    if (runId !== my) return;
    if (idx === myIdx && current) await player.speak(voiceId, levelId, current.target.text, 0);
    if (runId === my && idx === myIdx) asking = false; // question done -> tiles tappable
  }

  function replay() {
    if (!current) return;
    const count = player.variantCount(voiceId, levelId, current.target.text) || 1;
    replayN = (replayN + 1) % count;
    player.speak(voiceId, levelId, current.target.text, replayN);
  }

  /** @param {import('$lib/content/levels.js').Item} tile */
  async function choose(tile) {
    // Locked only while the question plays or a correct answer is advancing.
    // During wrong-answer feedback the child CAN tap again (it interrupts the voice).
    if (asking || resolving || !current || wrongTiles.has(tile.id)) return;
    const my = runId;
    const token = ++turnToken; // any new tap abandons a still-playing wrong sequence
    const right = tile.id === current.target.id;
    if (right) {
      resolving = true;
      chosenId = tile.id;
      if (!mistakeThisQ) correct++; // first-try only counts toward mastery
      streak = mistakeThisQ ? 0 : streak + 1;
      mood = 'happy';
      confetti?.fire(streak >= 3 ? 44 : 28);
      chimeCorrect();
      player.stop(); // cut off any wrong-feedback voice still playing
      await player.speak(voiceId, levelId, pick(fb.correct));
      setTimeout(next, 550);
    } else {
      // "Maaf, kamu salah. Ini <tapped>. Kamu harus cari <target>." — interruptible:
      // each await bails if a newer tap (token change) superseded this sequence.
      mistakeThisQ = true;
      streak = 0;
      wrongTiles = new Set([...wrongTiles, tile.id]);
      chosenId = null;
      mood = 'sad';
      buzzWrong();
      await player.speak(voiceId, levelId, pick(fb.wrong));
      if (runId !== my || token !== turnToken) return;
      await player.speak(voiceId, levelId, SAY_INI);
      if (runId !== my || token !== turnToken) return;
      await player.speak(voiceId, levelId, tile.text, 1);
      if (runId !== my || token !== turnToken) return;
      await player.speak(voiceId, levelId, SAY_FIND);
      if (runId !== my || token !== turnToken) return;
      await player.speak(voiceId, levelId, current.target.text, 1);
      if (runId !== my || token !== turnToken) return;
      mood = 'idle';
    }
  }

  function next() {
    chosenId = null;
    mood = 'idle';
    mistakeThisQ = false;
    resolving = false;
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
    if (ok) celebrate(isExam);
    if (isExam) {
      await player.speak(voiceId, levelId, ok ? EXAM_PASS : EXAM_FAIL);
    } else {
      await player.speak(voiceId, levelId, ok ? pick(fb.complete) : LESSON_FAIL);
    }
  }

  /** Confetti — extra bursts for a passed exam. @param {boolean} big */
  function celebrate(big) {
    confetti?.fire(big ? 120 : 60);
    if (big) {
      setTimeout(() => confetti?.fire(80), 500);
      setTimeout(() => confetti?.fire(80), 1100);
    }
  }

  const score = $derived(round.length ? correct / round.length : 0);
  const passed = $derived(score >= MASTERY);
  const nextLevel = $derived(getLevel(levelId + 1));

  function goNextLevel() {
    if (nextLevel) goto(`${base}/belajar/${levelId + 1}`);
    else goto(`${base}/belajar`); // finished the last level
  }
</script>

<Confetti bind:this={confetti} />

{#if level && lesson}
  <header class="mb-3 flex items-center justify-between">
    <button onclick={() => goto(`${base}/belajar/${levelId}`)} class="text-2xl" aria-label="Kembali">⬅️</button>
    <span class="font-bold text-slate-500">
      Level {levelId} · {isExam ? '🏆 Ujian Akhir' : `Pelajaran ${lessonIndex + 1}`}
    </span>
    <span class="text-sm text-slate-400">
      {#if phase === 'practice'}{Math.min(idx + 1, round.length)}/{round.length}{/if}
    </span>
  </header>

  <div class="mb-6 h-3 w-full overflow-hidden rounded-full bg-slate-200">
    <div class="h-full rounded-full bg-amber-400 transition-all duration-500" style="width:{progress}%"></div>
  </div>

  {#if phase === 'teach'}
    <div class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Robot mood="happy" size={110} />
      <span class="text-base font-bold text-amber-600">Ayo belajar {typeWord(levelId)}!</span>

      <!-- All items shown together; each lights up as it's spoken -->
      <div class="flex flex-wrap items-center justify-center gap-3">
        {#each lesson.items as it, i}
          <button
            onclick={() => sayOne(i)}
            class="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl font-black shadow transition-all duration-200 sm:h-24 sm:w-24 sm:text-5xl
              {highlightIdx === i
                ? 'scale-110 bg-amber-400 text-white ring-4 ring-amber-200'
                : 'bg-white text-slate-700'}
              {highlightIdx >= 0 && highlightIdx !== i ? 'opacity-50' : ''}"
          >
            {it.display ?? it.text}
          </button>
        {/each}
      </div>

      <!-- Blend breakdown for the active item: d + a = da  /  b+o=bo · l+a=la = bola -->
      {#if highlightIdx >= 0 && BLEND_LEVELS.has(levelId) && lesson.items[highlightIdx]}
        {@const d = decompose(levelId, lesson.items[highlightIdx].text)}
        <div class="flex min-h-12 flex-wrap items-center justify-center gap-1.5 text-2xl font-black sm:text-3xl">
          {#each d.syllables as syl, si}
            {#each syl.letters as L, li}
              <span class="rounded-lg bg-white px-2.5 py-1 text-slate-700 shadow-sm">{L}</span>
              {#if li < syl.letters.length - 1}<span class="text-amber-500">+</span>{/if}
            {/each}
            <span class="text-slate-400">=</span>
            <span class="rounded-lg bg-amber-200 px-2.5 py-1 text-amber-800">{syl.text}</span>
            {#if si < d.syllables.length - 1}<span class="mx-1 text-slate-300">·</span>{/if}
          {/each}
          {#if d.multi}
            <span class="text-slate-400">=</span>
            <span class="rounded-lg bg-amber-400 px-2.5 py-1 text-white">{d.word}</span>
          {/if}
        </div>
      {/if}

      <div class="flex gap-3 pt-2">
        <button
          onclick={runIntro}
          class="flex items-center gap-2 rounded-full bg-amber-100 px-5 py-3 font-bold text-amber-700 active:scale-95"
        >
          🔊 Dengar lagi
        </button>
        <button
          onclick={startPractice}
          class="rounded-2xl bg-amber-500 px-8 py-3 text-lg font-bold text-white active:scale-95"
        >
          Mulai Latihan ▶
        </button>
      </div>
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
          {@const isWon = resolving && chosenId === tile.id && isRight}
          <button
            onclick={() => choose(tile)}
            disabled={asking || resolving || isWrong}
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
  {:else if phase === 'done' && isExam}
    <!-- Final exam result -->
    {#if passed}
      <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div class="animate-pop text-7xl">🏆</div>
        <Robot mood="happy" size={170} />
        <h2 class="text-4xl font-black text-amber-500">Kamu Lulus!</h2>
        <p class="text-xl">Skor: {correct}/{round.length} ({Math.round(score * 100)}%)</p>
        <p class="text-base text-slate-500">
          {nextLevel ? 'Kamu bisa lanjut ke level berikutnya! 🎉' : 'Kamu sudah tamat semua level! 🌟'}
        </p>
        <button
          onclick={goNextLevel}
          class="mt-2 rounded-2xl bg-amber-500 px-8 py-4 text-xl font-black text-white shadow active:scale-95"
        >
          {nextLevel ? 'Level Berikutnya ▶' : 'Selesai 🎉'}
        </button>
      </div>
    {:else}
      <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Robot mood="sad" size={170} />
        <h2 class="text-3xl font-black text-slate-600">Belum Lulus 💪</h2>
        <p class="text-xl">Skor: {correct}/{round.length} ({Math.round(score * 100)}%)</p>
        <p class="text-base text-slate-500">Sayang sekali, belum bisa lanjut ke level berikutnya. Ayo coba lagi!</p>
        <div class="mt-2 flex gap-3">
          <button onclick={() => location.reload()} class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95">Coba Lagi</button>
          <button onclick={() => goto(`${base}/belajar/${levelId}`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Kembali</button>
        </div>
      </div>
    {/if}
  {:else if phase === 'done'}
    <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <Robot {mood} size={190} />
      <h2 class="text-3xl font-black">{passed ? 'Hebat! ⭐' : 'Belum berhasil 💪'}</h2>
      <p class="text-xl">Skor: {correct}/{round.length} ({Math.round(score * 100)}%)</p>
      {#if !passed}
        <p class="text-base text-slate-500">Kamu salah {round.length - correct}. Ayo coba lagi, ya!</p>
      {/if}
      <div class="flex gap-3">
        <button onclick={() => startLesson()} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Ulangi</button>
        {#if passed && hasNextLesson}
          <button onclick={goNextLesson} class="rounded-2xl bg-green-500 px-7 py-4 text-lg font-black text-white shadow active:scale-95">Lanjut ▶</button>
        {:else}
          <button onclick={() => goto(`${base}/belajar/${levelId}`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Selesai</button>
        {/if}
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
