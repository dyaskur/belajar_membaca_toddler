<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { getLevel, levelLabel } from '$lib/content/levels.js';
  import { LOCKED_LEVEL } from '$lib/content/feedback.js';
  import { player } from '$lib/audio/player.svelte.js';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';
  import AdventureNode from '$lib/components/AdventureNode.svelte';
  import Confetti from '$lib/components/Confetti.svelte';
  import { onDestroy, onMount } from 'svelte';

  const COURSE_ORDER = [1, 2, 4, 5, 7, 3, 8, 9];
  const NODE_ICONS = /** @type {Record<number, string>} */ ({
    1: '🔤', 2: '🅱️', 4: '📦', 5: '🔗', 7: '🧱', 3: '🧩', 8: '🧩', 9: '🏁'
  });
  const BONUS = [
    { href: '/abjad', icon: '🔤', label: 'Abjad', cls: 'bg-indigo-500' },
    { href: '/cocokkan', icon: '🧩', label: 'Cocokkan', cls: 'bg-emerald-500' },
    { href: '/ucapkan', icon: '🎤', label: 'Ucapkan', cls: 'bg-teal-500' },
    { href: '/menulis', icon: '✍️', label: 'Menulis', cls: 'bg-violet-500' },
    { href: '/mesin', icon: '🎰', label: 'Mesin', cls: 'bg-orange-500' }
  ];

  const p = $derived(profiles.active);
  const levels = $derived(Object.fromEntries(COURSE_ORDER.map((id) => [id, getLevel(id)])));
  const derivedRobotNode = $derived(
    [...COURSE_ORDER].reverse().find((id) => profiles.isLevelComplete(id)) ?? 1
  );
  const robotNode = $derived(p?.lastCompletedLevel ?? derivedRobotNode);
  let lockedId = $state(/** @type {number|null} */ (null));
  let celebrateId = $state(/** @type {number|null} */ (null));
  let toast = $state('');
  /** @type {Confetti} */
  let confetti;
  /** @type {ReturnType<typeof setTimeout>[]} */
  let timers = [];
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let toastTimer;

  onMount(() => {
    if (!profiles.active) return goto(`${base}/`);
    const completed = Number(sessionStorage.getItem('klm.justCompletedLevel'));
    sessionStorage.removeItem('klm.justCompletedLevel');
    if (!getLevel(completed) || !profiles.isLevelComplete(completed)) return;
    timers.push(setTimeout(() => {
      celebrateId = completed;
      const el = document.querySelector(`[data-node="${completed}"]`);
      if (el instanceof HTMLElement) {
        const r = el.getBoundingClientRect();
        confetti?.burst(r.left + r.width / 2, r.top + r.height / 2, 48);
      }
      confetti?.fire(65);
    }, 180));
    timers.push(setTimeout(() => (celebrateId = null), 1900));
  });

  onDestroy(() => {
    for (const timer of timers) clearTimeout(timer);
    if (toastTimer) clearTimeout(toastTimer);
    player.stop();
  });

  /** @param {number} id */
  async function open(id) {
    if (profiles.isLevelUnlocked(id)) return goto(`${base}/belajar/${id}`);
    lockedId = id;
    const missing = profiles.missingPrerequisites(id)
      .map((pack) => `${levelLabel(pack)} ${getLevel(pack)?.title ?? ''}`)
      .join(', ');
    toast = `Selesaikan ${missing} dulu`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = '';
      lockedId = null;
    }, 3200);
    const voiceId = p?.voiceId ?? 'ibu-dewi';
    await player.ensureLevel(voiceId, 1);
    player.speak(voiceId, 1, LOCKED_LEVEL);
  }
</script>

<Confetti bind:this={confetti} />

