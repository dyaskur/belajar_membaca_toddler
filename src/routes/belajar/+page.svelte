<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { LEVELS, getLevel, levelLabel } from '$lib/content/levels.js';
  import { LOCKED_LEVEL } from '$lib/content/feedback.js';
  import { STICKER_TOTAL } from '$lib/content/stickers.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { buzzWrong } from '$lib/audio/sfx.js';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';
  import { onDestroy, onMount, tick } from 'svelte';

  const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';
  const MAP_PATH_HEIGHT = 1450;
  const MAP_HEIGHT = MAP_PATH_HEIGHT + 65;
  const TROPHY_TOP = MAP_PATH_HEIGHT - 46;

  onMount(() => {
    if (!profiles.active) goto(`${base}/`);
  });

  const p = $derived(profiles.active);
  let selectedId = $state(/** @type {number|null} */ (null));
  let lockedId = $state(/** @type {number|null} */ (null));
  let toast = $state('');
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let toastTimer;
  let alive = true;
  /** @type {HTMLDivElement|undefined} */
  let sheetDialog = $state();
  /** @type {HTMLElement|null} */
  let sheetReturnFocus = null;

  const LEVEL_NODES = /** @type {Record<number, { icon: string, title: string, subtitle: string, x: number, y: number }>} */ ({
    1: { icon: '🔠', title: 'Huruf', subtitle: 'Mengenal A–Z', x: 50, y: 80 },
    2: { icon: '🎵', title: 'Suku Kata', subtitle: 'ba, bi, bu', x: 50, y: 265 },
    4: { icon: '🚪', title: 'Tertutup', subtitle: 'an, bak, tas', x: 22, y: 495 },
    5: { icon: '🔗', title: 'Gabungan', subtitle: 'ng, ny, diftong', x: 22, y: 700 },
    7: { icon: '🚂', title: 'Konsonan', subtitle: 'pra, tri, blo', x: 22, y: 905 },
    3: { icon: '🧩', title: 'Susun Kata', subtitle: 'suku terbuka', x: 78, y: 495 },
    8: { icon: '🏗️', title: 'Lanjut', subtitle: 'pola gabungan', x: 50, y: 1115 },
    9: { icon: '📜', title: 'Panjang', subtitle: '7–12 huruf', x: 50, y: 1305 }
  });

  const BONUS_GAMES = [
    { href: '/cocokkan', icon: '🧩', title: 'Cocokkan', desc: 'Geser kata ke gambar', color: '#10b981', shadow: '#07835b' },
    { href: '/ucapkan', icon: '🎤', title: 'Ucapkan!', desc: 'Baca dengan suara', color: '#14b8a6', shadow: '#0d8074' },
    { href: '/menulis', icon: '✍️', title: 'Belajar Menulis', desc: 'Tiru, susun, dan ketik', color: '#8b5cf6', shadow: '#6641bf', wide: true }
  ];

  const selectedLevel = $derived(selectedId === null ? null : getLevel(selectedId));
  const selectedLocked = $derived(selectedId === null ? false : !profiles.isLevelUnlocked(selectedId));
  const completedCount = $derived(p ? profiles.completedLevelCount(p) : 0);

  onDestroy(() => {
    alive = false;
    if (toastTimer) clearTimeout(toastTimer);
    player.stop();
  });

  /** @param {number} id */
  function isCurrent(id) {
    return LEVELS.find((level) => profiles.isLevelUnlocked(level.id) && !profiles.isLevelComplete(level.id))?.id === id;
  }

  /** @param {number} id */
  function choose(id) {
    if (profiles.isLevelUnlocked(id)) return;

    void openLockedSheet(id);
    void notifyLocked(id);
  }

  /** @param {number} id */
  async function openLockedSheet(id) {
    sheetReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    selectedId = id;
    await tick();
    sheetDialog?.focus();
  }

  async function closeSheet() {
    selectedId = null;
    await tick();
    sheetReturnFocus?.focus();
    sheetReturnFocus = null;
  }

  /** @returns {HTMLElement[]} */
  function sheetFocusables() {
    if (!sheetDialog) return [];
    /** @type {HTMLElement[]} */
    const focusables = [];
    for (const element of sheetDialog.querySelectorAll(FOCUSABLE)) {
      if (element instanceof HTMLElement && element.tabIndex >= 0 && !element.hasAttribute('disabled')) {
        focusables.push(element);
      }
    }
    return focusables;
  }

  /** @param {KeyboardEvent} event */
  function handleSheetKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void closeSheet();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = sheetFocusables();
    if (!focusables.length) {
      event.preventDefault();
      sheetDialog?.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheetDialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheetDialog)) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Play a gentle stop cue and explain how to open a locked checkpoint. @param {number} id */
  async function notifyLocked(id) {
    lockedId = id;
    const missing = profiles.missingPrerequisites(id)
      .map((pack) => `${levelLabel(pack)} ${getLevel(pack)?.title ?? ''}`)
      .join(', ');
    toast = missing ? `Selesaikan ${missing} dulu` : LOCKED_LEVEL;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = '';
      lockedId = null;
    }, 3200);
    buzzWrong();
    const voiceId = p?.voiceId ?? 'ibu-dewi';
    try {
      await player.ensureLevel(voiceId, 1);
      if (alive) player.speak(voiceId, 1, LOCKED_LEVEL);
    } catch {
      // The visual cue still explains the locked checkpoint if audio is unavailable.
    }
  }

  /** @param {number} id */
  async function start(id) {
    if (profiles.isLevelUnlocked(id)) {
      await closeSheet();
      return goto(`${base}/belajar/${id}`);
    }

    await closeSheet();
    await notifyLocked(id);
  }
