<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onDestroy, onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import {
    BONUS_POOL,
    STICKER_PAGES,
    STICKER_TOTAL,
    TROPHIES,
    isCreatureSticker,
    stickerAudioBucket
  } from '$lib/content/stickers.js';
  import { player } from '$lib/audio/player.svelte.js';

  const sections = [
    ...STICKER_PAGES,
    { id: 'bonus', title: '🎁 Bonus', stickers: BONUS_POOL },
    { id: 'trophy', title: '🏆 Piala', stickers: TROPHIES }
  ];

  let photoFailed = $state(/** @type {Set<string>} */ (new Set()));
  let silhouetteFailed = $state(/** @type {Set<string>} */ (new Set()));
  let poppedId = $state('');
  /** @type {import('$lib/content/stickers.js').Sticker|null} */
  let selectedSticker = $state(null);
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let popTimer;

  const active = $derived(profiles.active);
  const owned = $derived(new Set(profiles.stickers));
  const voiceId = $derived(active?.voiceId ?? 'ibu-dewi');

  onMount(() => {
    if (!profiles.active) {
      goto(`${base}/`);
      return;
    }
    profiles.markStickersSeen();
    Promise.allSettled([
      player.ensureLevel(voiceId, 'words'),
      player.ensureLevel(voiceId, 'abjad'),
      player.ensureLevel(voiceId, 3),
      player.ensureLevel(voiceId, 8),
      player.ensureLevel(voiceId, 9)
    ]);
  });

  onDestroy(() => {
    clearTimeout(popTimer);
    player.stop();
  });

  /** @param {string} id */
  function failPhoto(id) {
    photoFailed = new Set([...photoFailed, id]);
  }

  /** @param {string} id */
  function failSilhouette(id) {
    silhouetteFailed = new Set([...silhouetteFailed, id]);
  }

  /** @param {import('$lib/content/stickers.js').Sticker} sticker */
  async function tapSticker(sticker) {
    clearTimeout(popTimer);
    poppedId = '';
    requestAnimationFrame(() => {
      poppedId = sticker.id;
      popTimer = setTimeout(() => (poppedId = ''), 420);
    });
    selectedSticker = sticker;
    if (!sticker.talks) return;
    const bucket = stickerAudioBucket(sticker);
    await player.ensureLevel(voiceId, bucket);
    await player.speak(voiceId, bucket, sticker.id);
  }
</script>

<svelte:head><title>Buku Stiker · Ayo Belajar Membaca</title></svelte:head>

{#if active}
  <header class="mb-5 flex items-center justify-between">
    <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
    <h1 class="text-xl font-black text-rose-600">📒 Buku Stiker</h1>
    <span class="rounded-full bg-rose-100 px-3 py-1 text-sm font-black text-rose-600">
      {profiles.stickers.length}/{STICKER_TOTAL}
    </span>
  </header>

  <div class="grid gap-7 pb-8">
    {#each sections as section (section.id)}
      {@const sectionOwned = section.stickers.filter((sticker) => owned.has(sticker.id)).length}
      <section>
        <div class="mb-3 flex items-end justify-between gap-3">
          <h2 class="font-black text-slate-700">{section.title}</h2>
          <span class="text-xs font-bold text-slate-400">{sectionOwned}/{section.stickers.length}</span>
        </div>
        <div class="grid grid-cols-4 gap-3">
          {#each section.stickers as sticker (sticker.id)}
            {@const collected = owned.has(sticker.id)}
            {#if collected}
              <button
                type="button"
                onclick={() => tapSticker(sticker)}
                class:sticker-pop={poppedId === sticker.id}
                class="min-w-0 text-center active:scale-95"
                aria-label={`${sticker.label}, lihat gambar besar${sticker.talks ? ' dan dengarkan namanya' : ''}`}
              >
                <span class="block aspect-square overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md">
                  {#if !photoFailed.has(sticker.id)}
                    <img
                      src={`${base}${sticker.img}`}
                      alt={sticker.label}
                      onerror={() => failPhoto(sticker.id)}
                      class="h-full w-full object-cover"
                    />
                  {:else if isCreatureSticker(sticker.id) && !silhouetteFailed.has(sticker.id)}
                    <img
                      src={`${base}${sticker.sil}`}
                      alt={sticker.label}
                      onerror={() => failSilhouette(sticker.id)}
                      class="h-full w-full object-contain p-1"
                    />
                  {:else}
                    <span class="grid h-full place-items-center bg-slate-100 text-3xl" aria-hidden="true">{sticker.emoji}</span>
                  {/if}
                </span>
                <span class="mt-1 block truncate text-[11px] font-black text-slate-600 sm:text-sm">{sticker.label}</span>
              </button>
            {:else}
              <div class="min-w-0" aria-label="Stiker belum terbuka">
                <span class="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-slate-200 shadow-inner">
                  {#if !silhouetteFailed.has(sticker.id)}
                    <img
                      src={`${base}${sticker.sil}`}
                      alt=""
                      onerror={() => failSilhouette(sticker.id)}
                      class="h-full w-full object-contain p-2 opacity-35"
                    />
                  {:else}
                    <span class="text-3xl font-black text-slate-400" aria-hidden="true">❓</span>
                  {/if}
                </span>
                <span class="mt-1 block h-4" aria-hidden="true"></span>
              </div>
            {/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>

  {#if selectedSticker}
    {@const detail = selectedSticker}
    <div
      class="fixed inset-0 z-40 grid place-items-center bg-slate-950/80 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Gambar stiker ${detail.label}`}
      tabindex="-1"
    >
      <div class="w-full max-w-lg rounded-[2rem] bg-white p-4 text-center shadow-2xl">
        <div class="grid aspect-square max-h-[70vh] place-items-center overflow-hidden rounded-3xl bg-slate-100">
          {#if !photoFailed.has(detail.id)}
            <img
              src={`${base}${detail.img}`}
              alt={detail.label}
              onerror={() => failPhoto(detail.id)}
              class="h-full w-full object-contain"
            />
          {:else if isCreatureSticker(detail.id) && !silhouetteFailed.has(detail.id)}
            <img
              src={`${base}${detail.sil}`}
              alt={detail.label}
              onerror={() => failSilhouette(detail.id)}
              class="h-full w-full object-contain p-4"
            />
          {:else}
            <span class="text-8xl" aria-label={detail.label}>{detail.emoji}</span>
          {/if}
        </div>
        <h2 class="mt-3 text-2xl font-black text-slate-800">{detail.label}</h2>
        <button
          type="button"
          onclick={() => (selectedSticker = null)}
          class="mt-3 rounded-full bg-rose-500 px-8 py-3 font-black text-white active:scale-95"
        >
          Tutup
        </button>
      </div>
    </div>
  {/if}
{/if}

<style>
  .sticker-pop {
    animation: sticker-pop 0.4s cubic-bezier(0.2, 1.4, 0.4, 1);
  }
  @keyframes sticker-pop {
    0%,
    100% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.16) rotate(-3deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sticker-pop {
      animation: none;
    }
  }
</style>
