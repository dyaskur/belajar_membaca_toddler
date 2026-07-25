<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { STICKERS, STICKER_TOTAL } from '$lib/content/stickers.js';
  import { player } from '$lib/audio/player.svelte.js';

  // Group stickers by section
  const sections = [];
  /** @type {Map<string, NonNullable<ReturnType<typeof import('$lib/content/stickers.js').getSticker>>[]>} */
  const sectionMap = new Map();
  for (const s of STICKERS) {
    let arr = sectionMap.get(s.section);
    if (!arr) {
      arr = [];
      sectionMap.set(s.section, arr);
      sections.push(s.section);
    }
    arr.push(s);
  }

  // Desired order of sections: curriculum levels first, then Bonus, then Piala.
  const orderedSections = sections.sort((a, b) => {
    if (a === 'Bonus') return 1;
    if (b === 'Bonus') return -1;
    if (a === 'Piala') return 1;
    if (b === 'Piala') return -1;
    return a.localeCompare(b);
  });

  const myStickers = $derived(profiles.stickers);
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');

  /** @type {NonNullable<ReturnType<typeof import('$lib/content/stickers.js').getSticker>>|null} */
  let selectedSticker = $state(null);

  onMount(() => {
    if (!profiles.active) {
      goto(`${base}/`);
      return;
    }
    profiles.markStickersSeen();
    player.ensureLevel(voiceId, 'words').catch(() => {});
  });

  /** @param {NonNullable<ReturnType<typeof import('$lib/content/stickers.js').getSticker>>} sticker */
  function tapSticker(sticker) {
    if (!myStickers.includes(sticker.id)) return;
    selectedSticker = sticker;
    
    // Tiny pop animation on the clicked element
    const el = document.getElementById(`st-${sticker.id}`);
    if (el) {
      el.classList.remove('animate-pop');
      void el.offsetWidth; // trigger reflow
      el.classList.add('animate-pop');
    }

    // Play voiceover
    if (sticker.talks) {
      player.speak(voiceId, 'words', sticker.id.replace('trofi-', 'trofi ')).catch(() => {});
    }
  }
</script>

<svelte:head>
  <title>Buku Stiker - Ayo Belajar Membaca</title>
</svelte:head>

<div class="flex h-full flex-col p-4 sm:p-6 pb-20">
  <header class="mb-6 flex items-center justify-between">
    <button onclick={() => goto(`${base}/belajar`)} class="text-2xl active:scale-95" aria-label="Kembali">⬅️</button>
    <h1 class="text-2xl font-black text-slate-700">📒 Buku Stiker</h1>
    <span class="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700 shadow-sm">
      {myStickers.length}/{STICKER_TOTAL}
    </span>
  </header>

  <div class="flex-1 overflow-y-auto space-y-8">
    {#each orderedSections as sectionTitle}
      {@const sectionStickers = sectionMap.get(sectionTitle) ?? []}
      {@const sectionCollected = sectionStickers.filter(s => myStickers.includes(s.id)).length}
      
      <section>
        <div class="mb-3 flex items-center justify-between border-b-2 border-slate-200 pb-2">
          <h2 class="text-lg font-bold text-slate-600">{sectionTitle}</h2>
          <span class="text-sm font-bold text-slate-400">{sectionCollected}/{sectionStickers.length}</span>
        </div>
        
        <div class="grid grid-cols-4 gap-3 sm:gap-4">
          {#each sectionStickers as sticker}
            {@const collected = myStickers.includes(sticker.id)}
            
            {#if collected}
              <!-- Collected: Uncut photo + label -->
              <button 
                id="st-{sticker.id}"
                class="flex flex-col items-center gap-1 active:scale-95"
                onclick={() => tapSticker(sticker)}
              >
                <div class="relative aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-md ring-2 ring-slate-100">
                  <img src={sticker.img} alt={sticker.label} class="h-full w-full object-cover" />
                </div>
                <span class="text-xs font-bold text-slate-700 sm:text-sm">{sticker.label}</span>
              </button>
            {:else}
              <!-- Locked: Silhouette on slate tile -->
              <div class="flex flex-col items-center gap-1">
                <div class="relative flex aspect-square w-full items-center justify-center rounded-2xl bg-slate-200 shadow-inner">
                  <img 
                    src={sticker.sil} 
                    alt="Terkunci" 
                    class="h-full w-full object-contain p-2 opacity-35"
                    onerror={(e) => { 
                      const el = /** @type {HTMLElement} */ (e.currentTarget);
                      el.style.display = 'none'; 
                      if (el.nextElementSibling) {
                        /** @type {HTMLElement} */ (el.nextElementSibling).style.display = 'block';
                      }
                    }} 
                  />
                  <!-- Fallback if silhouette missing -->
                  <span class="hidden text-3xl opacity-35" aria-hidden="true">❓</span>
                </div>
                <!-- Empty space to align with collected labels -->
                <span class="text-xs text-transparent sm:text-sm" aria-hidden="true">_</span>
              </div>
            {/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>

{#if selectedSticker}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
    onclick={() => selectedSticker = null}
    transition:fade={{ duration: 200 }}
  >
    <div 
      class="relative flex w-full max-w-sm flex-col items-center justify-center" 
      onclick={(e) => e.stopPropagation()}
    >
      <div class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl ring-4 {selectedSticker.rare ? 'ring-amber-400' : 'ring-white'}">
        <img src={selectedSticker.img} alt={selectedSticker.label} class="h-full w-full object-cover" />
      </div>
      <span class="mt-4 rounded-xl bg-white px-5 py-2 text-3xl font-black text-slate-800 shadow-lg text-center">
        {selectedSticker.label}
      </span>
      <button 
        class="mt-8 rounded-full bg-white/20 px-8 py-3 text-lg font-bold text-white shadow-lg backdrop-blur-md hover:bg-white/30 active:scale-95"
        onclick={() => selectedSticker = null}
      >
        Tutup
      </button>
    </div>
  </div>
{/if}

<style>
  :global(.animate-pop) {
    animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  @keyframes pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
</style>
