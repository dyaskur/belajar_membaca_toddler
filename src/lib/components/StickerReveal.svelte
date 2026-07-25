<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { STICKER_NEW } from '$lib/content/feedback.js';
  import { isCreatureSticker, stickerAudioBucket } from '$lib/content/stickers.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect } from '$lib/audio/sfx.js';
  import Confetti from './Confetti.svelte';

  /** @type {{ sticker: import('$lib/content/stickers.js').Sticker, onclose: () => void }} */
  let { sticker, onclose } = $props();

  let ready = $state(false);
  let opened = $state(false);
  let revealed = $state(false);
  let reducedMotion = $state(false);
  let displaySrc = $state('');
  /** @type {Confetti} */
  let confetti;
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let autoTimer;
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let revealTimer;
  let opening = false;
  let closed = false;

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');

  onMount(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    displaySrc = `${base}${sticker.img}`;
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;

    async function prepare() {
      const image = new Image();
      image.src = `${base}${sticker.img}`;
      try {
        await image.decode();
      } catch {
        displaySrc = isCreatureSticker(sticker.id) ? `${base}${sticker.sil}` : '';
      }
      if (cancelled) return;
      ready = true;
      if (reducedMotion) {
        opened = true;
        requestAnimationFrame(() => {
          revealed = true;
          announce(false);
        });
      } else {
        autoTimer = setTimeout(open, 3000);
      }
    }

    prepare();
    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      clearTimeout(autoTimer);
      clearTimeout(revealTimer);
      player.stop();
    };
  });

  async function announce(withEffects = true) {
    if (withEffects) {
      chimeCorrect();
      confetti?.fire(sticker.rare ? 90 : 60);
    }
    await player.ensureLevel(voiceId, 'words');
    await player.speak(voiceId, 'words', STICKER_NEW);
    if (!closed && sticker.talks) {
      const bucket = stickerAudioBucket(sticker);
      await player.ensureLevel(voiceId, bucket);
      if (!closed) await player.speak(voiceId, bucket, sticker.id);
    }
  }

  function open() {
    if (!ready || opening || opened) return;
    opening = true;
    clearTimeout(autoTimer);
    opened = true;
    revealTimer = setTimeout(() => {
      revealed = true;
      announce(true);
    }, 620);
  }

  function imageFailed() {
    if (displaySrc !== `${base}${sticker.sil}` && isCreatureSticker(sticker.id)) displaySrc = `${base}${sticker.sil}`;
    else displaySrc = '';
  }

  function close() {
    closed = true;
    player.stop();
    onclose();
  }
</script>

<Confetti bind:this={confetti} />

