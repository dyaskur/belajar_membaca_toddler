<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { STICKERS, STICKER_TOTAL, ALBUM_SECTIONS, stickersForSection } from '$lib/content/stickers.js';

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const owned = $derived(new Set(profiles.stickers));
  const total = $derived(STICKERS.length);

  /** ids whose static image 404'd — shown with the emoji fallback instead. */
  let brokenImg = $state(/** @type {Set<string>} */ (new Set()));
  let brokenSil = $state(/** @type {Set<string>} */ (new Set()));

  onMount(() => {
    if (!profiles.active) return goto(`${base}/`);
    profiles.markStickersSeen();
    player.ensureLevel(voiceId, 'words');
  });

  /** @param {import('$lib/content/stickers.js').Sticker} sticker */
  function tap(sticker) {
    if (!owned.has(sticker.id)) return;
    const bucket = sticker.bucket;
    if (sticker.talks && bucket !== undefined) {
      player.ensureLevel(voiceId, bucket).then(() => player.speak(voiceId, bucket, sticker.label));
    }
  }
</script>

{#if profiles.active}
  <header class="mb-5 flex items-center justify-between">
    <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
    <span class="font-black text-slate-600">📒 Buku Stiker</span>
    <span class="text-sm font-bold text-slate-400">{owned.size}/{total}</span>
  </header>

  <div class="grid gap-7 pb-8">
    {#each ALBUM_SECTIONS as section (section.key)}
      {@const items = stickersForSection(section.key)}
      {@const got = items.filter((s) => owned.has(s.id)).length}
      {#if items.length}
        <section>
          <h2 class="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-400">
            <span class="text-lg">{section.icon}</span>
            {section.title}
            <span class="ml-auto normal-case text-slate-300">{got}/{items.length}</span>
          </h2>
          <div class="grid grid-cols-4 gap-3">
            {#each items as sticker (sticker.id)}
              {@const have = owned.has(sticker.id)}
              <button
                type="button"
                onclick={() => tap(sticker)}
                disabled={!have}
                class="tile relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl shadow active:scale-95 {have
                  ? 'bg-white'
                  : 'bg-slate-100'}"
              >
                {#if have}
                  {#if !brokenImg.has(sticker.id)}
                    <img
                      src="{base}{sticker.img}"
                      alt={sticker.label}
                      loading="lazy"
                      class="h-full w-full object-cover"
                      onerror={() => (brokenImg = new Set([...brokenImg, sticker.id]))}
                    />
                  {:else}
                    <span class="text-4xl">{sticker.emoji}</span>
                  {/if}
                  <span
                    class="absolute inset-x-0 bottom-0 truncate bg-slate-900/55 px-1 py-0.5 text-[11px] font-bold capitalize text-white"
                    >{sticker.label}</span
                  >
                {:else if !brokenSil.has(sticker.id)}
                  <img
                    src="{base}{sticker.sil}"
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    class="h-full w-full object-cover opacity-35"
                    onerror={() => (brokenSil = new Set([...brokenSil, sticker.id]))}
                  />
                {:else}
                  <span class="text-3xl text-slate-300">❓</span>
                {/if}
              </button>
            {/each}
          </div>
        </section>
      {/if}
    {/each}
  </div>
{/if}
