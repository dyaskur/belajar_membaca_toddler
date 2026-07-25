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
    revealTimer = setTimeout(() => (revealed = true), 260);
    announce(true);
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
    <div class="stage relative h-[430px] w-full max-w-[360px] text-center">
      <div class:visible={opened} class:gold={sticker.rare} class="rays absolute left-1/2 top-5 h-64 w-64 -translate-x-1/2" aria-hidden="true">
        {#each Array(12) as _, i}
          <span style={`--ray:${i * 30}deg`}></span>
        {/each}
      </div>

      <div class:shown={revealed} class="sticker absolute left-1/2 top-4 z-10 w-52 -translate-x-1/2">
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
        class="chest absolute bottom-12 left-1/2 h-52 w-72 -translate-x-1/2 select-none rounded-3xl focus-visible:outline-4 focus-visible:outline-white"
        onpointerdown={open}
        onclick={open}
        aria-label={opened ? `Peti terbuka, ${sticker.label}` : 'Buka peti stiker'}
      >
        <svg viewBox="0 0 320 220" class="h-full w-full overflow-visible drop-shadow-2xl" aria-hidden="true">
          <g class="chest-lid">
            <path class="lid-main" d="M38 104V78c0-36 28-60 65-60h114c37 0 65 24 65 60v26z" />
            <path class="lid-band" d="M38 79h244v27H38z" />
            <path class="metal" d="M145 18h30v88h-30z" />
            <path class="shine" d="M57 70c5-22 21-35 47-39h28v12h-25c-19 2-31 12-36 27z" />
          </g>
          <g class="chest-base">
            <path class="base-main" d="M34 102h252v91c0 10-8 18-18 18H52c-10 0-18-8-18-18z" />
            <path class="base-band" d="M34 111h252v26H34z" />
            <path class="metal" d="M145 102h30v109h-30z" />
            <rect class="lock" x="139" y="122" width="42" height="48" rx="9" />
            <circle class="keyhole" cx="160" cy="141" r="6" />
            <path class="keyhole" d="M155 145h10l4 15h-18z" />
            <path class="shine" d="M52 150v36c0 5 4 9 9 9h57v-11H68c-3 0-5-2-5-5v-29z" />
          </g>
        </svg>
      </button>

      {#if !opened}
        <p class="hint absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-2xl font-black text-white">
          Buka! ✨
        </p>
      {:else if revealed}
        <button
          type="button"
          onclick={close}
          class="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-8 py-3 text-lg font-black text-rose-600 shadow-xl active:scale-95"
        >
          Simpan di album
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .chest {
    animation: bob 1.8s ease-in-out infinite;
    perspective: 700px;
    touch-action: none;
  }
  .chest-lid {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    transition: transform 0.72s cubic-bezier(0.16, 0.8, 0.25, 1.22);
  }
  .opened .chest-lid {
    transform: translateY(-7px) rotateX(-116deg);
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
  .metal,
  .lock {
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
  .rare .metal,
  .rare .lock {
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
    opacity: 0;
    transform: translate(-50%, 150px) scale(0);
    transition:
      transform 0.7s cubic-bezier(0.14, 1.45, 0.35, 1),
      opacity 0.25s ease;
  }
  .sticker.shown {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
  .rays {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .rays.visible {
    opacity: 0.9;
  }
  .rays span {
    position: absolute;
    left: calc(50% - 7px);
    top: 50%;
    width: 14px;
    height: 130px;
    border-radius: 999px;
    background: linear-gradient(to top, rgb(253 224 71 / 0.85), transparent);
    transform-origin: 50% 0;
    transform: rotate(var(--ray));
  }
  .rays.gold span {
    background: linear-gradient(to top, rgb(255 246 166 / 0.95), transparent);
  }
  .hint {
    animation: hint-pulse 1.1s ease-in-out infinite;
  }
  @keyframes bob {
    0%,
    100% {
      transform: translateX(-50%) translateY(0);
    }
    50% {
      transform: translateX(-50%) translateY(-9px);
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
    .hint {
      animation: none;
    }
    .chest-lid {
      transform: translateY(-7px) rotateX(-116deg);
      transition: none;
    }
    .sticker {
      transform: translate(-50%, 0) scale(1);
      transition: opacity 0.25s ease;
    }
  }
</style>