{#if ready}
  <div
    class="fixed inset-0 z-40 grid touch-none place-items-center overflow-hidden bg-slate-950/75 px-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-label={`Stiker baru: ${sticker.label}`}
  >
    <div class="stage relative w-full max-w-[380px] text-center">
      <div class:visible={opened} class:gold={sticker.rare} class="magic-glow" aria-hidden="true"></div>

      <div class:visible={revealed} class:gold={sticker.rare} class="rays" aria-hidden="true">
        {#each Array(12) as _, i}
          <span style={`--ray:${i * 30}deg`}></span>
        {/each}
      </div>

      <div class:visible={revealed} class="magic-sparkles" aria-hidden="true">
        {#each Array(8) as _, i}
          <span style={`--spark-angle:${i * 45}deg;--spark-delay:${i * 45}ms`}>✦</span>
        {/each}
      </div>

      {#if revealed}
        <p class="reward-title absolute left-1/2 z-20 whitespace-nowrap text-3xl font-black text-yellow-200">
          ✨ Hore! Stiker baru! ✨
        </p>
      {/if}

      <div class:shown={revealed} class="sticker absolute z-10 w-52">
        <div class="aspect-square overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl">
          {#if displaySrc}
            <img
              src={displaySrc}
              alt={sticker.label}
              onerror={imageFailed}
              class="h-full w-full object-cover"
            />
          {:else}
            <div class="grid h-full w-full place-items-center bg-slate-100 text-7xl" aria-label={sticker.label}>{sticker.emoji}</div>
          {/if}
        </div>
        <p class="mt-2 rounded-full bg-white/95 px-4 py-2 text-xl font-black text-slate-800 shadow">{sticker.label}</p>
      </div>

      <button
        type="button"
        class:opened
        class:rare={sticker.rare}
        class="chest absolute left-1/2 top-1/2 h-52 w-72 select-none rounded-3xl focus-visible:outline-4 focus-visible:outline-white sm:h-56 sm:w-80"
        onpointerdown={open}
        onclick={open}
        aria-label={opened ? `Peti terbuka, ${sticker.label}` : 'Buka peti stiker'}
      >
        <svg viewBox="0 0 320 220" class="h-full w-full overflow-visible drop-shadow-2xl" aria-hidden="true">
          <g class="chest-cavity">
            <path d="M43 94h234v43H43z" />
            <ellipse cx="160" cy="104" rx="116" ry="24" />
            <path class="treasure-light" d="M66 101h188l-38-62H104z" />
          </g>
          <g class="chest-lid">
            <path class="lid-main" d="M38 104V78c0-36 28-60 65-60h114c37 0 65 24 65 60v26z" />
            <path class="lid-band" d="M38 79h244v27H38z" />
            <path class="metal" d="M145 18h30v88h-30z" />
            <path class="shine" d="M57 70c5-22 21-35 47-39h28v12h-25c-19 2-31 12-36 27z" />
            <path class="lid-rim" d="M40 95h240v14H40z" />
            <circle class="stud" cx="61" cy="92" r="7" />
            <circle class="stud" cx="259" cy="92" r="7" />
          </g>
          <g class="chest-base">
            <path class="base-main" d="M34 102h252v91c0 10-8 18-18 18H52c-10 0-18-8-18-18z" />
            <path class="base-band" d="M34 111h252v26H34z" />
            <path class="metal" d="M145 102h30v109h-30z" />
            <rect class="lock" x="139" y="122" width="42" height="48" rx="9" />
            <circle class="keyhole" cx="160" cy="141" r="6" />
            <path class="keyhole" d="M155 145h10l4 15h-18z" />
            <path class="shine" d="M52 150v36c0 5 4 9 9 9h57v-11H68c-3 0-5-2-5-5v-29z" />
            <circle class="stud" cx="56" cy="122" r="7" />
            <circle class="stud" cx="264" cy="122" r="7" />
          </g>
        </svg>
      </button>

      {#if !opened}
        <p class="hint absolute left-1/2 whitespace-nowrap text-2xl font-black text-white">
          Ketuk petinya! ✨
        </p>
      {:else if revealed}
        <button
          type="button"
          onclick={close}
          class="save-button absolute bottom-0 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-8 py-3 text-lg font-black text-rose-600 shadow-xl active:scale-95"
        >
          Simpan di album
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .stage {
    height: min(520px, calc(100dvh - 32px));
    min-height: 420px;
  }
  .chest {
    transform: translate(-50%, -50%);
    animation: chest-idle 1.7s ease-in-out infinite;
    filter: drop-shadow(0 22px 18px rgb(0 0 0 / 0.38));
    touch-action: none;
  }
  .chest.opened {
    animation: chest-open 1s cubic-bezier(0.18, 0.9, 0.3, 1.12) both;
  }
  .chest-base {
    transform-box: fill-box;
    transform-origin: 50% 100%;
  }
  .opened .chest-base {
    animation: base-pop 0.9s cubic-bezier(0.18, 0.9, 0.3, 1.2) both;
  }
  .chest-lid {
    transform-box: view-box;
    transform-origin: 160px 104px;
    transition: transform 0.72s cubic-bezier(0.16, 1.15, 0.32, 1.08) 0.2s;
  }
  .opened .chest-lid {
    transform: translateY(-62px) rotate(-8deg);
  }
  .chest-cavity {
    fill: #2f160c;
    opacity: 0;
    transform: translateY(8px) scaleY(0.5);
    transform-origin: 50% 50%;
    transition:
      opacity 0.25s ease 0.28s,
      transform 0.42s ease 0.26s;
  }
  .opened .chest-cavity {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
  .treasure-light {
    fill: #fde68a;
    opacity: 0;
  }
  .opened .treasure-light {
    fill: #fde68a;
    opacity: 0.5;
    animation: treasure-pulse 0.75s ease-in-out 0.42s infinite alternate;
  }
  .lid-main,
  .base-main {
    fill: #9a4f1f;
    stroke: #5b2b13;
    stroke-width: 8;
  }
  .lid-band,
  .base-band {
    fill: #713713;
  }
  .lid-rim {
    fill: #4b210e;
  }
  .metal,
  .lock,
  .stud {
    fill: #f5b82e;
    stroke: #8a5410;
    stroke-width: 5;
  }
  .keyhole {
    fill: #5b2b13;
  }
  .shine {
    fill: #d98a42;
    opacity: 0.65;
  }
  .rare .lid-main,
  .rare .base-main {
    fill: #f4bd2f;
    stroke: #a96508;
  }
  .rare .lid-band,
  .rare .base-band {
    fill: #d99112;
  }
  .rare .lid-rim {
    fill: #9c5b08;
  }
  .rare .chest-cavity {
    fill: #6b3905;
  }
  .rare .metal,
  .rare .lock,
  .rare .stud {
    fill: #fff1a6;
    stroke: #bc760b;
  }
  .rare .keyhole {
    fill: #8d5107;
  }
  .rare .shine {
    fill: #fff6bf;
    opacity: 0.9;
  }
  .sticker {
    left: 50%;
    top: 50%;
    opacity: 0;
    transform: translate(-50%, 30px) scale(0.12) rotate(-10deg);
    transition:
      transform 0.82s cubic-bezier(0.12, 1.35, 0.3, 1),
      opacity 0.18s ease;
  }
  .sticker.shown {
    opacity: 1;
    transform: translate(-50%, -250px) scale(1) rotate(0);
  }
  .magic-glow {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 0;
    width: 390px;
    height: 390px;
    border-radius: 999px;
    background: radial-gradient(circle, rgb(254 240 138 / 0.92) 0%, rgb(250 204 21 / 0.48) 34%, rgb(245 158 11 / 0.14) 58%, transparent 72%);
    box-shadow: 0 0 90px rgb(250 204 21 / 0.3);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.25);
    transition:
      opacity 0.35s ease 0.3s,
      transform 0.8s cubic-bezier(0.12, 1.25, 0.3, 1) 0.3s;
  }
  .magic-glow.visible {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    animation: glow-breathe 1.2s ease-in-out 1.05s infinite alternate;
  }
  .magic-glow.gold {
    background: radial-gradient(circle, rgb(255 246 166 / 0.9) 0%, rgb(250 204 21 / 0.38) 42%, transparent 70%);
  }
  .rays {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1;
    width: 350px;
    height: 350px;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
    transition:
      opacity 0.25s ease,
      transform 0.65s cubic-bezier(0.12, 1.25, 0.3, 1);
  }
  .rays.visible {
    opacity: 0.82;
    transform: translate(-50%, -50%) scale(1);
    animation: ray-spin 12s linear infinite;
  }
  .rays span {
    position: absolute;
    left: calc(50% - 7px);
    top: 50%;
    width: 18px;
    height: 175px;
    border-radius: 999px;
    background: linear-gradient(to top, rgb(253 224 71 / 0.85), transparent);
    transform-origin: 50% 0;
    transform: rotate(var(--ray));
  }
  .rays.gold span {
    background: linear-gradient(to top, rgb(255 246 166 / 0.95), transparent);
  }
  .magic-sparkles {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 15;
    width: 20px;
    height: 20px;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -50%);
  }
  .magic-sparkles.visible {
    opacity: 1;
  }
  .magic-sparkles span {
    position: absolute;
    left: 0;
    top: 0;
    color: #fef08a;
    font-size: 28px;
    text-shadow: 0 2px 8px rgb(245 158 11 / 0.7);
    opacity: 0;
    animation: sparkle-fly 0.9s cubic-bezier(0.12, 0.75, 0.25, 1) var(--spark-delay) both;
  }
  .hint {
    top: calc(50% + 125px);
    animation: hint-pulse 1.1s ease-in-out infinite;
    text-shadow: 0 3px 12px rgb(0 0 0 / 0.45);
  }
  .save-button {
    animation: save-arrive 0.45s cubic-bezier(0.12, 1.3, 0.3, 1) both;
  }
  .reward-title {
    top: -52px;
    transform: translateX(-50%);
    text-shadow:
      0 3px 0 rgb(180 83 9 / 0.9),
      0 7px 20px rgb(0 0 0 / 0.5);
    animation: title-pop 0.55s cubic-bezier(0.12, 1.35, 0.3, 1) both;
  }
  @keyframes chest-idle {
    0%,
    100% {
      transform: translate(-50%, -50%) rotate(-1deg);
    }
    50% {
      transform: translate(-50%, calc(-50% - 9px)) rotate(1deg);
    }
  }
  @keyframes chest-open {
    0% {
      transform: translate(-50%, -50%) rotate(0) scale(1);
    }
    18% {
      transform: translate(-50%, calc(-50% + 3px)) rotate(-3deg) scale(1.03, 0.97);
    }
    32% {
      transform: translate(-50%, calc(-50% - 4px)) rotate(3deg) scale(1.02);
    }
    46% {
      transform: translate(-50%, calc(-50% + 9px)) rotate(-1deg) scale(1.08, 0.92);
    }
    62% {
      transform: translate(-50%, calc(-50% - 20px)) rotate(0) scale(0.98, 1.07);
    }
    82% {
      transform: translate(-50%, calc(-50% + 108px)) scale(1.02, 0.98);
    }
    100% {
      transform: translate(-50%, calc(-50% + 98px)) scale(1);
    }
  }
  @keyframes base-pop {
    0%,
    45% {
      transform: scale(1);
    }
    62% {
      transform: scale(1.04, 0.93);
    }
    78% {
      transform: scale(0.98, 1.03);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes treasure-pulse {
    from {
      opacity: 0.3;
    }
    to {
      opacity: 0.72;
    }
  }
  @keyframes glow-breathe {
    from {
      opacity: 0.72;
      transform: translate(-50%, -50%) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.08);
    }
  }
  @keyframes ray-spin {
    to {
      transform: translate(-50%, -50%) scale(1) rotate(360deg);
    }
  }
  @keyframes sparkle-fly {
    0% {
      opacity: 0;
      transform: rotate(var(--spark-angle)) translateY(0) scale(0);
    }
    28% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(var(--spark-angle)) translateY(-165px) scale(1.15);
    }
  }
  @keyframes save-arrive {
    from {
      opacity: 0;
      transform: translate(-50%, 18px) scale(0.8);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0) scale(1);
    }
  }
  @keyframes title-pop {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(16px) scale(0.65) rotate(-3deg);
    }
    70% {
      transform: translateX(-50%) translateY(-3px) scale(1.08) rotate(1deg);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1) rotate(0);
    }
  }
  @keyframes hint-pulse {
    0%,
    100% {
      transform: translateX(-50%) scale(1);
    }
    50% {
      transform: translateX(-50%) scale(1.08);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .chest,
    .chest.opened,
    .hint {
      animation: none;
    }
    .chest,
    .chest.opened {
      transform: translate(-50%, calc(-50% + 98px));
    }
    .opened .chest-lid {
      transform: translateY(-62px) rotate(-8deg);
      transition: none;
    }
    .opened .chest-cavity {
      opacity: 1;
      transform: none;
      transition: none;
    }
    .sticker {
      transform: translate(-50%, -250px) scale(1);
      transition: opacity 0.25s ease;
    }
    .magic-glow,
    .rays,
    .magic-sparkles span,
    .save-button,
    .reward-title {
      animation: none;
    }
  }
</style>
