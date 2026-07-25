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
        await player.speak(voiceId, 'words', sticker.label).catch(() => {});
      }
    })();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
  onpointerdown={openChest}
  transition:fade={{ duration: reducedMotion ? 0 : 200 }}
>
  <Confetti bind:this={confetti} />

  <div class="relative flex h-full w-full flex-col items-center justify-center">
    {#if revealState === 'idle' && !reducedMotion}
      <div class="absolute top-[20%] animate-pulse text-2xl font-black text-white text-shadow-md">
        Buka! ✨
      </div>
    {/if}

    <div class="relative flex items-center justify-center">
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

      <!-- Sticker foil pack (closed state) -->
      {#if revealState !== 'open'}
        <button
          class="relative flex h-60 w-44 flex-col items-center justify-center overflow-hidden rounded-2xl border-4 border-white/30 bg-gradient-to-br {isRare ? 'from-yellow-300 via-amber-500 to-yellow-600' : 'from-indigo-400 via-purple-500 to-pink-600'} shadow-2xl {revealState === 'idle' && !reducedMotion ? 'animate-bob' : ''} {revealState === 'opening' ? 'animate-shake' : ''}"
          onclick={openChest}
          out:scale={{ duration: reducedMotion ? 0 : 300, easing: backOut }}
        >
          <!-- Shimmer effect -->
          <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-50" style="background-size: 200% 200%; {revealState === 'opening' ? 'animation: shimmer 0.3s linear infinite' : ''}"></div>
          
          <div class="text-6xl drop-shadow-md">✨</div>
          <div class="mt-4 text-2xl font-black text-white drop-shadow-md">Stiker!</div>
        </button>
      {/if}

      <!-- Sticker photo popping out (open state) -->
      {#if revealState === 'open'}
        <div 
          class="flex w-56 flex-col items-center gap-4"
          in:scale={{ duration: reducedMotion ? 0 : 700, easing: backOut, start: reducedMotion ? 0.9 : 0 }}
        >
          <div class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl ring-4 {isRare ? 'ring-amber-400' : 'ring-white'}">
            {#if imgLoaded}
              <img src={sticker.img} alt={sticker.label} class="h-full w-full object-cover" />
            {/if}
          </div>
          <span class="rounded-xl bg-white px-5 py-2 text-2xl font-black text-slate-800 shadow-lg">
            {sticker.label}
          </span>
        </div>
      {/if}
    </div>
    
    <!-- Close Button - only show when open -->
    {#if revealState === 'open'}
      <button 
        class="absolute bottom-12 rounded-full bg-white/20 px-8 py-3 text-lg font-bold text-white shadow-lg backdrop-blur-md hover:bg-white/30 active:scale-95"
        onclick={onclose}
        in:fade={{ duration: reducedMotion ? 0 : 300, delay: reducedMotion ? 0 : 600 }}
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
  @keyframes shake {
    0%, 100% { transform: rotate(0) scale(1.05); }
    25% { transform: rotate(-5deg) scale(1.05); }
    50% { transform: rotate(5deg) scale(1.05); }
    75% { transform: rotate(-5deg) scale(1.05); }
  }
  .animate-shake {
    animation: shake 0.2s ease-in-out infinite;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes spin-slow {
    100% { transform: rotate(360deg); }
  }
  .animate-spin-slow {
    animation: spin-slow 12s linear infinite;
  }
</style>
