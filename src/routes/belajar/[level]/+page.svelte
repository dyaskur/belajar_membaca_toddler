<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { getLevel, MASTERY } from '$lib/content/levels.js';
  import { buildRound, pick } from '$lib/game/quiz.js';
  import { feedbackForLevel } from '$lib/content/feedback.js';
  import { promptsForLevel } from '$lib/content/prompts.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect, buzzWrong } from '$lib/audio/sfx.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  const levelId = $derived(Number($page.params.level));
  const level = $derived(getLevel(levelId));

  let round = $state(/** @type {ReturnType<typeof buildRound>} */ ([]));
  let idx = $state(0);
  let correct = $state(0);
  let streak = $state(0);
  let answered = $state(false);
  /** @type {string|null} */
  let chosenId = $state(null);
  let done = $state(false);
  /** @type {'idle'|'happy'|'sad'} */
  let mood = $state('idle');
  /** @type {Confetti} */
  let confetti;

  const current = $derived(round[idx]);
  const fb = $derived(feedbackForLevel(levelId));
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const progress = $derived(round.length ? ((idx + (answered ? 1 : 0)) / round.length) * 100 : 0);

  onMount(async () => {
    if (!profiles.active || !level) return goto('/belajar');
    await player.ensureLevel(voiceId, levelId);
    player.prefetchNext(voiceId, levelId);
    round = buildRound(levelId);
    askCurrent();
  });

  const beat = () => new Promise((r) => setTimeout(r, 250));
  let replayN = $state(0);

  async function askCurrent() {
    if (!current) return;
    replayN = 0;
    mood = 'idle';
    // Question = random intro ("Yang mana huruf...") + a short beat + the target.
    await player.speak(voiceId, levelId, pick(promptsForLevel(levelId)));
    await beat();
    if (current) await player.speak(voiceId, levelId, current.target.text, 0);
  }

  function replay() {
    // Dengar lagi: target only, alternating variants (normal -> slower & clearer).
    if (!current) return;
    const count = player.variantCount(voiceId, levelId, current.target.text) || 1;
    replayN = (replayN + 1) % count;
    player.speak(voiceId, levelId, current.target.text, replayN);
  }

  /** @param {import('$lib/content/levels.js').Item} tile */
  async function choose(tile) {
    if (answered || !current) return;
    answered = true;
    chosenId = tile.id;
    const right = tile.id === current.target.id;
    if (right) {
      correct++;
      streak++;
      mood = 'happy';
      confetti?.fire(streak >= 3 ? 44 : 28);
      chimeCorrect();
      await player.speak(voiceId, levelId, pick(fb.correct));
    } else {
      streak = 0;
      mood = 'sad';
      buzzWrong();
      await player.speak(voiceId, levelId, pick(fb.wrong));
      await player.speak(voiceId, levelId, current.target.text, 1); // re-say, slow & clear
    }
    setTimeout(next, 550);
  }

  async function next() {
    answered = false;
    chosenId = null;
    mood = 'idle';
    if (idx + 1 >= round.length) return finish();
    idx++;
    askCurrent();
  }

  async function finish() {
    done = true;
    const s = round.length ? correct / round.length : 0;
    const ok = s >= MASTERY;
    mood = ok ? 'happy' : 'sad';
    profiles.recordResult(levelId, s, ok);
    if (ok) confetti?.fire(60);
    await player.speak(voiceId, levelId, pick(fb.complete));
  }

  const score = $derived(round.length ? correct / round.length : 0);
  const passed = $derived(score >= MASTERY);
</script>

<Confetti bind:this={confetti} />

{#if level}
  <header class="mb-3 flex items-center justify-between">
    <button onclick={() => goto('/belajar')} class="text-2xl" aria-label="Kembali">⬅️</button>
    <span class="font-bold text-slate-500">Level {levelId} · {level.title}</span>
    <span class="text-sm text-slate-400">{Math.min(idx + 1, round.length)}/{round.length}</span>
  </header>

  <!-- progress bar -->
  <div class="mb-6 h-3 w-full overflow-hidden rounded-full bg-slate-200">
    <div class="h-full rounded-full bg-amber-400 transition-all duration-500" style="width:{progress}%"></div>
  </div>

  {#if done}
    <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <Robot {mood} size={190} />
      <h2 class="text-3xl font-black">{passed ? 'Hebat! ⭐' : 'Coba lagi, ya! 💪'}</h2>
      <p class="text-xl">Skor: {correct}/{round.length} ({Math.round(score * 100)}%)</p>
      <div class="flex gap-3">
        <button onclick={() => location.reload()} class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95">Main Lagi</button>
        <button onclick={() => goto('/belajar')} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Selesai</button>
      </div>
    </div>
  {:else if current}
    <div class="relative flex flex-1 flex-col items-center justify-start gap-5">
      <!-- combo badge -->
      {#if streak >= 2}
        <div class="absolute right-0 top-0 animate-pop rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-white shadow">
          🔥 {streak} beruntun!
        </div>
      {/if}

      <Robot {mood} size={150} />

      <button
        onclick={replay}
        class="flex items-center gap-3 rounded-full bg-amber-100 px-6 py-3 active:scale-95"
        aria-label="Dengar lagi"
      >
        <span class="text-3xl">🔊</span>
        <span class="font-bold text-amber-700">Dengar lagi</span>
      </button>

      <div class="grid w-full grid-cols-3 gap-4">
        {#each current.tiles as tile (tile.id)}
          {@const isRight = tile.id === current.target.id}
          {@const isChosen = chosenId === tile.id}
          <button
            onclick={() => choose(tile)}
            disabled={answered}
            class="flex aspect-square items-center justify-center rounded-3xl text-4xl font-black shadow transition active:scale-95 sm:text-5xl
              {answered && isRight ? 'animate-pop bg-green-400 text-white' : ''}
              {answered && isChosen && !isRight ? 'animate-shake bg-red-300 text-white' : ''}
              {!answered || (!isRight && !isChosen) ? 'bg-white' : ''}
              {answered && !isRight && !isChosen ? 'opacity-40' : ''}"
          >
            {tile.display ?? tile.text}
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/if}

<style>
  :global(.animate-pop) { animation: pop 0.4s ease; }
  :global(.animate-shake) { animation: shake 0.4s ease; }
  @keyframes pop {
    0% { transform: scale(1); }
    40% { transform: scale(1.18); }
    100% { transform: scale(1); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.animate-pop), :global(.animate-shake) { animation: none; }
  }
</style>
