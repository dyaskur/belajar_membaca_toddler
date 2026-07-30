<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy, onMount, tick } from 'svelte';
  import { player } from '$lib/audio/player.svelte.js';
  import { LOCKED_LEVEL } from '$lib/content/feedback.js';
  import { LEVELS, getLevel, regularLessons } from '$lib/content/levels.js';
  import { STICKER_TOTAL } from '$lib/content/stickers.js';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';

  onMount(() => {
    if (!profiles.active) goto(`${base}/`);
  });

  const p = $derived(profiles.active);

  // ── Map geometry ─────────────────────────────────────────────────────────
  // Coordinates are authored against a 430px-wide phone. Every horizontal
  // position renders as a percentage of that, so the trail keeps its shape
  // from 320px up to the 430px cap while the vertical rhythm stays exact —
  // which is what keeps the nodes sitting on the curve.
  const MAP_W = 430;

  /** Trail stops in LEVELS order. A new pack needs a stop here and an ART entry. */
  const STOPS = [
    { x: 215, y: 92 },
    { x: 110, y: 250 },
    { x: 310, y: 375 },
    { x: 120, y: 500 },
    { x: 305, y: 625 },
    { x: 246, y: 790 },
    { x: 95, y: 915 },
    { x: 300, y: 1040 }
  ];
  const FINISH = { x: 135, y: 1168 };
  const MAP_H = FINISH.y + 70;

  /** Vertical pull on each spline handle — how much the trail swings. */
  const BEND = 64;

  /** Smooth curve threaded through every stop, generated so it can never drift
   *  out of sync with the node positions above. */
  const TRAIL = (() => {
    const pts = [...STOPS.slice(0, LEVELS.length), FINISH];
    let d = `M${pts[0].x},${pts[0].y}`;
    d += ` C${pts[0].x},${pts[0].y + BEND} ${pts[1].x},${pts[1].y - BEND} ${pts[1].x},${pts[1].y}`;
    for (let i = 2; i < pts.length; i++) d += ` S${pts[i].x},${pts[i].y - BEND} ${pts[i].x},${pts[i].y}`;
    return d;
  })();

  /** Kid-facing art per pack: the trail caption has to fit a 132px node, so it
   *  carries a short name; the full title/subtitle live in the sheet. */
  const ART = /** @type {Record<number, { icon: string, short: string, hint: string }>} */ ({
    1: { icon: '🔠', short: 'Huruf', hint: 'Mengenal A–Z' },
    2: { icon: '🎵', short: 'Terbuka', hint: 'ba, bi, bu' },
    4: { icon: '🚪', short: 'Tertutup', hint: 'an, bak, tas' },
    5: { icon: '🔗', short: 'Gabungan', hint: 'ng, ny, diftong' },
    7: { icon: '🚂', short: 'Konsonan', hint: 'pra, tri, blo' },
    3: { icon: '🧩', short: 'Susun Kata', hint: 'suku terbuka' },
    8: { icon: '🏗️', short: 'Lanjut', hint: 'pola gabungan' },
    9: { icon: '📜', short: 'Panjang', hint: '7–12 huruf' }
  });

  /** Stage flags, hand-placed in the gaps the curve leaves free — offsets allow
   *  for the current stop being drawn a size up (see `size` below). */
  const BANNERS = [
    { stage: 1, x: 215, y: 0 },
    { stage: 2, x: 285, y: 208 },
    { stage: 3, x: 150, y: 700 }
  ];

  /** Pure decoration — faceless scenery only (see AGENTS.md). */
  const SCENERY = [
    { emoji: '☁️', x: 24, y: 40, size: 30, dim: 0.5, drift: 7 },
    { emoji: '☁️', x: 382, y: 300, size: 26, dim: 0.45, drift: 9 },
    { emoji: '🌳', x: 34, y: 405, size: 30 },
    { emoji: '🌲', x: 34, y: 620, size: 28 },
    { emoji: '🌷', x: 372, y: 830, size: 28 },
    { emoji: '🍄', x: 190, y: 990, size: 26 }
  ];

  const GAMES = [
    { href: '/cocokkan', icon: '🧩', title: 'Cocokkan', desc: 'Geser kata ke gambar', color: '#10B981', shade: '#0a8b60' },
    { href: '/ucapkan', icon: '🎤', title: 'Ucapkan!', desc: 'Baca dengan suara', color: '#14B8A6', shade: '#0d8b7d' },
    { href: '/menulis', icon: '✍️', title: 'Belajar Menulis', desc: 'Tiru, susun, ketik', color: '#8B5CF6', shade: '#6b3fd1', wide: true }
  ];

  /** @param {number} x */
  const pct = (x) => `${(x / MAP_W) * 100}%`;

  // ── Trail state ──────────────────────────────────────────────────────────

  const stops = $derived(
    LEVELS.map((lvl, i) => ({
      lvl,
      ...(STOPS[i] ?? FINISH),
      ...ART[lvl.id],
      unlocked: profiles.isLevelUnlocked(lvl.id),
      done: profiles.isLevelComplete(lvl.id)
    }))
  );

  /** The one pack to nudge the child toward: first open, unfinished stop. */
  const currentId = $derived(stops.find((s) => s.unlocked && !s.done)?.lvl.id ?? null);
  const allDone = $derived(stops.every((s) => s.done));

  /** @param {1|2|3} stage */
  function bannerTone(stage) {
    const packs = LEVELS.filter((l) => l.stage === stage);
    if (packs.every((l) => profiles.isLevelComplete(l.id))) return 'done';
    if (packs.some((l) => profiles.isLevelUnlocked(l.id))) return 'open';
    return 'locked';
  }

  const BANNER_STYLE = {
    open: 'background:#FFE2B0; color:#B26B00; box-shadow:0 3px 0 #ecc684;',
    done: 'background:#CDEFDD; color:#12805A; box-shadow:0 3px 0 #a9dfc6;',
    locked: 'background:#E4EAF6; color:#6a7796; box-shadow:0 3px 0 #ccd6e8;'
  };

  // ── Detail sheet ─────────────────────────────────────────────────────────
  // Tapping a stop opens a card instead of navigating straight in: it names the
  // pack, shows how far the child got, and is the only place a locked pack can
  // explain what still has to be finished.

  /** @type {number | 'abjad' | null} */
  let sheetId = $state(null);
  /** @type {HTMLElement | undefined} */
  let ctaEl = $state();
  /** @type {HTMLElement | null} */
  let returnFocusTo = null;

  const sheet = $derived.by(() => {
    if (sheetId === null) return null;
    if (sheetId === 'abjad') {
      return {
        icon: '🔤',
        title: 'Abjad A–Z',
        desc: 'Dengar dan kenali semua huruf',
        stars: 3,
        note: 'Bebas dijelajah — tanpa nilai',
        cta: '▶ Ayo Dengar',
        tint: '#6C5CF0',
        href: `${base}/abjad`
      };
    }
    const lvl = getLevel(sheetId);
    if (!lvl) return null;
    const art = ART[lvl.id];
    if (!profiles.isLevelUnlocked(lvl.id)) {
      const missing = profiles
        .missingPrerequisites(lvl.id)
        .map((id) => `${getLevel(id)?.label.toUpperCase() ?? id} ${getLevel(id)?.title ?? ''}`.trim())
        .join(', ');
      return {
        icon: art.icon,
        title: `${lvl.label.toUpperCase()} · ${lvl.title}`,
        desc: lvl.subtitle,
        stars: 0,
        note: missing ? `Selesaikan ${missing} dulu` : 'Selesaikan pos sebelumnya dulu',
        cta: '🔒 Masih Terkunci',
        tint: '#B6BCC9',
        href: null
      };
    }
    const regs = regularLessons(lvl.id);
    const passed = regs.filter((l) => profiles.isLessonPassed(lvl.id, l.index)).length;
    const done = profiles.isLevelComplete(lvl.id);
    return {
      icon: art.icon,
      title: `${lvl.label.toUpperCase()} · ${lvl.title}`,
      desc: lvl.subtitle,
      stars: done ? 3 : Math.min(3, Math.round(profiles.levelProgress(lvl.id) * 3)),
      note: done ? 'Selesai! Kamu hebat!' : `${passed}/${regs.length} pelajaran selesai`,
      cta: done ? '▶ Main Lagi' : passed > 0 ? '▶ Lanjut Main' : '▶ Mulai Main',
      tint: '#F58220',
      href: `${base}/belajar/${lvl.id}`
    };
  });

  /** @param {number | 'abjad'} id */
  async function openSheet(id) {
    returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetId = id;
    await tick();
    ctaEl?.focus();
    if (typeof id === 'number' && !profiles.isLevelUnlocked(id)) {
      const voiceId = p?.voiceId ?? 'ibu-dewi';
      await player.ensureLevel(voiceId, 1);
      player.speak(voiceId, 1, LOCKED_LEVEL);
    }
  }

  async function closeSheet() {
    if (sheetId === null) return;
    sheetId = null;
    player.stop();
    await tick();
    returnFocusTo?.focus();
    returnFocusTo = null;
  }

  /** @param {KeyboardEvent} event */
  function onSheetKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSheet();
      return;
    }
    // The sheet holds exactly one focusable (its action), so trapping is just
    // "keep it there" — Tab must not walk off into the page underneath.
    if (event.key === 'Tab') {
      event.preventDefault();
      ctaEl?.focus();
    }
  }

  /** Jump the child back to where they left off. */
  function resume() {
    if (currentId === null) return;
    document.querySelector(`[data-stop="${currentId}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    openSheet(currentId);
  }

  onDestroy(() => player.stop());
</script>

{#if p}
  <div class="mx-auto w-full max-w-[430px] pb-24 md:max-w-none">
    <header
      class="sticky top-0 z-30 -mx-4 flex items-center gap-2.5 bg-gradient-to-b from-amber-50 from-[72%] to-transparent px-4 pb-4 pt-1"
    >
      <a
        href="{base}/"
        aria-label="Kembali"
        class="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[#DCE9F7] text-xl shadow-[0_4px_0_#b8cfe8] transition active:translate-y-[3px] active:shadow-[0_1px_0_#b8cfe8]"
        >⬅️</a
      >
      <div class="flex flex-1 items-center justify-center gap-2 overflow-hidden">
        <RobotAvatar color={p.avatar} size={26} />
        <span class="truncate text-xl font-black text-[#2c3550]">{p.name}</span>
      </div>
      <a
        href="{base}/stiker"
        aria-label="Buku Stiker"
        class="relative flex flex-none items-center gap-1.5 rounded-full bg-[#FFEBB8] px-3 py-2 text-[15px] font-black text-[#B26B00] shadow-[0_3px_0_#e8ce88] transition active:translate-y-[3px] active:shadow-[0_0px_0_#e8ce88]"
      >
        📒 {profiles.stickers.length}/{STICKER_TOTAL}
        {#if profiles.newStickerCount > 0}
          <span
            class="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white"
            >{profiles.newStickerCount}</span
          >
        {/if}
      </a>
      <a href="{base}/orang-tua" aria-label="Pengaturan Orang Tua" class="gear flex-none text-2xl">⚙️</a>
    </header>

    <div class="-mt-1.5 pb-6 text-center">
      <h1 class="text-[27px] font-black tracking-[0.2px] text-[#F58220]">Jalur Petualangan</h1>
      <p class="mt-0.5 text-[13px] font-bold text-[#9a8f78]">Ikuti jalannya, kumpulkan bintang!</p>
    </div>

    <!-- From md up the trail and the playground sit side by side rather than
         stacking, so a wide screen stops spending a third of its width on margin. -->
    <div class="md:flex md:items-start md:gap-6">
      <div class="w-full md:w-[430px] md:flex-none">
        <!-- Warm-up: the free-explore alphabet reference, off the scored trail. -->
        <div class="relative flex flex-col items-center">
          <span
            class="whitespace-nowrap rounded-full bg-[#E0DCFB] px-4 py-1.5 text-xs font-black tracking-[1.5px] text-[#4B3FC7] shadow-[0_3px_0_#c7c0f3]"
            >🌟 PEMANASAN</span
          >
          <button
            onclick={() => openSheet('abjad')}
            class="mt-3.5 w-[132px] cursor-pointer text-center transition active:translate-y-1"
          >
            <span
              class="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#6C5CF0] text-[42px] shadow-[0_9px_0_#4433c4,inset_0_-6px_0_rgba(0,0,0,0.08)]"
              >🔤</span
            >
            <span class="mt-3 block whitespace-nowrap text-base font-black text-[#37405c]">Abjad A–Z</span>
            <span class="block whitespace-nowrap text-[11px] font-bold text-[#9a8f78]">Dengar semua huruf</span>
          </button>
          <svg viewBox="0 0 40 46" width="40" height="46" class="mt-0.5" aria-hidden="true">
            <path d="M20,2 L20,44" fill="none" stroke="#EADFC0" stroke-width="26" stroke-linecap="round" />
            <path
              d="M20,2 L20,44"
              fill="none"
              stroke="#FFFDF4"
              stroke-width="9"
              stroke-linecap="round"
              stroke-dasharray="2 20"
            />
          </svg>
        </div>

        <!-- The scored trail. -->
        <div class="relative w-full" style="height:{MAP_H}px">
          {#each SCENERY as s, i (i)}
            <span
              class="pointer-events-none absolute"
              class:drift={s.drift}
              style="left:{pct(s.x)}; top:{s.y}px; font-size:{s.size}px; opacity:{s.dim ??
                1}; animation-duration:{s.drift ?? 0}s"
              aria-hidden="true">{s.emoji}</span
            >
          {/each}

          <svg
            viewBox="0 0 {MAP_W} {FINISH.y + 12}"
            preserveAspectRatio="none"
            class="absolute left-0 top-0 w-full"
            style="height:{FINISH.y + 12}px"
            aria-hidden="true"
          >
            <path
              d={TRAIL}
              fill="none"
              stroke="#EADFC0"
              stroke-width="30"
              stroke-linecap="round"
              vector-effect="non-scaling-stroke"
            />
            <path
              d={TRAIL}
              fill="none"
              stroke="#FFFDF4"
              stroke-width="9"
              stroke-linecap="round"
              stroke-dasharray="2 20"
              vector-effect="non-scaling-stroke"
            />
          </svg>

          {#each BANNERS as b (b.stage)}
            <span
              class="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-black tracking-[1.5px]"
              style="left:{pct(b.x)}; top:{b.y}px; {BANNER_STYLE[
                /** @type {'open'|'done'|'locked'} */ (bannerTone(/** @type {1|2|3} */ (b.stage)))
              ]}">🚩 LEVEL {b.stage}</span
            >
          {/each}

          {#each stops as s (s.lvl.id)}
            {@const current = s.lvl.id === currentId}
            {@const size = current ? 108 : 92}
            <button
              data-stop={s.lvl.id}
              onclick={() => openSheet(s.lvl.id)}
              aria-label="{s.lvl.label.toUpperCase()} {s.lvl.title}{s.done
                ? ' — selesai'
                : s.unlocked
                  ? ''
                  : ' — terkunci'}"
              class="absolute w-[132px] cursor-pointer text-center transition active:translate-y-1"
              style="left:{pct(s.x)}; top:{s.y}px; margin-left:-66px; margin-top:-{size / 2}px"
            >
              <span class="relative mx-auto grid place-items-center" style="width:{size}px; height:{size}px">
                {#if current}
                  <span
                    class="pulse pointer-events-none absolute -inset-1 rounded-full border-[5px] border-[#F58220]"
                  ></span>
                {/if}
                <span
                  class="grid h-full w-full place-items-center rounded-full"
                  class:grayscale={!s.unlocked}
                  style="font-size:{current ? 46 : 38}px; {s.done
                    ? 'background:#34C77B; box-shadow:0 9px 0 #1F9E5C, inset 0 -6px 0 rgba(0,0,0,.06);'
                    : s.unlocked
                      ? 'background:#FFA53D; box-shadow:0 9px 0 #D96C00, inset 0 -6px 0 rgba(0,0,0,.06);'
                      : 'background:#E6EAF2; box-shadow:0 8px 0 #c8cfdd; opacity:.9;'}">{s.icon}</span
                >
                {#if !s.unlocked}
                  <span
                    class="absolute -bottom-1 -right-1 grid h-[30px] w-[30px] place-items-center rounded-full bg-white text-[15px] shadow-[0_3px_0_#cfd6e3]"
                    >🔒</span
                  >
                {:else if s.done}
                  <span
                    class="absolute -bottom-1 -right-1 grid h-[30px] w-[30px] place-items-center rounded-full bg-white text-[15px] shadow-[0_3px_0_#e8ce88]"
                    >⭐</span
                  >
                {/if}
              </span>
              <span
                class="mt-3 block whitespace-nowrap font-black {current ? 'text-[17px]' : 'text-[15px]'} {s.unlocked
                  ? 'text-[#37405c]'
                  : 'text-[#8b93a8]'}">{s.lvl.label.toUpperCase()} · {s.short}</span
              >
              <span
                class="block whitespace-nowrap text-[11px] font-bold {s.unlocked
                  ? 'text-[#9a8f78]'
                  : 'text-[#a9a294]'}">{s.hint}</span
              >
            </button>
          {/each}

          <span
            class="absolute grid h-[92px] w-[92px] place-items-center rounded-full text-[42px]"
            class:bob={allDone}
            style="left:{pct(FINISH.x)}; top:{FINISH.y}px; margin-left:-46px; margin-top:-46px; {allDone
              ? 'background:#FFD35C; box-shadow:0 8px 0 #d8a417;'
              : 'background:#FFEBB8; box-shadow:0 8px 0 #e8ce88;'}"
            aria-hidden="true">🏆</span
          >
        </div>
      </div>

      <!-- Taman Bermain: the always-open side games, off the scored trail.
           Beside the trail from md up rather than below it. -->
      <section class="mt-8 overflow-hidden rounded-[30px] bg-[#F4ECD8] pb-6 md:mt-0 md:min-w-0 md:flex-1">
        <div
          class="h-[26px]"
          style="background:repeating-linear-gradient(90deg, #F58220 0 22px, #FFF3D6 22px 44px)"
          aria-hidden="true"
        ></div>
        <div class="flex items-center gap-2.5 px-[18px] pb-1 pt-4">
          <span class="text-[26px]" aria-hidden="true">🎪</span>
          <span class="flex flex-col">
            <h2 class="text-[21px] font-black text-[#37405c]">Taman Bermain</h2>
            <span class="text-xs font-bold text-[#9a8f78]">Semua terbuka — main sepuasnya!</span>
          </span>
        </div>

        <!-- Two up in the stacked layout; one up once the panel is a narrow
             sidebar, where two columns would squeeze every label into wraps. -->
        <div class="grid grid-cols-2 gap-3 px-[18px] pt-3.5 md:grid-cols-1">
          {#each GAMES as g (g.href)}
            <a
              href="{base}{g.href}"
              class="flex flex-col overflow-hidden rounded-3xl bg-[#FFFDF4] transition active:translate-y-1 {g.wide
                ? 'col-span-2 md:col-span-1'
                : ''}"
              style="box-shadow:0 6px 0 {g.shade}"
            >
              <span
                class="h-[22px]"
                style="background:repeating-linear-gradient(90deg, {g.color} 0 14px, #FFFDF4 14px 28px)"
                aria-hidden="true"
              ></span>
              <span class="flex flex-1 flex-col items-center gap-1 px-3 pb-3.5 pt-3 text-center">
                <span
                  class="grid h-[52px] w-[52px] place-items-center rounded-full text-[28px]"
                  style="background:{g.color}22">{g.icon}</span
                >
                <span class="mt-1 whitespace-nowrap text-base font-black text-[#37405c]">{g.title}</span>
                <span class="text-[11px] font-bold text-[#9a8f78]">{g.desc}</span>
                <!-- mt-auto keeps the buttons on one line when a description wraps. -->
                <span
                  class="mt-auto rounded-full px-4 py-1.5 text-xs font-black text-white"
                  style="background:{g.color}">Main ▶</span
                >
              </span>
            </a>
          {/each}

          <a
            href="{base}/mesin"
            class="relative col-span-2 flex items-center gap-3.5 overflow-hidden rounded-3xl p-[18px] shadow-[0_6px_0_#c04a03] transition active:translate-y-1 md:col-span-1"
            style="background:linear-gradient(135deg, #FB8B24 0%, #F35B04 100%)"
          >
            <span
              class="absolute -right-[18px] top-2.5 rotate-[18deg] bg-[#FFE14D] px-6 py-1 text-[11px] font-black tracking-[1px] text-[#8a5a00]"
              aria-hidden="true">SERU!</span
            >
            <span
              class="grid h-14 w-14 flex-none place-items-center rounded-[20px] bg-white/20 text-3xl"
              aria-hidden="true">🎰</span
            >
            <span class="flex flex-col gap-0.5">
              <span class="text-[19px] font-black text-white">Mesin Kata</span>
              <span class="text-xs font-bold text-white/90">Putar dan temukan kata baru</span>
            </span>
          </a>
        </div>
      </section>
    </div>
  </div>

  <!-- Resume shortcut: the mascot walks the child back to the next open stop. -->
  {#if currentId !== null}
    <!-- Tracks the trail column, so the side-by-side layout doesn't park it on
         top of a Taman Bermain card. The max-w-3xl box mirrors +layout.svelte. -->
    <div class="pointer-events-none fixed inset-x-0 bottom-4 z-20 px-4">
      <div class="mx-auto max-w-3xl">
        <div class="mx-auto flex max-w-[430px] justify-end md:mx-0">
          <button
            onclick={resume}
            aria-label="Lanjut ke pos berikutnya"
            class="bob pointer-events-auto grid h-[66px] w-[66px] place-items-center rounded-full bg-[#FFF0CF] shadow-[0_6px_0_#e6d09a] transition active:translate-y-1 active:shadow-[0_2px_0_#e6d09a]"
          >
            <RobotAvatar color={p.avatar} size={40} />
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if sheet}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-40 bg-[rgba(40,30,10,0.35)]" onclick={closeSheet}></div>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stop-sheet-title"
      tabindex="-1"
      onkeydown={onSheetKeydown}
      class="sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] rounded-t-[32px] bg-[#FFFDF4] px-[22px] pb-[26px] pt-[22px] shadow-[0_-12px_40px_rgba(80,60,20,0.22)]"
    >
      <div class="mx-auto mb-4 h-1.5 w-[54px] rounded-full bg-[#e6ddc5]" aria-hidden="true"></div>
      <div class="flex items-center gap-3.5">
        <span class="grid h-[68px] w-[68px] flex-none place-items-center rounded-[22px] bg-[#FFF0CF] text-[34px]"
          >{sheet.icon}</span
        >
        <div class="min-w-0">
          <h2 id="stop-sheet-title" class="text-[22px] font-black text-[#37405c]">{sheet.title}</h2>
          <p class="text-[13px] font-bold text-[#9a8f78]">{sheet.desc}</p>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-2.5 text-[13px] font-black">
        <span aria-hidden="true">
          {#each [0, 1, 2] as i (i)}
            <span class={i < sheet.stars ? '' : 'opacity-25 grayscale'}>⭐</span>
          {/each}
        </span>
        <span class="text-[#9a8f78]">{sheet.note}</span>
      </div>
      {#if sheet.href}
        <a
          bind:this={ctaEl}
          href={sheet.href}
          class="mt-4 block rounded-[22px] p-4 text-center text-[19px] font-black text-white shadow-[0_6px_0_rgba(0,0,0,0.18)] transition active:translate-y-1 active:shadow-[0_2px_0_rgba(0,0,0,0.18)]"
          style="background:{sheet.tint}">{sheet.cta}</a
        >
      {:else}
        <button
          bind:this={ctaEl}
          onclick={closeSheet}
          class="mt-4 block w-full rounded-[22px] p-4 text-center text-[19px] font-black text-white shadow-[0_6px_0_rgba(0,0,0,0.18)] transition active:translate-y-1 active:shadow-[0_2px_0_rgba(0,0,0,0.18)]"
          style="background:{sheet.tint}">{sheet.cta}</button
        >
      {/if}
    </div>
  {/if}
{/if}

<style>
  .gear {
    display: inline-block;
    transition: transform 0.2s ease;
  }
  .gear:hover {
    transform: rotate(25deg);
  }

  .bob {
    animation: bob 2.6s ease-in-out infinite;
  }
  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-7px);
    }
  }

  /* Ring that breathes outward from the node the child should tap next. */
  .pulse {
    animation: pulsering 1.9s ease-out infinite;
  }
  @keyframes pulsering {
    0% {
      transform: scale(1);
      opacity: 0.55;
    }
    100% {
      transform: scale(1.55);
      opacity: 0;
    }
  }

  .drift {
    animation-name: drift;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
  @keyframes drift {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(18px);
    }
  }

  .sheet {
    animation: sheet-up 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes sheet-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bob,
    .pulse,
    .drift,
    .sheet {
      animation: none;
    }
  }
</style>