</script>

<svelte:head>
  <title>Jalur Petualangan · Ayo Belajar Membaca</title>
</svelte:head>

{#if p}
  <div class="adventure-page">
    <div class="adventure-shell">
      <header class="topbar">
        <a href="{base}/" class="top-button back-button" aria-label="Kembali memilih profil">←</a>

        <div class="profile">
          <RobotAvatar color={p.avatar} size={34} />
          <span>{p.name}</span>
        </div>

        <a href="{base}/stiker" class="sticker-score" aria-label={`Buku Stiker, ${profiles.stickers.length} dari ${STICKER_TOTAL}`}>
          <span aria-hidden="true">📒</span>
          <span>{profiles.stickers.length}/{STICKER_TOTAL}</span>
          {#if profiles.newStickerCount > 0}
            <span class="new-sticker">{profiles.newStickerCount}</span>
          {/if}
        </a>

        <a href="{base}/orang-tua" class="settings" aria-label="Pengaturan Orang Tua">⚙️</a>
      </header>

      <main>
        <section class="intro" aria-labelledby="adventure-title">
          <h1 id="adventure-title">Jalur Petualangan</h1>
          <p>Ikuti jalannya, kumpulkan bintang!</p>
          <div
            class="course-progress"
            role="progressbar"
            aria-label="Kemajuan level"
            aria-valuemin="0"
            aria-valuemax={LEVELS.length}
            aria-valuenow={completedCount}
            aria-valuetext={`${completedCount} dari ${LEVELS.length} level selesai`}
          >
            <span style={`width: ${(completedCount / LEVELS.length) * 100}%`}></span>
          </div>
        </section>

        <section class="warmup" aria-labelledby="warmup-label">
          <h2 id="warmup-label" class="stage-label warmup-label">🌟 Pemanasan</h2>
          <a href="{base}/abjad" class="warmup-node pressable">
            <span class="node-orb warmup-orb" aria-hidden="true">🔤</span>
            <strong>Abjad A–Z</strong>
            <small>Dengar semua huruf</small>
          </a>
          <div class="path-stub" aria-hidden="true"></div>
        </section>

        <section
          class="adventure-map"
          aria-label="Peta level belajar"
          style={`--map-height: ${MAP_HEIGHT}px; --path-height: ${MAP_PATH_HEIGHT}px; --trophy-top: ${TROPHY_TOP}px;`}
        >
          <span class="scenery cloud-one" aria-hidden="true">☁️</span>
          <span class="scenery cloud-two" aria-hidden="true">☁️</span>
          <span class="scenery tree-one" aria-hidden="true">🌳</span>
          <span class="scenery tree-two" aria-hidden="true">🌲</span>
          <span class="scenery flower" aria-hidden="true">🌷</span>
          <span class="scenery mushroom" aria-hidden="true">🍄</span>

          <svg class="path" viewBox={`0 0 430 ${MAP_PATH_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M215,80 L215,265"
              class="path-base"
            />
            <path
              d="M215,80 L215,265"
              class="path-dashes"
            />
            <path d="M215,265 C215,350 95,375 95,495 L95,905 C95,985 215,1020 215,1115" class="path-base" />
            <path d="M215,265 C215,350 95,375 95,495 L95,905 C95,985 215,1020 215,1115" class="path-dashes" />
            <path d="M215,265 C215,350 335,375 335,495 C335,690 280,915 215,1115" class="path-base" />
            <path d="M215,265 C215,350 335,375 335,495 C335,690 280,915 215,1115" class="path-dashes" />
            <path d="M215,1115 L215,1305 L215,1450" class="path-base" />
            <path d="M215,1115 L215,1305 L215,1450" class="path-dashes" />
          </svg>

          <h2 class="stage-label stage-one">🚩 Level 1</h2>
          <h2 class="stage-label stage-two">🚩 Level 2</h2>
          <p class="branch-label syllable-label">🧭 Suku Kata</p>
          <h2 class="stage-label stage-three">🚩 Level 3</h2>

          {#each LEVELS as lvl (lvl.id)}
            {@const locked = !profiles.isLevelUnlocked(lvl.id)}
            {@const complete = profiles.isLevelComplete(lvl.id)}
            {@const progress = profiles.levelProgress(lvl.id)}
            {@const node = LEVEL_NODES[lvl.id]}
            <svelte:element
              this={locked ? 'button' : 'a'}
              href={locked ? undefined : `${base}/belajar/${lvl.id}`}
              type={locked ? 'button' : undefined}
              onclick={locked ? () => choose(lvl.id) : undefined}
              role={locked ? 'button' : 'link'}
              aria-haspopup={locked ? 'dialog' : undefined}
              aria-label={`${lvl.label}, ${lvl.title}${locked ? ', terkunci' : complete ? ', selesai' : ', ketuk untuk mulai'}`}
              aria-disabled={locked}
              class:locked-shake={lockedId === lvl.id}
              class:current={isCurrent(lvl.id)}
              class:complete
              class:in-progress={progress > 0 && !complete}
              class:locked
              class="level-node pressable"
              style={`--x: ${node.x}%; --y: ${node.y}px; --progress: ${Math.round(progress * 360)}deg;`}
            >
              <span class="node-orb level-orb">
                <span aria-hidden="true">{node.icon}</span>
                {#if locked}
                  <span class="state-badge lock-badge" aria-hidden="true">🔒</span>
                {:else if complete}
                  <span class="state-badge complete-badge" aria-hidden="true">★</span>
                {:else if progress > 0}
                  <span class="state-badge progress-badge">{Math.round(progress * 100)}%</span>
                {/if}
              </span>
              <strong>{lvl.label.toUpperCase()} · {node.title}</strong>
              <small>{node.subtitle}</small>
            </svelte:element>
          {/each}

          <div class:complete={completedCount === LEVELS.length} class="trophy" role="img" aria-label="Tujuan akhir">
            <span aria-hidden="true">🏆</span>
          </div>
        </section>

        <section class="playground" aria-labelledby="playground-title">
          <div class="awning" aria-hidden="true"></div>
          <div class="playground-heading">
            <span class="tent" aria-hidden="true">🎪</span>
            <div>
              <h2 id="playground-title">Taman Bermain</h2>
              <p>Semua terbuka — main sepuasnya!</p>
            </div>
          </div>

          <div class="game-grid">
            {#each BONUS_GAMES as game}
              <a
                href={`${base}${game.href}`}
                class:wide={game.wide}
                class="game-card pressable"
                style={`--game-color: ${game.color}; --game-shadow: ${game.shadow};`}
              >
                <span class="game-stripes" aria-hidden="true"></span>
                <span class="game-icon" aria-hidden="true">{game.icon}</span>
                <strong>{game.title}</strong>
                <small>{game.desc}</small>
                <span class="play-pill">Main <span aria-hidden="true">▶</span></span>
              </a>
            {/each}

            <a href="{base}/mesin" class="machine-card pressable">
              <span class="fun-ribbon">Seru!</span>
              <span class="machine-icon" aria-hidden="true">🎰</span>
              <span>
                <strong>Mesin Kata</strong>
                <small>Putar dan temukan kata baru</small>
              </span>
            </a>
          </div>
        </section>
      </main>
    </div>
  </div>

  {#if selectedLevel}
    <button class="sheet-backdrop" aria-label="Tutup detail level" onclick={closeSheet}></button>
    <div
      bind:this={sheetDialog}
      class="level-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      tabindex="-1"
      onkeydown={handleSheetKeydown}
      class:sheet-locked={selectedLocked}
    >
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-heading">
        <span class="sheet-icon" aria-hidden="true">{LEVEL_NODES[selectedLevel.id].icon}</span>
        <div>
          <span class="sheet-label">Level {selectedLevel.label}</span>
          <h2 id="sheet-title">{selectedLevel.title}</h2>
          <p>{selectedLevel.subtitle}</p>
        </div>
        <button class="sheet-close" onclick={closeSheet} aria-label="Tutup">×</button>
      </div>

      <div class="sheet-progress">
        <div>
          <span>{selectedLocked ? 'Belum terbuka' : profiles.isLevelComplete(selectedLevel.id) ? 'Hebat, selesai!' : 'Kemajuanmu'}</span>
          <strong>{Math.round(profiles.levelProgress(selectedLevel.id) * 100)}%</strong>
        </div>
        <div class="sheet-progress-track">
          <span style={`width: ${profiles.levelProgress(selectedLevel.id) * 100}%`}></span>
        </div>
        <p>
          {selectedLocked
            ? 'Selesaikan pos sebelumnya untuk membuka petualangan ini.'
            : profiles.isLevelComplete(selectedLevel.id)
              ? 'Kamu boleh bermain lagi untuk terus berlatih.'
              : 'Kumpulkan bintang dengan menyelesaikan setiap latihan.'}
        </p>
      </div>

      <button
        onclick={() => start(selectedLevel.id)}
        class:locked-cta={selectedLocked}
        class="sheet-cta pressable"
      >
        {selectedLocked ? '🔒 Masih Terkunci' : 'Mulai Main'} <span aria-hidden="true">{selectedLocked ? '' : '▶'}</span>
      </button>
    </div>
  {/if}

  <div class="locked-toast" class:visible={toast !== ''} role="status" aria-live="polite">{toast}</div>
{/if}

<style>
  .adventure-page {
    isolation: isolate;
    position: relative;
    width: 100%;
    min-height: calc(100vh - 2rem);
    color: #37405c;
    font-family: Nunito, ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif;
  }

  .adventure-page::before {
    position: fixed;
    z-index: -1;
    inset: 0;
    background: #efe3c8;
    content: '';
  }

  .adventure-shell {
    position: relative;
    width: 100%;
    max-width: 48rem;
    margin: 0 auto;
    overflow: hidden;
    border: 1px solid rgb(218 191 138 / 28%);
    border-radius: 38px;
    background: #fff9e8;
    box-shadow: 0 24px 60px rgb(80 60 20 / 22%);
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 16px 20px;
    background: linear-gradient(#fff9e8 76%, rgb(255 249 232 / 0%));
  }

  .top-button,
  .settings,
  .sticker-score {
    flex: none;
    text-decoration: none;
  }

  .profile {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif;
    font-size: 18px;
    font-weight: 900;
  }

  .profile span {
    overflow: hidden;
    max-width: 92px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sticker-score {
    position: relative;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 10px;
    border-radius: 999px;
    background: #ffebb8;
    box-shadow: 0 3px 0 #e8ce88;
    color: #a85f00;
    font-size: 13px;
    font-weight: 900;
  }

  .new-sticker {
    position: absolute;
    top: -7px;
    right: -5px;
    display: grid;
    min-width: 18px;
    height: 18px;
    place-items: center;
    border: 2px solid #fff9e8;
    border-radius: 999px;
    background: #ef476f;
    color: white;
    font-size: 9px;
  }

  .settings {
    color: #596278;
    font-size: 23px;
    transition: transform 160ms ease;
  }

  .settings:hover {
    transform: rotate(22deg);
  }

  .intro {
    margin-top: -7px;
    padding-bottom: 24px;
    text-align: center;
  }

  .intro h1 {
    margin: 0;
    color: #f58220;
    font-family: ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif;
    font-size: clamp(26px, 7vw, 30px);
    font-weight: 950;
    letter-spacing: -0.5px;
  }

  .intro p,
  .playground-heading p {
    margin: 2px 0 0;
    color: #93866f;
    font-size: 13px;
    font-weight: 800;
  }

  .course-progress {
    width: 118px;
    height: 7px;
    margin: 12px auto 0;
    overflow: hidden;
    border-radius: 999px;
    background: #eadfc0;
  }

  .course-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #ffb02e, #f58220);
    transition: width 500ms ease;
  }

  .warmup {
    position: relative;
    display: flex;
    height: 226px;
    flex-direction: column;
    align-items: center;
  }

  .stage-label {
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 7px;
    width: max-content;
    margin: 0;
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 1.3px;
    text-transform: uppercase;
  }

  .warmup-label {
    background: #e0dcfb;
    box-shadow: 0 3px 0 #c7c0f3;
    color: #4b3fc7;
  }

  .warmup-node,
  .level-node {
    display: flex;
    width: 138px;
    flex-direction: column;
    align-items: center;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    text-align: center;
    text-decoration: none;
  }

  .warmup-node {
    z-index: 2;
    margin-top: 14px;
  }

  .node-orb {
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  .warmup-orb {
    width: 96px;
    height: 96px;
    background: #6c5cf0;
    box-shadow: 0 9px 0 #4433c4, inset 0 -6px 0 rgb(0 0 0 / 8%);
    font-size: 42px;
  }

  .warmup-node strong,
  .level-node strong {
    margin-top: 12px;
    color: #37405c;
    font-family: ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif;
    font-weight: 950;
    line-height: 1.15;
  }

  .warmup-node strong {
    font-size: 16px;
  }

  .warmup-node small,
  .level-node small {
    margin-top: 3px;
    color: #978a72;
    font-size: 11px;
    font-weight: 800;
    line-height: 1.2;
  }

  .path-stub {
    width: 26px;
    height: 48px;
    margin-top: 5px;
    border-radius: 99px;
    background:
      radial-gradient(circle, #fffdf4 0 4px, transparent 4.5px) center 1px / 9px 20px repeat-y,
      #eadfc0;
  }

  .adventure-map {
    position: relative;
    width: 100%;
    height: var(--map-height);
  }

  .path {
    position: absolute;
    inset: 0;
    width: 100%;
    height: var(--path-height);
    overflow: visible;
  }

  .path-base,
  .path-dashes {
    fill: none;
    stroke-linecap: round;
  }

  .path-base {
    stroke: #eadfc0;
    stroke-width: 30;
  }

  .path-dashes {
    stroke: #fffdf4;
    stroke-dasharray: 2 20;
    stroke-width: 9;
  }

  .stage-one,
  .stage-two,
  .stage-three {
    position: absolute;
    transform: translateX(-50%);
  }

  .stage-one {
    top: 0;
    left: 50%;
    background: #ffe2b0;
    box-shadow: 0 3px 0 #ecc684;
    color: #a85f00;
  }

  .stage-two,
  .stage-three {
    background: #e4eaf6;
    box-shadow: 0 3px 0 #ccd6e8;
    color: #64708e;
  }

  .stage-two {
    top: 165px;
    left: 50%;
  }

  .stage-three {
    top: 375px;
    left: 78%;
  }

  .branch-label {
    position: absolute;
    z-index: 2;
    margin: 0;
    padding: 6px 14px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: #e4eaf6;
    box-shadow: 0 3px 0 #ccd6e8;
    color: #64708e;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }

  .syllable-label {
    top: 375px;
    left: 22%;
  }

  .level-node {
    position: absolute;
    z-index: 3;
    top: var(--y);
    left: var(--x);
    transform: translate(-50%, -50%);
  }

  .level-node:active {
    transform: translate(-50%, calc(-50% + 4px));
  }

  .level-orb {
    position: relative;
    width: 92px;
    height: 92px;
    background: #ffa53d;
    box-shadow: 0 8px 0 #d96c00, inset 0 -6px 0 rgb(0 0 0 / 6%);
    font-size: 38px;
  }

  .level-node.current .level-orb::before {
    position: absolute;
    inset: -6px;
    border: 5px solid #f58220;
    border-radius: 50%;
    content: '';
    animation: pulse-ring 1.9s ease-out infinite;
  }

  .level-node.complete .level-orb {
    background:
      linear-gradient(#45d398, #23b97f) padding-box,
      conic-gradient(#10a872 var(--progress), #dce7df 0) border-box;
    border: 5px solid transparent;
    box-shadow: 0 8px 0 #0b8f63, inset 0 -6px 0 rgb(0 0 0 / 5%);
  }

  .level-node.in-progress .level-orb {
    background:
      linear-gradient(#ffa53d, #ffa53d) padding-box,
      conic-gradient(#f58220 var(--progress), #f6dfbd 0) border-box;
    border: 5px solid transparent;
  }

  .level-node.locked .level-orb {
    background: #e6eaf2;
    box-shadow: 0 8px 0 #c8cfdd;
    filter: grayscale(0.45);
    opacity: 0.92;
  }

  .level-node.locked strong {
    color: #818a9f;
  }

  .level-node.locked small {
    color: #a9a294;
  }

  .level-node strong {
    max-width: 145px;
    font-size: 15px;
    white-space: nowrap;
  }

  .state-badge {
    position: absolute;
    right: -5px;
    bottom: -3px;
    display: grid;
    min-width: 31px;
    height: 31px;
    place-items: center;
    border: 3px solid #fff9e8;
    border-radius: 50%;
    background: white;
    box-shadow: 0 3px 0 #cfd6e3;
    font-size: 14px;
    font-weight: 950;
  }

  .complete-badge {
    background: #ffe36c;
    color: #a86100;
  }

  .progress-badge {
    right: -13px;
    width: auto;
    padding: 0 5px;
    border-radius: 999px;
    background: #fff0cf;
    color: #a85f00;
    font-size: 9px;
  }

  .trophy {
    position: absolute;
    z-index: 3;
    top: var(--trophy-top);
    left: calc(50% - 46px);
    display: grid;
    width: 92px;
    height: 92px;
    place-items: center;
    border-radius: 50%;
    background: #ffebb8;
    box-shadow: 0 8px 0 #e8ce88;
    font-size: 42px;
    filter: grayscale(0.55);
  }

  .trophy.complete {
    filter: none;
    animation: trophy-bob 2.4s ease-in-out infinite;
  }

  .scenery {
    position: absolute;
    z-index: 1;
    opacity: 0.68;
    pointer-events: none;
  }

  .cloud-one { top: 52px; left: 6%; font-size: 30px; animation: drift 7s ease-in-out infinite alternate; }
  .cloud-two { top: 302px; right: 5%; font-size: 27px; animation: drift 9s ease-in-out infinite alternate-reverse; }
  .tree-one { top: 382px; left: 7%; font-size: 31px; }
  .tree-two { top: 775px; right: 5%; font-size: 29px; }
  .flower { top: 760px; left: 44%; font-size: 28px; }
  .mushroom { top: 1012px; right: 7%; font-size: 26px; }

  .playground {
    margin: 34px 18px 34px;
    overflow: hidden;
    padding-bottom: 22px;
    border-radius: 30px;
    background: #f4ecd8;
  }

  .awning {
    height: 26px;
    background: repeating-linear-gradient(90deg, #f58220 0 22px, #fff3d6 22px 44px);
  }

  .playground-heading {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 16px 18px 4px;
  }

  .tent {
    font-size: 28px;
  }

  .playground-heading h2 {
    margin: 0;
    color: #37405c;
    font-family: ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif;
    font-size: 21px;
    font-weight: 950;
  }

  .game-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 14px 18px 0;
  }

  .game-card {
    display: flex;
    min-width: 0;
    overflow: hidden;
    flex-direction: column;
    align-items: center;
    border-radius: 24px;
    background: #fffdf4;
    box-shadow: 0 6px 0 var(--game-shadow);
    color: #37405c;
    text-align: center;
    text-decoration: none;
  }

  .game-card.wide {
    grid-column: span 2;
  }

  .game-stripes {
    width: 100%;
    height: 22px;
    background: repeating-linear-gradient(90deg, var(--game-color) 0 14px, #fffdf4 14px 28px);
  }

  .game-icon {
    display: grid;
    width: 52px;
    height: 52px;
    margin-top: 12px;
    place-items: center;
    border-radius: 50%;
    background: #edf7f2;
    background: color-mix(in srgb, var(--game-color) 14%, transparent);
    font-size: 28px;
  }

  .game-card strong {
    margin-top: 8px;
    font-family: ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif;
    font-size: 16px;
    font-weight: 950;
  }

  .game-card small {
    min-height: 27px;
    padding: 0 8px;
    color: #93866f;
    font-size: 11px;
    font-weight: 800;
  }

  .play-pill {
    margin: 8px 0 15px;
    padding: 6px 16px;
    border-radius: 999px;
    background: var(--game-color);
    color: white;
    font-size: 12px;
    font-weight: 900;
  }

  .machine-card {
    position: relative;
    display: flex;
    grid-column: span 2;
    align-items: center;
    gap: 14px;
    overflow: hidden;
    padding: 18px;
    border-radius: 24px;
    background: linear-gradient(135deg, #fb8b24, #f35b04);
    box-shadow: 0 6px 0 #c04a03;
    color: white;
    text-align: left;
    text-decoration: none;
  }

  .machine-icon {
    display: grid;
    width: 56px;
    height: 56px;
    flex: none;
    place-items: center;
    border-radius: 20px;
    background: rgb(255 255 255 / 22%);
    font-size: 30px;
  }

  .machine-card strong,
  .machine-card small {
    display: block;
  }

  .machine-card strong {
    font-family: ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif;
    font-size: 19px;
    font-weight: 950;
  }

  .machine-card small {
    color: rgb(255 255 255 / 90%);
    font-size: 12px;
    font-weight: 800;
  }

  .fun-ribbon {
    position: absolute;
    top: 10px;
    right: -18px;
    padding: 4px 26px;
    transform: rotate(18deg);
    background: #ffe14d;
    color: #825400;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    width: 100%;
    border: 0;
    background: rgb(40 30 10 / 38%);
  }

  .level-sheet {
    position: fixed;
    right: 16px;
    bottom: 16px;
    left: 16px;
    z-index: 50;
    width: auto;
    max-width: 430px;
    margin: 0 auto;
    padding: 12px 22px 24px;
    border-radius: 32px;
    background: #fffdf4;
    box-shadow: 0 -12px 40px rgb(80 60 20 / 22%);
    animation: sheet-in 220ms ease-out;
  }

  .sheet-handle {
    width: 54px;
    height: 6px;
    margin: 0 auto 16px;
    border-radius: 99px;
    background: #e6ddc5;
  }

  .sheet-heading {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .sheet-icon {
    display: grid;
    width: 68px;
    height: 68px;
    flex: none;
    place-items: center;
    border-radius: 22px;
    background: #fff0cf;
    font-size: 34px;
  }

  .sheet-label {
    color: #f58220;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .sheet-heading h2 {
    margin: 0;
    color: #37405c;
    font-family: ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif;
    font-size: 22px;
    font-weight: 950;
    line-height: 1.1;
  }

  .sheet-heading p {
    margin: 3px 0 0;
    color: #93866f;
    font-size: 12px;
    font-weight: 750;
  }

  .sheet-close {
    align-self: flex-start;
    margin-left: auto;
    border: 0;
    background: transparent;
    color: #9a8f78;
    cursor: pointer;
    font-size: 30px;
    line-height: 1;
  }

  .sheet-progress {
    margin-top: 18px;
  }

  .sheet-progress > div:first-child {
    display: flex;
    justify-content: space-between;
    color: #8b7350;
    font-size: 12px;
    font-weight: 900;
  }

  .sheet-progress-track {
    height: 10px;
    margin-top: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #eadfc0;
  }

  .sheet-progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #f58220;
  }

  .sheet-progress p {
    margin: 10px 0 0;
    color: #827966;
    font-size: 12px;
    font-weight: 700;
  }

  .sheet-cta {
    width: 100%;
    margin-top: 18px;
    padding: 15px;
    border: 0;
    border-radius: 20px;
    background: #f58220;
    box-shadow: 0 6px 0 #c85d09;
    color: white;
    cursor: pointer;
    font: inherit;
    font-size: 17px;
    font-weight: 950;
  }

  .sheet-cta.locked-cta {
    background: #b6bcc9;
    box-shadow: 0 6px 0 #9299a8;
  }

  .locked-toast {
    position: fixed;
    bottom: 26px;
    left: 50%;
    z-index: 60;
    width: calc(100% - 52px);
    max-width: 380px;
    padding: 13px 18px;
    transform: translateX(-50%);
    border-radius: 18px;
    background: #37405c;
    box-shadow: 0 8px 24px rgb(40 48 72 / 28%);
    color: white;
    font-weight: 850;
    text-align: center;
    visibility: hidden;
  }

  .locked-toast.visible {
    visibility: visible;
  }

  .pressable {
    transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
  }

  .pressable:hover {
    filter: brightness(1.025);
  }

  .pressable:not(.level-node):active {
    transform: translateY(4px);
  }

  .game-card:active,
  .machine-card:active {
    box-shadow: 0 2px 0 var(--game-shadow, #c04a03);
  }

  .locked-shake {
    animation: locked-shake 0.45s ease;
  }

  @keyframes pulse-ring {
    from { transform: scale(1); opacity: 0.55; }
    to { transform: scale(1.55); opacity: 0; }
  }

  @keyframes drift {
    from { transform: translateX(0); }
    to { transform: translateX(18px); }
  }

  @keyframes trophy-bob {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50% { transform: translateY(-7px) rotate(2deg); }
  }

  @keyframes sheet-in {
    from { transform: translateY(26px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes locked-shake {
    0%, 100% { transform: translate(-50%, -50%); }
    25% { transform: translate(calc(-50% - 8px), -50%); }
    50% { transform: translate(calc(-50% + 7px), -50%); }
    75% { transform: translate(calc(-50% - 4px), -50%); }
  }

  @media (max-width: 480px) {
    .adventure-page {
      min-height: calc(100vh - 2rem);
    }

    .adventure-page::before {
      background: #fff9e8;
    }

    .adventure-shell {
      border: 0;
      border-radius: 28px;
      box-shadow: none;
    }

    .topbar {
      padding-inline: 11px;
    }

    .profile {
      gap: 4px;
      font-size: 16px;
    }

    .profile span {
      max-width: 70px;
    }

    .sticker-score {
      padding-inline: 8px;
      font-size: 12px;
    }

    .game-grid {
      padding-inline: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .level-node.current .level-orb::before,
    .scenery,
    .trophy.complete,
    .level-sheet,
    .locked-shake {
      animation: none;
    }

    .pressable,
    .course-progress span {
      transition: none;
    }
  }
</style>
