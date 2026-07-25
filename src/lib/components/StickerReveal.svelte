<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import Confetti from './Confetti.svelte';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect } from '$lib/audio/sfx.js';
  import { STICKER_NEW } from '$lib/content/feedback.js';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { getLevel } from '$lib/content/levels.js';

  /** 
   * @typedef {Object} Props
   * @property {NonNullable<ReturnType<typeof import('$lib/content/stickers.js').getSticker>>} sticker
   * @property {() => void} onclose
   */

  /** @type {Props} */
  let { sticker, onclose } = $props();

  /** @type {'idle'|'opening'|'open'} */
  let revealState = $state('idle');
  /** @type {Confetti|undefined} */
  let confetti = $state();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer = undefined;
  let imgLoaded = $state(false);

  // If the user prefers reduced motion, skip animations and show it already open.
  const reducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const isRare = $derived(sticker.rare);
  const voiceId = profiles.active?.voiceId ?? 'ibu-dewi';

  // Determine the audio bucket for the sticker label if it talks
  // We can just use level 3 (words) bucket, or level 8/9.
  // Actually, we'll try bucket 'words'.
  const bucket = 'words';

  onMount(() => {
    // Preload the image
    const img = new Image();
    img.src = sticker.img;
    img.onload = () => { imgLoaded = true; };

    if (reducedMotion) {
      revealState = 'open';
      triggerEffects();
    } else {
      timer = setTimeout(openChest, 3000);
    }
  });

  onDestroy(() => {
    clearTimeout(timer);
  });

  function openChest() {
    if (revealState !== 'idle') return;
    clearTimeout(timer);
    revealState = 'opening';
    setTimeout(() => {
      revealState = 'open';
      triggerEffects();
    }, 400); // Wait for the lid to rotate back
  }

  function triggerEffects() {
    chimeCorrect();
    if (!reducedMotion && confetti) {
      confetti.fire(isRare ? 90 : 60);
    }
    
    // Play voiceover
    // Praise then sticker name if it talks
    (async () => {
      await player.speak(voiceId, 1, STICKER_NEW);
      if (sticker.talks) {
        // Find which bucket it is in. It's either 3, 4, 8, 9, or 'words' (for picture words).
        // `player.svelte.js` usually handles words via 'words' or their respective level.
        // If it's a specific taught word, let's just pass 'words' or the ID as text.
        // Actually, player.speak(voiceId, bucket, text) - if we don't know the exact level bucket, 
        // we can try 'words'. Wait, let's just speak the text and let it fall back.
        // 'words' is usually safe for picture words.
        await player.speak(voiceId, 'words', sticker.id.replace('trofi-', 'trofi ')).catch(() => {});
      }
    })();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
  onpointerdown={openChest}
  transition:fade={{ duration: 200 }}
>
  <Confetti bind:this={confetti} />

  <div class="relative flex h-full w-full flex-col items-center justify-center">
    {#if revealState === 'idle' && !reducedMotion}
      <div class="absolute top-[20%] animate-pulse text-2xl font-black text-white text-shadow-md">
        Buka! ✨
      </div>
    {/if}

    <div class="relative {revealState === 'idle' && !reducedMotion ? 'animate-bob' : ''}">
      
      <!-- Rays burst when open -->
      {#if revealState === 'open' && !reducedMotion}
        <div class="absolute left-1/2 top-1/2 -z-10 -ml-[250px] -mt-[250px] h-[500px] w-[500px] animate-spin-slow">
          <svg viewBox="0 0 100 100" class={isRare ? 'fill-amber-400/40' : 'fill-white/20'}>
            {#each Array(12) as _, i}
              <polygon points="50,50 40,0 60,0" transform="rotate({i * 30} 50 50)" />
            {/each}
          </svg>
        </div>
      {/if}

      <!-- Sticker photo popping out -->
      {#if revealState === 'open'}
        <div 
          class="absolute left-1/2 top-[-140px] -ml-24 flex w-48 flex-col items-center gap-2"
          in:scale={{ duration: reducedMotion ? 400 : 600, easing: backOut, start: reducedMotion ? 0.9 : 0 }}
        >
          <div class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl ring-4 {isRare ? 'ring-amber-400' : 'ring-white'}">
            {#if imgLoaded}
              <img src={sticker.img} alt={sticker.label} class="h-full w-full object-cover" />
            {/if}
          </div>
          <span class="rounded-xl bg-white px-4 py-1.5 text-xl font-black text-slate-800 shadow-lg">
            {sticker.label}
          </span>
        </div>
      {/if}

      <!-- The Chest SVG -->
      <svg 
        width="200" 
        height="180" 
        viewBox="0 0 200 180" 
        class="chest-svg relative z-10 drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="wood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#8B4513" />
            <stop offset="100%" stop-color="#5C2E0B" />
          </linearGradient>
          <linearGradient id="gold-wood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFD700" />
            <stop offset="100%" stop-color="#DAA520" />
          </linearGradient>
          <linearGradient id="metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#B0C4DE" />
            <stop offset="100%" stop-color="#778899" />
          </linearGradient>
          <linearGradient id="gold-metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFF8DC" />
            <stop offset="100%" stop-color="#F0E68C" />
          </linearGradient>
          <!-- Inner darkness -->
          <linearGradient id="dark-inside" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#222" />
            <stop offset="100%" stop-color="#000" />
          </linearGradient>
        </defs>

        <!-- Inside of the chest (visible when lid is open) -->
        <path d="M 20 100 L 180 100 L 170 170 L 30 170 Z" fill="url(#dark-inside)" />

        <!-- Chest Base -->
        <g class="chest-base">
          <path d="M 20 100 L 180 100 L 170 170 L 30 170 Z" fill={isRare ? "url(#gold-wood)" : "url(#wood)"} />
          <!-- Bands -->
          <rect x="40" y="100" width="15" height="65" fill={isRare ? "url(#gold-metal)" : "url(#metal)"} />
          <rect x="145" y="100" width="15" height="65" fill={isRare ? "url(#gold-metal)" : "url(#metal)"} />
          <path d="M 20 100 L 180 100 L 180 110 L 20 110 Z" fill={isRare ? "url(#gold-metal)" : "url(#metal)"} />
          <path d="M 30 170 L 170 170 L 170 160 L 30 160 Z" fill={isRare ? "url(#gold-metal)" : "url(#metal)"} />
        </g>

        <!-- Chest Lid -->
        <!-- Rotate lid back 105 degrees around its hinge (back edge at y=100) -->
        <g 
          class="chest-lid" 
          style="transform-origin: center 100px; transform: {revealState !== 'idle' ? 'rotateX(105deg)' : 'none'}; transition: transform 0.4s ease-in;"
        >
          <!-- Dome -->
          <path d="M 20 100 C 20 40 180 40 180 100 Z" fill={isRare ? "url(#gold-wood)" : "url(#wood)"} />
          <!-- Bands -->
          <path d="M 40 100 C 40 50 60 45 60 100 Z" fill={isRare ? "url(#gold-metal)" : "url(#metal)"} opacity="0.8" />
          <path d="M 145 100 C 145 50 165 45 165 100 Z" fill={isRare ? "url(#gold-metal)" : "url(#metal)"} opacity="0.8" />
          <!-- Lock -->
          <circle cx="100" cy="95" r="15" fill={isRare ? "url(#gold-metal)" : "url(#metal)"} />
          <circle cx="100" cy="95" r="8" fill="#333" />
          <rect x="96" y="95" width="8" height="12" fill="#333" />
        </g>
      </svg>
    </div>
    
    <!-- Close Button - only show when open -->
    {#if revealState === 'open'}
      <button 
        class="absolute bottom-12 rounded-full bg-white/20 px-8 py-3 text-lg font-bold text-white shadow-lg backdrop-blur-md hover:bg-white/30 active:scale-95"
        onclick={onclose}
        in:fade={{ duration: 300, delay: 500 }}
      >
        Tutup
      </button>
    {/if}
  </div>
</div>

<style>
  .text-shadow-md {
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }
  @keyframes bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .animate-bob {
    animation: bob 2s ease-in-out infinite;
  }
  @keyframes spin-slow {
    100% { transform: rotate(360deg); }
  }
  .animate-spin-slow {
    animation: spin-slow 12s linear infinite;
  }
  .chest-lid {
    transform-style: preserve-3d;
  }
</style>
