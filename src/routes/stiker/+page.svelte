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
  /** The collected sticker currently shown full-size, or null. */
  let viewing = $state(/** @type {import('$lib/content/stickers.js').Sticker|null} */ (null));
  /** @type {HTMLDivElement|undefined} */
  let viewerEl = $state();
  /** The tile that opened the viewer, so closing can hand focus back to it. */
  let returnFocusTo = /** @type {HTMLElement|null} */ (null);

  onMount(() => {
    if (!profiles.active) return goto(`${base}/`);
    // Each sticker clears its own "BARU" badge when it's individually opened below —
    // merely visiting the album no longer clears them in bulk.
    player.ensureLevel(voiceId, 'words');
  });

  $effect(() => {
    // aria-modal doesn't move focus by itself — without this, Escape/Tab never
    // reach the dialog because focus stays on the (now-hidden) trigger tile.
    if (viewing) viewerEl?.focus();
  });

  /** @param {import('$lib/content/stickers.js').Sticker} sticker */
  function speakSticker(sticker) {
    const bucket = sticker.bucket;
    if (sticker.talks && bucket !== undefined) {
      player.ensureLevel(voiceId, bucket).then(() => player.speak(voiceId, bucket, sticker.label));
    }
  }

  /**
   * Tapping an owned tile opens it full-size and speaks it.
   * @param {import('$lib/content/stickers.js').Sticker} sticker @param {MouseEvent} event
   */
  function tap(sticker, event) {
    if (!owned.has(sticker.id)) return;
    returnFocusTo = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    viewing = sticker;
    profiles.markStickerSeen(sticker.id);
    speakSticker(sticker);
  }

  function closeViewer() {
    viewing = null;
    returnFocusTo?.focus();
    returnFocusTo = null;
  }

  /** @param {KeyboardEvent} event */
  function viewerKeydown(event) {
    if (event.key === 'Escape') {
      closeViewer();
      return;
    }
    if (event.key !== 'Tab' || !viewerEl) return;
    const focusables = [...viewerEl.querySelectorAll('button')];
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
              {@const isNew = have && !profiles.isStickerSeen(sticker.id)}
              <button
                type="button"
                onclick={(e) => tap(sticker, e)}
                disabled={!have}
                class="tile relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl shadow active:scale-95 {have
                  ? 'bg-white'
                  : 'bg-slate-100'}"
              >
                {#if isNew}
                  <span
                    class="absolute right-1 top-1 z-10 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white shadow"
                    >BARU</span
                  >
                {/if}
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

  {#if viewing}
    {@const v = viewing}
    <div
      class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-900/80 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={v.label}
      tabindex="-1"
      bind:this={viewerEl}
      onkeydown={viewerKeydown}
      onclick={closeViewer}
    >
      <button
        type="button"
        class="max-h-[70vh] max-w-full overflow-hidden rounded-3xl bg-white shadow-2xl"
        onclick={(e) => {
          e.stopPropagation();
          speakSticker(v);
        }}
      >
        {#if !brokenImg.has(v.id)}
          <img src="{base}{v.img}" alt={v.label} class="max-h-[70vh] w-auto object-contain" />
        {:else}
          <span class="grid h-52 w-52 place-items-center text-7xl">{v.emoji}</span>
        {/if}
      </button>
      <span class="rounded-full bg-white px-4 py-1.5 text-lg font-black capitalize text-slate-700 shadow"
        >{v.label}</span
      >
      <button
        type="button"
        onclick={(e) => {
          e.stopPropagation();
          closeViewer();
        }}
        class="mt-2 rounded-2xl bg-white/90 px-6 py-2.5 font-bold text-slate-600 shadow active:scale-95"
      >
        Tutup ✕
      </button>
    </div>
  {/if}
{/if}
