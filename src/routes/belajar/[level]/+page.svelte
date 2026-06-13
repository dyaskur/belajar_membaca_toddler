<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { getLevel, lessonsForLevel } from '$lib/content/levels.js';

  const levelId = $derived(Number($page.params.level));
  const level = $derived(getLevel(levelId));
  const lessons = $derived(lessonsForLevel(levelId));

  onMount(() => {
    if (!profiles.active || !level) goto(`${base}/belajar`);
  });

  /** @param {number} index */
  function open(index) {
    if (profiles.isLessonUnlocked(levelId, index)) goto(`${base}/belajar/${levelId}/${index}`);
  }
</script>

{#if level}
  <header class="mb-6 flex items-center justify-between">
    <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
    <span class="font-bold text-slate-500">Level {levelId} · {level.title}</span>
    <span></span>
  </header>

  <p class="mb-4 text-center text-sm text-slate-500">{level.subtitle}</p>

  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
    {#each lessons as lesson (lesson.index)}
      {@const unlocked = profiles.isLessonUnlocked(levelId, lesson.index)}
      {@const passed = profiles.isLessonPassed(levelId, lesson.index)}
      {#if lesson.exam}
        <button
          disabled={!unlocked}
          onclick={() => open(lesson.index)}
          class="col-span-2 flex items-center gap-4 rounded-3xl p-5 text-left shadow transition active:scale-95 sm:col-span-3
            {unlocked ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400 opacity-70'}"
        >
          <span class="text-4xl">{!unlocked ? '🔒' : passed ? '🏆' : '📝'}</span>
          <span class="flex-1">
            <span class="block text-xl font-black">Ujian Akhir</span>
            <span class="block text-sm opacity-90">Semua {level.title.toLowerCase()} di level ini</span>
          </span>
        </button>
      {:else}
        <button
          disabled={!unlocked}
          onclick={() => open(lesson.index)}
          class="flex flex-col items-center gap-2 rounded-3xl p-4 shadow transition active:scale-95
            {unlocked ? 'bg-white' : 'bg-slate-100 opacity-60'}"
        >
          <span class="text-3xl">{!unlocked ? '🔒' : passed ? '⭐' : '📖'}</span>
          <span class="text-xs font-bold text-slate-400">Pelajaran {lesson.index + 1}</span>
          <span class="text-xl font-black tracking-wide">{lesson.title}</span>
        </button>
      {/if}
    {/each}
  </div>
{/if}
