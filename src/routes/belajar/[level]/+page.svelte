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
    if (!profiles.active || !level || !profiles.isLevelUnlocked(levelId)) goto(`${base}/belajar`);
  });

  /** @param {number} index */
  function open(index) {
    if (profiles.isLessonUnlocked(levelId, index)) goto(`${base}/belajar/${levelId}/${index}`);
  }
</script>

{#if level}
  <header class="mb-6 flex items-center justify-between">
    <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
    <span class="font-bold text-slate-500">Level {level.label} · {level.title}</span>
    <span></span>
  </header>

  <p class="mb-4 text-center text-sm text-slate-500">{level.subtitle}</p>

  {@const placement = lessons.find((l) => l.placement)}
  {@const exam = lessons.find((l) => l.exam)}
  {@const regs = lessons.filter((l) => !l.exam && !l.placement)}

  <!-- Placement test (open from the start) -->
  {#if placement}
    {@const passed = profiles.isLessonPassed(levelId, placement.index)}
    <button
      onclick={() => open(placement.index)}
      class="mb-4 flex w-full items-center gap-4 rounded-3xl bg-sky-500 p-4 text-left text-white shadow transition active:scale-[0.99]"
    >
      <span class="text-3xl">{passed ? '🎖️' : '🧭'}</span>
      <span class="flex-1">
        <span class="block text-lg font-black">Tes Penempatan</span>
        <span class="block text-xs opacity-90">Tes semua — pelajaran yang benar dapat ⭐.</span>
      </span>
    </button>
  {/if}

  <!-- Lessons (all open) -->
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
    {#each regs as lesson (lesson.index)}
      {@const passed = profiles.isLessonPassed(levelId, lesson.index)}
      <button
        onclick={() => open(lesson.index)}
        class="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 shadow transition active:scale-95"
      >
        <span class="text-3xl">{passed ? '⭐' : '📖'}</span>
        <span class="text-xs font-bold text-slate-400">Pelajaran {lesson.index + 1}</span>
        <span class="text-xl font-black tracking-wide">{lesson.title}</span>
      </button>
    {/each}
  </div>

  <!-- Final exam (unlocked after all lessons pass) -->
  {#if exam}
    {@const unlocked = profiles.isLessonUnlocked(levelId, exam.index)}
    {@const passed = profiles.isLessonPassed(levelId, exam.index)}
    <button
      disabled={!unlocked}
      onclick={() => open(exam.index)}
      class="mt-4 flex w-full items-center gap-4 rounded-3xl p-5 text-left shadow transition active:scale-[0.99]
        {unlocked ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 opacity-70'}"
    >
      <span class="text-4xl">{!unlocked ? '🔒' : passed ? '🏆' : '📝'}</span>
      <span class="flex-1">
        <span class="block text-xl font-black">Ujian Akhir</span>
        <span class="block text-sm opacity-90">
          {unlocked ? 'Lebih sulit — semua di level ini' : 'Selesaikan semua pelajaran dulu'}
        </span>
      </span>
    </button>
  {/if}
{/if}
