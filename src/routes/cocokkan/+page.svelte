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

  const PAIRS = 4;

  let deck = $state(/** @type {import('$lib/content/words.js').PictureWord[]} */ ([]));
  let pictures = $state(/** @type {import('$lib/content/words.js').PictureWord[]} */ ([]));
  let words = $state(/** @type {import('$lib/content/words.js').PictureWord[]} */ ([]));
  let matched = $state(/** @type {Record<string, boolean>} */ ({}));
  let selectedWord = $state(/** @type {string | null} */ (null));
  let draggingWord = $state(/** @type {string | null} */ (null));
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

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar ?? DEFAULT_AVATAR));
  const fb = $derived(feedbackForLevel(1));
  const done = $derived(deck.filter((item) => matched[item.w]).length);

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
    deck = shuffle(COCOKKAN_WORDS).slice(0, PAIRS);
    pictures = shuffle(deck);
    words = shuffle(deck);
    await Promise.allSettled([player.ensureLevel(voiceId, 'words'), player.ensureLevel(voiceId, 1)]);
  });

  onDestroy(() => {
    player.stop();
    clearTimeout(moodTimer);
    clearTimeout(finishTimer);
  });

  /** @param {import('$lib/content/words.js').PictureWord} word */
  function speakWord(word) {
    player.speak(voiceId, 'words', word.w).catch(() => {});
  }

  /** @param {import('$lib/content/words.js').PictureWord} word */
  function selectWord(word) {
    if (matched[word.w]) return;
    selectedWord = word.w;
    result = 'none';
    mood = 'idle';
    speakWord(word);
  }

  /** @param {import('$lib/content/words.js').PictureWord} target */
  function targetClick(target) {
    if (!selectedWord || matched[target.w]) return;
    const word = deck.find((item) => item.w === selectedWord);
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
    player.speak(voiceId, 1, pick(fb.correct)).catch(() => {});

    if (Object.keys(nextMatched).length >= deck.length) {
      clearTimeout(finishTimer);
      finishTimer = setTimeout(finish, 700);
    }
  }

  function wrong() {
    result = 'try';
    mood = 'sad';
    buzzWrong();
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
    player.speak(voiceId, 'words', `Hebat! Kamu cocokkan ${deck.length} kata!`).catch(() => {});
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
   * @param {DragEvent} event
   * @param {import('$lib/content/words.js').PictureWord} word
   */
  function wordDragStart(event, word) {
    if (matched[word.w]) return;
    draggingWord = word.w;
    selectWord(word);
    event.dataTransfer?.setData('text/plain', word.w);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  /** @param {DragEvent} event */
  function wordDragEnd(event) {
    draggingWord = null;
    if (event.dataTransfer?.dropEffect !== 'move') drag = null;
  }

  /**
   * @param {DragEvent} event
   * @param {import('$lib/content/words.js').PictureWord} target
   */
  function targetDrop(event, target) {
    event.preventDefault();
    const wordId = event.dataTransfer?.getData('text/plain') || draggingWord;
    draggingWord = null;
    const word = deck.find((item) => item.w === wordId);
    if (word) tryMatch(word, target);
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
  <span class="font-bold text-slate-500">🧩 Cocokkan</span>
  <span class="text-sm text-slate-400">{done}/{deck.length || PAIRS}</span>
</header>

{#if finished}
  <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
    <Robot mood="happy" size={180} head={rc.head} body={rc.body} />
    <h2 class="text-3xl font-black">Hebat! 🌟</h2>
    <p class="text-xl">Kamu cocokkan {done} kata!</p>
    <div class="flex gap-3">
      <button onclick={() => location.reload()} class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95">Lagi</button>
      <button onclick={() => goto(`${base}/belajar`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Selesai</button>
    </div>
  </div>
{:else if deck.length}
  <div class="flex flex-1 flex-col gap-3">
    <div class="flex items-center justify-center">
      <Robot {mood} size={86} head={rc.head} body={rc.body} />
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
            ondragover={(event) => event.preventDefault()}
            ondrop={(event) => targetDrop(event, picture)}
            class="flex h-24 items-center gap-3 rounded-3xl border-4 p-3 text-left shadow active:scale-[0.98] {isMatched
              ? 'border-green-300 bg-green-50'
              : selectedWord
                ? 'border-amber-300 bg-white'
                : 'border-white bg-white'}"
            aria-label={`gambar ${picture.w}`}
          >
            <span class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-50 text-4xl" aria-hidden="true">{picture.e}</span>
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
            draggable={!isMatched}
            onpointerdown={(event) => wordPointerDown(event, word)}
            onpointermove={wordPointerMove}
            onpointerup={wordPointerUp}
            onpointercancel={wordPointerCancel}
            ondragstart={(event) => wordDragStart(event, word)}
            ondragend={wordDragEnd}
            aria-pressed={isSelected}
            class="touch-none h-24 rounded-3xl border-4 px-2 text-center text-2xl font-black shadow active:scale-[0.98] {isMatched
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
