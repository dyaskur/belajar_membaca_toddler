<script>
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { peelSound, chimeSticker } from '$lib/audio/sfx.js';
  import { STICKER_NEW } from '$lib/content/feedback.js';
  import Confetti from './Confetti.svelte';

  /** @type {{ sticker: import('$lib/content/stickers.js').Sticker, onclose: () => void }} */
  let { sticker, onclose } = $props();

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');

  let phase = $state(/** @type {'idle'|'peeling'|'revealed'} */ ('idle'));
  const opened = $derived(phase === 'revealed');
  let imgOk = $state(true);
  let silOk = $state(true);
  /** @type {Confetti} */
  let confetti;
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let autoTimer;
  /** @type {HTMLDivElement|undefined} */
  let dialogEl;
  /** @type {HTMLButtonElement|undefined} */
  let peelBtn;

  $effect(() => {
    // Preload both layers so neither the mystery silhouette nor the reveal photo
    // ever pops onto a blank frame.
    for (const src of [sticker.img, sticker.sil]) {
      const img = new Image();
      img.src = `${base}${src}`;
      img.decode?.().catch(() => {});
    }
  });

  $effect(() => {
    autoTimer = setTimeout(startPeel, 3000); // toddler fallback — no child gets stuck
    return () => clearTimeout(autoTimer);
  });

  $effect(() => {
    // aria-modal doesn't move or trap focus by itself — do it explicitly so a
    // keyboard/screen-reader user can't tab into whatever is behind the overlay,
    // and gets their focus back where it was once this closes.
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    peelBtn?.focus();
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

  /** Peel duration must match the .peel-lift keyframe below. */
  const PEEL_MS = 650;

  function startPeel() {
    if (phase !== 'idle') return;
    phase = 'peeling';
    clearTimeout(autoTimer);
    peelSound();
    setTimeout(() => {
      phase = 'revealed';
      chimeSticker();
      confetti?.fire(sticker.rare ? 90 : 60);
      speakReveal();
    }, PEEL_MS);
  }

  async function speakReveal() {
    await player.speak(voiceId, 'words', STICKER_NEW); // falls back to speechSynthesis
    if (sticker.talks && sticker.bucket !== undefined) {
      await player.ensureLevel(voiceId, sticker.bucket);
      player.speak(voiceId, sticker.bucket, sticker.label);
    }
  }

  /** Tapping the peeled sticker replays its word; tapping it before that peels it. */
  function cardClick() {
    if (phase === 'idle') startPeel();
    else if (opened && sticker.talks && sticker.bucket !== undefined) {
      player.speak(voiceId, sticker.bucket, sticker.label);
    }
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

  <div class="sheet-scene phase-{phase}">
    <div class="backing-sheet" aria-hidden="true"></div>

    <div class="glow-ring mystery" class:hidden={opened} aria-hidden="true"></div>
    {#if phase === 'revealed'}
      <div class="glow-ring" class:golden={sticker.rare} aria-hidden="true"></div>
    {/if}

    <button
      type="button"
      class="sticker-card"
      class:rare={sticker.rare}
      bind:this={peelBtn}
      onclick={cardClick}
      aria-label={opened ? sticker.label : 'Kupas stiker'}
    >
      <div class="art-stack">
        {#if silOk}
          <img src="{base}{sticker.sil}" alt="" aria-hidden="true" class="art art-sil" onerror={() => (silOk = false)} />
        {:else}
          <span class="art art-fallback art-sil-fallback" aria-hidden="true">❔</span>
        {/if}
        {#if imgOk}
          <img src="{base}{sticker.img}" alt={sticker.label} class="art art-real" onerror={() => (imgOk = false)} />
        {:else}
          <span class="art art-fallback art-real-fallback" aria-hidden="true">{sticker.emoji}</span>
        {/if}
      </div>
      <div class="flash" aria-hidden="true"></div>
      <div class="peel-corner" aria-hidden="true"></div>
      <div class="shine" aria-hidden="true"></div>
    </button>

    {#if phase === 'idle'}<span class="hint">Kupas, lihat stikernya! ✨</span>{/if}
    {#if phase === 'revealed'}<span class="label">{sticker.label}</span>{/if}
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

  .sheet-scene {
    position: relative;
    width: 200px;
    height: 200px;
    /* The peeled sticker rises well above the sheet (see .sticker-card below); this
       headroom keeps it from colliding with .title above. */
    margin-top: 9rem;
  }

  .backing-sheet {
    position: absolute;
    inset: 0;
    border-radius: 1.25rem;
    background:
      radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.55) 1.4px, transparent 0) 0 0/14px 14px,
      #cbd5e1;
    border: 3px dashed rgba(255, 255, 255, 0.65);
  }

  .glow-ring {
    position: absolute;
    inset: -30px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(253, 230, 138, 0.55) 0%, transparent 68%);
    animation: glow-pulse 1.6s ease-in-out infinite;
    transition: opacity 0.3s ease;
  }
  .glow-ring.golden {
    background: radial-gradient(circle, rgba(251, 191, 36, 0.75) 0%, transparent 68%);
  }
  /* Cooler "what could it be?" aura while the silhouette is still showing, swapped
     for the warm golden one the instant the card settles into .revealed. */
  .glow-ring.mystery {
    background: radial-gradient(circle, rgba(129, 140, 248, 0.5) 0%, transparent 68%);
  }
  .glow-ring.mystery.hidden {
    opacity: 0;
  }
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.5; transform: scale(0.94); }
    50% { opacity: 1; transform: scale(1.05); }
  }

  .sticker-card {
    position: absolute;
    inset: 14px;
    border-radius: 1.1rem;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    /* Anchor scaling to the bottom edge, not the center: the enlarged card then
       grows only upward from a fixed, predictable baseline, instead of also
       pushing its bottom edge down into the label/backing sheet below. */
    transform-origin: 50% 100%;
  }
  .sticker-card.rare {
    box-shadow: 0 0 0 4px #fbbf24, 0 10px 22px rgba(0, 0, 0, 0.35);
  }
  .art-stack {
    position: absolute;
    inset: 0;
  }
  .art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .art-fallback {
    display: grid;
    place-items: center;
    font-size: 3.5rem;
  }

  /* Silhouette: shown first, then dissolves away once the card settles into
     .revealed — this is the "what could it be?" tease before the photo pops in. */
  .art-sil,
  .art-sil-fallback {
    background: #f8fafc;
    transition: opacity 0.3s ease 0.05s, transform 0.3s ease 0.05s;
  }
  .art-sil-fallback { color: #94a3b8; }
  .phase-revealed .art-sil,
  .phase-revealed .art-sil-fallback {
    opacity: 0;
    transform: scale(0.92);
  }

  /* Real photo: hidden under the silhouette, pops in with a little overshoot the
     instant the reveal lands. */
  .art-real,
  .art-real-fallback {
    opacity: 0;
    transform: scale(1.14);
    transition: opacity 0.4s ease 0.05s, transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1.3) 0.05s;
  }
  .phase-revealed .art-real,
  .phase-revealed .art-real-fallback {
    opacity: 1;
    transform: scale(1);
  }

  /* A quick bright pulse right as the two layers cross-fade — sells the "pop"
     rather than a flat dissolve. */
  .flash {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 72%);
    opacity: 0;
    pointer-events: none;
  }
  .phase-revealed .flash {
    animation: flash-pop 0.5s ease-out;
  }
  @keyframes flash-pop {
    0% { opacity: 0; }
    18% { opacity: 1; }
    100% { opacity: 0; }
  }

  /* Idle: a gentle invitation to peel. */
  .phase-idle .sticker-card {
    animation: invite-wiggle 2s ease-in-out infinite;
  }
  @keyframes invite-wiggle {
    0%, 100% { transform: rotate(0deg) translateY(0); }
    50% { transform: rotate(-2.5deg) translateY(-3px); }
  }

  /* Peeling: the card tilts as if pulled from one corner, then lifts and settles
     well above the sheet with a spring overshoot. */
  .phase-peeling .sticker-card {
    animation: peel-lift 0.65s cubic-bezier(0.32, 0, 0.24, 1) forwards;
  }
  .phase-revealed .sticker-card {
    transform: scale(1.3) rotate(0deg) translateY(-70px);
    box-shadow: 0 18px 30px rgba(0, 0, 0, 0.35);
  }
  @keyframes peel-lift {
    0% { transform: scale(1) rotate(0deg) translateY(0); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25); }
    30% { transform: scale(0.96) rotate(-7deg) translateY(-2px); }
    68% { transform: scale(1.38) rotate(5deg) translateY(-76px); box-shadow: 0 18px 30px rgba(0, 0, 0, 0.35); }
    100% { transform: scale(1.3) rotate(0deg) translateY(-70px); box-shadow: 0 18px 30px rgba(0, 0, 0, 0.35); }
  }

  /* A small corner tab hints where to peel, then gets out of the way once lifting starts. */
  .peel-corner {
    position: absolute;
    top: 0;
    left: 0;
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, #f8fafc 50%, #94a3b8 50%);
    clip-path: polygon(0 0, 100% 0, 0 100%);
    transform-origin: 0 0;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
    opacity: 1;
  }
  .phase-idle .peel-corner {
    animation: corner-wiggle 2s ease-in-out infinite;
  }
  @keyframes corner-wiggle {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-14deg); }
  }
  .phase-peeling .peel-corner,
  .phase-revealed .peel-corner {
    transform: rotate(-45deg);
    opacity: 0;
    transition: opacity 0.25s ease 0.15s;
  }

  /* A single glossy sweep across the sticker once it's settled. */
  .shine {
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, transparent 32%, rgba(255, 255, 255, 0.8) 48%, transparent 64%);
    transform: translateX(-130%);
    pointer-events: none;
  }
  .phase-revealed .shine {
    animation: shine-sweep 0.85s ease-out 0.3s forwards;
  }
  @keyframes shine-sweep {
    from { transform: translateX(-130%); }
    to { transform: translateX(130%); }
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

  .label {
    position: absolute;
    left: 50%;
    /* .sticker-card's bottom edge stays fixed at inset(200-14) - 70px translateY =
       116px from the scene top regardless of its scale (see the bottom-anchored
       transform-origin above) — this sits just below that fixed line. */
    top: 124px;
    transform: translateX(-50%);
    font-weight: 900;
    color: #fff;
    background: rgba(15, 23, 42, 0.6);
    padding: 0.15rem 0.9rem;
    border-radius: 999px;
    text-transform: capitalize;
    white-space: nowrap;
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
    .phase-idle .sticker-card,
    .phase-idle .peel-corner,
    .glow-ring {
      animation: none;
    }
    .phase-peeling .sticker-card {
      animation: none;
      transition: opacity 0.2s linear;
      opacity: 0;
    }
    .phase-revealed .sticker-card {
      transition: none;
    }
    .shine { animation: none; }
    .peel-corner { transition: opacity 0.15s linear; }
    .art-sil, .art-sil-fallback, .art-real, .art-real-fallback {
      transition: opacity 0.2s linear;
      transform: none;
    }
    .phase-revealed .flash { animation: none; }
  }
</style>
