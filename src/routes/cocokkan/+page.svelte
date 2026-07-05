<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy, onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { DEFAULT_AVATAR, robotColor } from '$lib/content/avatars.js';
  import { COCOKKAN_WORDS } from '$lib/content/words.js';
  import { feedbackForLevel, SPEAK_TRY } from '$lib/content/feedback.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { buzzWrong, chimeCorrect } from '$lib/audio/sfx.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  const LEVELS = [
    { id: 1, rows: 4, words: 4 },
    { id: 2, rows: 4, words: 6 },
    { id: 3, rows: 5, words: 6 },
    { id: 4, rows: 6, words: 8 }
  ];

  let levelIndex = $state(0);
  let deck = $state(/** @type {import('$lib/content/words.js').PictureWord[]} */ ([]));
  let pictures = $state(/** @type {import('$lib/content/words.js').PictureWord[]} */ ([]));
  let words = $state(/** @type {import('$lib/content/words.js').PictureWord[]} */ ([]));
  let matched = $state(/** @type {Record<string, boolean>} */ ({}));
  let selectedWord = $state(/** @type {string | null} */ (null));
  let finished = $state(false);
  let result = $state(/** @type {'none'|'ok'|'try'} */ ('none'));
  /** @type {'idle'|'happy'|'sad'} */
  let mood = $state('idle');
  let drag = $state(
    /** @type {{ word: import('$lib/content/words.js').PictureWord, pointerId: number, startX: number, startY: number, x: number, y: number, moved: boolean } | null} */ (
      null
    )
  );
  /** @type {Confetti} */
  let confetti;
  let moodTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  let finishTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  let speechToken = 0;

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar ?? DEFAULT_AVATAR));
  const fb = $derived(feedbackForLevel(1));
  const done = $derived(deck.filter((item) => matched[item.w]).length);
  const levelNumber = $derived(levelIndex + 1);
  const isLastLevel = $derived(levelIndex >= LEVELS.length - 1);

  /**
   * @template T
   * @param {T[]} a
   * @returns {T[]}
   */
  function shuffle(a) {
    const copy = [...a];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  onMount(async () => {
    if (!profiles.active) return goto(`${base}/belajar`);
    startBoard(0);
    await Promise.allSettled([player.ensureLevel(voiceId, 'words'), player.ensureLevel(voiceId, 1)]);
  });

  onDestroy(() => {
    player.stop();
    clearTimeout(moodTimer);
    clearTimeout(finishTimer);
  });

  /** @param {import('$lib/content/words.js').PictureWord} word */
  function speakWord(word) {
    speechToken += 1;
    player.speak(voiceId, 'words', word.w).catch(() => {});
  }

  /** @param {import('$lib/content/words.js').PictureWord} word */
  async function speakCorrectMatch(word) {
    const token = ++speechToken;
    await player.speak(voiceId, 1, pick(fb.correct));
    if (token !== speechToken) return false;
    await player.speak(voiceId, 'words', word.w);
    return token === speechToken;
  }

  /** @param {number} nextLevelIndex */
  function startBoard(nextLevelIndex) {
    levelIndex = Math.min(Math.max(nextLevelIndex, 0), LEVELS.length - 1);
    const level = LEVELS[levelIndex];
    const targets = shuffle(COCOKKAN_WORDS).slice(0, level.rows);
    const decoyCount = Math.max(0, level.words - level.rows);
    deck = targets;
    pictures = shuffle(targets);
    words = shuffle(decoyCount ? [...targets, ...decoysFor(targets, decoyCount)] : targets);
    matched = {};
    selectedWord = null;
    finished = false;
    result = 'none';
    mood = 'idle';
    drag = null;
    speechToken += 1;
    clearTimeout(moodTimer);
    clearTimeout(finishTimer);
  }

  /**
   * @param {import('$lib/content/words.js').PictureWord[]} targets
   * @param {number} count
   */
  function decoysFor(targets, count) {
    const targetWords = new Set(targets.map((item) => item.w));
    const firstLetters = new Set(targets.map((item) => item.w[0]));
    const kinds = new Set(targets.map((item) => item.kind));
    const candidates = COCOKKAN_WORDS.filter((item) => !targetWords.has(item.w));
    const close = candidates.filter((item) => firstLetters.has(item.w[0]) || kinds.has(item.kind));
    const pool = close.length >= count ? close : candidates;
    return shuffle(pool).slice(0, count);
  }

  /** @param {import('$lib/content/words.js').PictureWord} word */
  function selectWord(word) {
    if (matched[word.w]) return;
    selectedWord = word.w;
    result = 'none';
    mood = 'idle';
    if (levelIndex === 0) speakWord(word);
  }

  /** @param {import('$lib/content/words.js').PictureWord} target */
  function targetClick(target) {
    if (!selectedWord || matched[target.w]) return;
    const word = words.find((item) => item.w === selectedWord);
    if (word) tryMatch(word, target);
  }

  /**
   * @param {import('$lib/content/words.js').PictureWord} word
   * @param {import('$lib/content/words.js').PictureWord} target
   */
  function tryMatch(word, target) {
    selectedWord = null;
    if (matched[word.w]) return;
    if (word.w !== target.w) {
      wrong();
      return;
    }

    const nextMatched = { ...matched, [word.w]: true };
    matched = nextMatched;
    result = 'ok';
    mood = 'happy';
    confetti?.fire(24);
    chimeCorrect();
    const spoken = speakCorrectMatch(word).catch(() => false);

    if (Object.keys(nextMatched).length >= deck.length) {
      clearTimeout(finishTimer);
      const levelAtMatch = levelIndex;
      const queueFinish = () => {
        if (levelIndex === levelAtMatch && Object.keys(matched).length >= deck.length && !finished) {
          clearTimeout(finishTimer);
          finishTimer = setTimeout(finish, 200);
        }
      };
      spoken.then(queueFinish);
      finishTimer = setTimeout(queueFinish, 2600);
    }
  }

  function wrong() {
    result = 'try';
    mood = 'sad';
    buzzWrong();
    speechToken += 1;
    player.speak(voiceId, 'words', pick(SPEAK_TRY)).catch(() => {});
    clearTimeout(moodTimer);
    moodTimer = setTimeout(() => {
      if (result === 'try') mood = 'idle';
    }, 900);
  }

  function finish() {
    finished = true;
    result = 'none';
    mood = 'happy';
    confetti?.fire(70);
    chimeCorrect();
    speechToken += 1;
    player.speak(voiceId, 1, pick(fb.complete)).catch(() => {});
  }

  function nextLevel() {
    if (isLastLevel) {
      startBoard(0);
      return;
    }
    startBoard(levelIndex + 1);
  }

  function targetSizeClass() {
    if (deck.length >= 6) return 'h-16 p-2';
    return deck.length >= 5 ? 'h-20 p-2' : 'h-24 p-3';
  }

  function pictureIconClass() {
    if (deck.length >= 6) return 'h-12 w-12 text-2xl';
    return deck.length >= 5 ? 'h-14 w-14 text-3xl' : 'h-16 w-16 text-4xl';
  }

  function wordSizeClass() {
    if (words.length >= 8) return 'h-12 text-base';
    if (words.length > deck.length) return 'h-16 text-xl';
    return 'h-24 text-2xl';
  }

  /**
   * @param {PointerEvent} event
   * @param {import('$lib/content/words.js').PictureWord} word
   */
  function wordPointerDown(event, word) {
    if (matched[word.w]) return;
    selectWord(word);
    /** @type {HTMLElement} */ (event.currentTarget).setPointerCapture(event.pointerId);
    drag = { word, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: 0, y: 0, moved: false };
  }

  /** @param {PointerEvent} event */
  function wordPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const x = event.clientX - drag.startX;
    const y = event.clientY - drag.startY;
    drag = { ...drag, x, y, moved: drag.moved || Math.hypot(x, y) > 8 };
  }

  /** @param {PointerEvent} event */
  function wordPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const droppedWord = drag.word;
    const droppedOn = drag.moved ? targetWordAt(event.clientX, event.clientY) : null;
    drag = null;
    if (!droppedOn) return;
    const target = deck.find((item) => item.w === droppedOn);
    if (target) tryMatch(droppedWord, target);
  }

  /** @param {PointerEvent} event */
  function wordPointerCancel(event) {
    if (drag?.pointerId === event.pointerId) drag = null;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {string | null}
   */
  function targetWordAt(x, y) {
    const el = document.elementsFromPoint(x, y).find((node) => node.closest('[data-target-word]'))?.closest('[data-target-word]');
    return /** @type {HTMLElement | null} */ (el)?.dataset.targetWord ?? null;
  }
</script>

<Confetti bind:this={confetti} />

<header class="mb-3 flex items-center justify-between">
  <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
  <span class="font-bold text-slate-500">🧩 Cocokkan · Level {levelNumber}/{LEVELS.length}</span>
  <span class="text-sm text-slate-400">{done}/{deck.length || LEVELS[0].rows}</span>
</header>

{#if finished}
  <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
    <Robot mood="happy" size={180} head={rc.head} body={rc.body} />
    <h2 class="text-3xl font-black">{isLastLevel ? 'Hebat! 🌟' : `Level ${levelNumber} selesai!`}</h2>
    <p class="text-xl">Kamu cocokkan {done} kata!</p>
    <div class="flex gap-3">
      <button onclick={nextLevel} class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95">
        {isLastLevel ? 'Lagi' : `Lanjut Level ${levelNumber + 1}`}
      </button>
      <button onclick={() => goto(`${base}/belajar`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Selesai</button>
    </div>
  </div>
{:else if deck.length}
  <div class="flex flex-1 flex-col gap-3">
    <div class="flex items-center justify-center">
      <Robot {mood} size={86} head={rc.head} body={rc.body} />
    </div>

    <div class="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black shadow">
      <span class="text-amber-600">Level {levelNumber}/{LEVELS.length}</span>
      <span class="text-slate-400">{deck.length} gambar · {words.length} kata</span>
    </div>

    <div class="grid grid-cols-2 gap-3 text-center text-sm font-black text-slate-400">
      <div>Gambar</div>
      <div>Kata</div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="grid gap-3">
        {#each pictures as picture (picture.w)}
          {@const isMatched = matched[picture.w]}
          <button
            type="button"
            data-target-word={picture.w}
            onclick={() => targetClick(picture)}
            class="flex items-center gap-3 rounded-3xl border-4 text-left shadow active:scale-[0.98] {targetSizeClass()} {isMatched
              ? 'border-green-300 bg-green-50'
              : selectedWord
                ? 'border-amber-300 bg-white'
                : 'border-white bg-white'}"
            aria-label={`gambar ${picture.w}`}
          >
            <span class="grid shrink-0 place-items-center rounded-2xl bg-slate-50 {pictureIconClass()}" aria-hidden="true">{picture.e}</span>
            <span class="min-w-0 flex-1">
              {#if isMatched}
                <span class="block truncate text-xl font-black text-green-600">{picture.w}</span>
              {:else}
                <span class="block text-2xl font-black text-slate-200">?</span>
              {/if}
            </span>
          </button>
        {/each}
      </div>

      <div class="grid gap-3">
        {#each words as word (word.w)}
          {@const isMatched = matched[word.w]}
          {@const isSelected = selectedWord === word.w}
          {@const isDragging = drag?.word.w === word.w}
          <button
            type="button"
            disabled={isMatched}
            onpointerdown={(event) => wordPointerDown(event, word)}
            onpointermove={wordPointerMove}
            onpointerup={wordPointerUp}
            onpointercancel={wordPointerCancel}
            onlostpointercapture={wordPointerCancel}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectWord(word);
              }
            }}
            aria-pressed={isSelected}
            class="touch-none rounded-3xl border-4 px-2 text-center font-black shadow active:scale-[0.98] {isDragging
              ? ''
              : 'transition-transform duration-200'} {wordSizeClass()} {isMatched
              ? 'border-slate-100 bg-slate-100 text-green-500'
              : isSelected
                ? 'z-20 border-amber-400 bg-amber-50 text-slate-900'
                : 'border-white bg-white text-slate-900'} {isDragging ? 'relative z-30 shadow-xl' : ''}"
            style={isDragging && drag ? `transform: translate(${drag.x}px, ${drag.y}px);` : ''}
          >
            {isMatched ? '✓' : word.w}
          </button>
        {/each}
      </div>
    </div>

    {#if result === 'ok'}
      <div class="min-h-7 text-center text-lg font-black text-green-500">✅ Betul!</div>
    {:else if result === 'try'}
      <div class="min-h-7 text-center text-lg font-black text-orange-500">Coba lagi, ya!</div>
    {:else}
      <div class="min-h-7"></div>
    {/if}
  </div>
{/if}