{#if p}
  <header class="mb-3 flex items-center justify-between">
    <a href="{base}/" class="text-2xl" aria-label="Kembali">⬅️</a>
    <div class="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
      <RobotAvatar color={p.avatar} size={32} />
      <span class="text-base font-black">{p.name}</span>
    </div>
    <a href="{base}/orang-tua" class="text-2xl" aria-label="Pengaturan">⚙️</a>
  </header>

  <div class="mb-3 text-center">
    <h1 class="text-2xl font-black text-amber-600">Petualangan Membaca</h1>
    <p class="text-xs font-bold text-slate-400">Ikuti jalurnya, pilih cabangmu!</p>
  </div>

  <div class="adventure-map mx-auto max-w-xl rounded-[2.5rem] bg-gradient-to-b from-sky-50 via-white to-violet-50 px-2 py-7 shadow-inner sm:px-6">
    {#if levels[1]}
      <div class="flex justify-center">
        <AdventureNode
          level={levels[1]} icon={NODE_ICONS[1]} robotColor={p.avatar}
          locked={!profiles.isLevelUnlocked(1)} complete={profiles.isLevelComplete(1)}
          progress={profiles.levelProgress(1)} hasRobot={robotNode === 1}
          celebrating={celebrateId === 1} shaking={lockedId === 1} onclick={() => open(1)}
        />
      </div>
    {/if}

    <div class="path-line h-9"></div>

    {#if levels[2]}
      <div class="flex justify-center">
        <AdventureNode
          level={levels[2]} icon={NODE_ICONS[2]} robotColor={p.avatar}
          locked={!profiles.isLevelUnlocked(2)} complete={profiles.isLevelComplete(2)}
          progress={profiles.levelProgress(2)} hasRobot={robotNode === 2}
          celebrating={celebrateId === 2} shaking={lockedId === 2} onclick={() => open(2)}
        />
      </div>
    {/if}

    <div class="branch-lines" aria-hidden="true">
      <span class="branch-stem"></span><span class="branch-bar"></span>
      <span class="branch-drop left"></span><span class="branch-drop middle"></span><span class="branch-drop right"></span>
    </div>
    <p class="-mt-1 mb-2 text-center text-[0.65rem] font-black uppercase tracking-wider text-sky-500">Pilih mana saja</p>

    <div class="grid grid-cols-3 justify-items-center gap-0">
      {#each [4, 5, 7] as id}
        {#if levels[id]}
          <AdventureNode
            level={levels[id]} icon={NODE_ICONS[id]} robotColor={p.avatar}
            locked={!profiles.isLevelUnlocked(id)} complete={profiles.isLevelComplete(id)}
            progress={profiles.levelProgress(id)} hasRobot={robotNode === id}
            celebrating={celebrateId === id} shaking={lockedId === id} onclick={() => open(id)}
          />
        {/if}
      {/each}
    </div>

    <div class="path-line h-9"></div>

    <div class="final-path mx-auto flex max-w-md items-start justify-between">
      {#each [3, 8, 9] as id, i}
        {#if levels[id]}
          <AdventureNode
            level={levels[id]} icon={NODE_ICONS[id]} robotColor={p.avatar}
            locked={!profiles.isLevelUnlocked(id)} complete={profiles.isLevelComplete(id)}
            progress={profiles.levelProgress(id)} hasRobot={robotNode === id}
            celebrating={celebrateId === id} shaking={lockedId === id} onclick={() => open(id)}
          />
          {#if i < 2}<span class="path-arrow" aria-hidden="true">→</span>{/if}
        {/if}
      {/each}
    </div>
  </div>

  {#if toast}
    <div class="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-800 px-5 py-3 text-center font-bold text-white shadow-xl" role="status">
      {toast}
    </div>
  {/if}

  <section class="mt-5">
    <h2 class="mb-2 text-sm font-black uppercase tracking-wider text-slate-400">Bonus</h2>
    <div class="grid grid-cols-5 gap-2">
      {#each BONUS as item (item.href)}
        <button
          onclick={() => goto(`${base}${item.href}`)}
          class="flex min-w-0 flex-col items-center gap-1 rounded-2xl {item.cls} px-1 py-3 text-white shadow active:scale-95"
        >
          <span class="text-2xl">{item.icon}</span>
          <span class="w-full truncate text-[0.65rem] font-black">{item.label}</span>
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .adventure-map { position: relative; overflow: hidden; }
  .adventure-map::before, .adventure-map::after {
    position: absolute; content: ''; border-radius: 999px; filter: blur(1px); opacity: 0.55;
  }
  .adventure-map::before { top: 24px; left: -28px; width: 100px; height: 46px; background: #dbeafe; }
  .adventure-map::after { right: -30px; bottom: 75px; width: 110px; height: 52px; background: #ede9fe; }
  .path-line { position: relative; z-index: 1; width: 6px; margin: 0 auto; background: repeating-linear-gradient(to bottom, #fbbf24 0 8px, #fde68a 8px 14px); border-radius: 999px; }
  .branch-lines { position: relative; z-index: 1; height: 52px; margin: 0 16.5%; }
  .branch-stem, .branch-bar, .branch-drop { position: absolute; display: block; border-radius: 999px; background: #7dd3fc; }
  .branch-stem { top: 0; left: calc(50% - 3px); width: 6px; height: 25px; }
  .branch-bar { top: 22px; left: 0; width: 100%; height: 6px; }
  .branch-drop { top: 22px; width: 6px; height: 30px; }
  .branch-drop.left { left: 0; } .branch-drop.middle { left: calc(50% - 3px); } .branch-drop.right { right: 0; }
  .final-path { position: relative; z-index: 2; }
  .path-arrow { margin-top: 28px; color: #a78bfa; font-size: 1.7rem; font-weight: 900; }
  @media (max-width: 370px) {
    .path-arrow { margin-inline: -8px; font-size: 1.2rem; }
  }
</style>
