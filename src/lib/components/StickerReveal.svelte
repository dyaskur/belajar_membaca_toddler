<script>
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect } from '$lib/audio/sfx.js';
  import { STICKER_NEW } from '$lib/content/feedback.js';
  import Confetti from './Confetti.svelte';

  /** @type {{ sticker: import('$lib/content/stickers.js').Sticker, onclose: () => void }} */
  let { sticker, onclose } = $props();

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');

  let opened = $state(false);
  let imgOk = $state(true);
  /** @type {Confetti} */
  let confetti;
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let autoTimer;
  /** @type {HTMLDivElement|undefined} */
  let dialogEl;
  /** @type {HTMLButtonElement|undefined} */
  let chestBtn;

  $effect(() => {
    // Preload so the chest never pops open onto a blank frame.
    const img = new Image();
    img.src = `${base}${sticker.img}`;
    img.decode?.().catch(() => {});
  });

  $effect(() => {
    autoTimer = setTimeout(open, 3000); // toddler fallback — no child gets stuck
    return () => clearTimeout(autoTimer);
  });

  $effect(() => {
    // aria-modal doesn't move or trap focus by itself — do it explicitly so a
    // keyboard/screen-reader user can't tab into whatever is behind the overlay,
    // and gets their focus back where it was once this closes.
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    chestBtn?.focus();
    return () => returnTo?.focus();
  });

  /** @param {KeyboardEvent} event */
  function trapFocus(event) {
    if (event.key === 'Escape') {
      if (opened) onclose();
      return;
    }
    if (event.key !== 'Tab' || !dialogEl) return;
    const focusables = [...dialogEl.querySelectorAll('button:not([disabled])')];
    if (!focusables.length) return;
    const first = /** @type {HTMLElement} */ (focusables[0]);
    const last = /** @type {HTMLElement} */ (focusables[focusables.length - 1]);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open() {
    if (opened) return;
    opened = true;
    clearTimeout(autoTimer);
    chimeCorrect();
    confetti?.fire(sticker.rare ? 90 : 60);
    speakReveal();
  }

  async function speakReveal() {
    await player.speak(voiceId, 'words', STICKER_NEW); // falls back to speechSynthesis
    if (sticker.talks && sticker.bucket !== undefined) {
      await player.ensureLevel(voiceId, sticker.bucket);
      player.speak(voiceId, sticker.bucket, sticker.label);
    }
  }

  /** Tapping the revealed photo replays its word. */
  function replay() {
    if (!opened || !sticker.talks || sticker.bucket === undefined) return;
    player.speak(voiceId, sticker.bucket, sticker.label);
  }
</script>

<div
  class="overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Stiker baru"
  tabindex="-1"
  bind:this={dialogEl}
  onkeydown={trapFocus}
>
  <Confetti bind:this={confetti} />

  <h2 class="title">Stiker Baru! 🎉</h2>

  <div class="chest-scene" class:opened>
    {#if !opened}
      <span class="sparkle s1" aria-hidden="true">✨</span>
      <span class="sparkle s2" aria-hidden="true">✨</span>
      <span class="sparkle s3" aria-hidden="true">✨</span>
    {:else}
      <div class="rays" aria-hidden="true"></div>
    {/if}

    <svg class="chest-glow" viewBox="0 0 200 30" aria-hidden="true">
      <ellipse cx="100" cy="15" rx="85" ry="10" fill="#000" opacity="0.18" />
    </svg>

    <svg class="chest-body" class:golden={sticker.rare} viewBox="0 0 200 140" aria-hidden="true">
      <rect x="18" y="68" width="164" height="66" rx="16" class="wood" />
      <rect x="18" y="68" width="164" height="20" rx="6" class="band" />
      <rect x="90" y="94" width="20" height="24" rx="5" class="lock" />
      <circle cx="100" cy="104" r="3.5" class="lock-dot" />
    </svg>

    <button
      type="button"
      class="chest-lid-btn"
      bind:this={chestBtn}
      onclick={open}
      aria-label={opened ? sticker.label : 'Buka peti stiker'}
    >
      <svg class="chest-lid" class:golden={sticker.rare} viewBox="0 0 200 92" aria-hidden="true">
        <path d="M18,90 Q18,8 100,8 Q182,8 182,90 Z" class="wood" />
        <rect x="18" y="58" width="164" height="16" rx="6" class="band" />
        <circle cx="100" cy="80" r="6" class="lock-dot" />
      </svg>
      {#if !opened}<span class="hint">Buka! ✨</span>{/if}
    </button>

    <div class="photo-pop" class:show={opened}>
      <button type="button" class="photo-btn" onclick={replay} aria-label="Dengar {sticker.label}">
        {#if imgOk}
          <img src="{base}{sticker.img}" alt={sticker.label} class="photo" onerror={() => (imgOk = false)} />
        {:else}
          <span class="photo-fallback" aria-hidden="true">{sticker.emoji}</span>
        {/if}
      </button>
      <span class="label">{sticker.label}</span>
    </div>
  </div>

  <button type="button" class="save-btn" disabled={!opened} onclick={onclose}> Simpan di Album ▶ </button>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.75rem;
    background: rgba(15, 23, 42, 0.82);
    padding: 1.5rem;
  }
  .title {
    font-size: 1.75rem;
    font-weight: 900;
    color: #fbbf24;
    text-align: center;
  }

  .chest-scene {
    position: relative;
    width: 220px;
    height: 210px;
    /* The popped photo rises well above the chest (see .photo-pop.show); this
       headroom keeps it from colliding with .title above. */
    margin-top: 6.5rem;
    perspective: 480px;
  }
  .chest-glow {
    position: absolute;
    bottom: 4px;
    left: 50%;
    width: 200px;
    transform: translateX(-50%);
  }
  .chest-body {
    position: absolute;
    bottom: 20px;
    left: 50%;
    width: 200px;
    transform: translateX(-50%);
  }
  .chest-body .wood { fill: #92400e; }
  .chest-body .band { fill: #78350f; }
  .chest-body .lock { fill: #fde68a; }
  .chest-body .lock-dot { fill: #92400e; }
  .chest-body.golden .wood { fill: #d4a017; }
  .chest-body.golden .band { fill: #a86408; }
  .chest-body.golden .lock { fill: #fff7d6; }
  .chest-body.golden .lock-dot { fill: #a86408; }

  .chest-lid-btn {
    position: absolute;
    bottom: 68px;
    left: 50%;
    width: 200px;
    transform: translateX(-50%);
    transform-origin: center bottom;
    transform-style: preserve-3d;
    transition: transform 0.55s cubic-bezier(0.34, 1.15, 0.4, 1);
    animation: chest-bob 2.2s ease-in-out infinite;
  }
  .chest-scene.opened .chest-lid-btn {
    transform: translateX(-50%) rotateX(-122deg);
    animation: none;
  }
  .chest-lid .wood { fill: #a3550f; }
  .chest-lid .band { fill: #78350f; }
  .chest-lid .lock-dot { fill: #fde68a; }
  .chest-lid.golden .wood { fill: #e8b429; }
  .chest-lid.golden .band { fill: #a86408; }
  .chest-lid.golden .lock-dot { fill: #fff7d6; }

  @keyframes chest-bob {
    0%, 100% { transform: translateX(-50%) translateY(0) rotate(0deg); }
    50% { transform: translateX(-50%) translateY(-4px) rotate(-1.5deg); }
  }

  .hint {
    position: absolute;
    left: 50%;
    bottom: -1.9rem;
    transform: translateX(-50%);
    font-weight: 900;
    color: #fde68a;
    white-space: nowrap;
    animation: hint-pulse 1.4s ease-in-out infinite;
  }
  @keyframes hint-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .sparkle {
    position: absolute;
    font-size: 1.25rem;
    animation: twinkle 1.6s ease-in-out infinite;
  }
  .s1 { top: 10%; left: 12%; animation-delay: 0s; }
  .s2 { top: 20%; right: 10%; animation-delay: 0.4s; }
  .s3 { bottom: 35%; left: 6%; animation-delay: 0.8s; }
  @keyframes twinkle {
    0%, 100% { opacity: 0.2; transform: scale(0.85); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  .rays {
    position: absolute;
    inset: -20px;
    background: conic-gradient(
      from 0deg,
      transparent 0deg 10deg,
      rgba(253, 230, 138, 0.55) 12deg 16deg,
      transparent 18deg 40deg
    );
    border-radius: 50%;
    animation: ray-burst 0.9s ease-out forwards;
  }
  @keyframes ray-burst {
    0% { opacity: 0; transform: scale(0.4) rotate(0deg); }
    35% { opacity: 1; }
    100% { opacity: 0; transform: scale(1.4) rotate(35deg); }
  }

  .photo-pop {
    position: absolute;
    top: 6px;
    left: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    transform: translate(-50%, -35%) scale(0);
    opacity: 0;
    transition:
      transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity 0.4s ease;
  }
  .photo-pop.show {
    transform: translate(-50%, -78%) scale(1);
    opacity: 1;
  }
  .photo-btn {
    width: 128px;
    height: 128px;
    border-radius: 1.25rem;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
    display: grid;
    place-items: center;
  }
  .photo { width: 100%; height: 100%; object-fit: cover; }
  .photo-fallback { font-size: 3.5rem; }
  .label {
    font-weight: 900;
    color: #fff;
    background: rgba(15, 23, 42, 0.55);
    padding: 0.15rem 0.9rem;
    border-radius: 999px;
    text-transform: capitalize;
  }

  .save-btn {
    border-radius: 1.25rem;
    background: #f59e0b;
    color: #fff;
    font-weight: 900;
    font-size: 1.1rem;
    padding: 1rem 2rem;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }
  .save-btn:active { transform: scale(0.96); }
  .save-btn:disabled { opacity: 0.5; }

  @media (prefers-reduced-motion: reduce) {
    .chest-lid-btn { animation: none; transition: opacity 0.2s linear; }
    .chest-scene.opened .chest-lid-btn { transform: translateX(-50%); opacity: 0; }
    .hint, .sparkle, .rays { display: none; }
    .photo-pop { transition: opacity 0.25s linear; }
    .photo-pop.show { transform: translate(-50%, -78%) scale(1); }
  }
</style>
