<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { STICKERS, STICKER_TOTAL, ALBUM_SECTIONS, stickersForSection } from '$lib/content/stickers.js';
  import { albumThemes, albumWordsForTheme, albumWords, syllableLabel } from '$lib/content/kata-catalog.js';

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const owned = $derived(new Set(profiles.stickers));
  const total = $derived(STICKERS.length);

  /** ids whose static image 404'd — shown with the emoji fallback instead. */
  let brokenImg = $state(/** @type {Set<string>} */ (new Set()));
  let brokenSil = $state(/** @type {Set<string>} */ (new Set()));
  /**
   * The card currently shown full-size, or null. Both albums open the same viewer, so a
   * sticker and a collected word are normalized into this shape first.
   * @typedef {{ id: string, label: string, img?: string, emoji: string, sub?: string, speak: () => void }} AlbumCard
   */
  let viewing = $state(/** @type {AlbumCard|null} */ (null));
  /** @type {HTMLDivElement|undefined} */
  let viewerEl = $state();
  /** The tile that opened the viewer, so closing can hand focus back to it. */
  let returnFocusTo = /** @type {HTMLElement|null} */ (null);

  /** Which shelf set is showing. Cari Kata links here with `?album=kata`. */
  let tab = $state(/** @type {'kurikulum'|'kata'} */ ('kurikulum'));
  const kataOwned = $derived(new Set(profiles.kataWords));
  const kataTotal = $derived(albumWords().length);
  /** word -> photo provenance, for the "Kredit Foto" list. Empty until photos are curated. */
  let credits = $state(/** @type {Record<string, { photographer?: string, source?: string, url?: string, license?: string }>} */ ({}));
  const creditList = $derived(Object.entries(credits));

  onMount(() => {
    if (!profiles.active) return goto(`${base}/`);
    // Each sticker clears its own "BARU" badge when it's individually opened below —
    // merely visiting the album no longer clears them in bulk.
    player.ensureLevel(voiceId, 'words').catch(() => {});
    player.ensureLevel(voiceId, 'cari-kata').catch(() => {});
    player.ensureLevel(voiceId, 2).catch(() => {});
    if (new URLSearchParams(window.location.search).get('album') === 'kata') tab = 'kata';
    // Provenance for the curated word photos, published next to the art by
    // `prepare-stickers.js --set=kata`. Ships as `{}` until the first photo lands.
    fetch(`${base}/kata/credits.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => (credits = data ?? {}))
      .catch(() => {});
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
      player
        .ensureLevel(voiceId, bucket)
        .then(() => player.speak(voiceId, bucket, sticker.label))
        .catch(() => {});
    }
  }

  /**
   * Tapping an owned tile opens it full-size and speaks it.
   * @param {import('$lib/content/stickers.js').Sticker} sticker @param {MouseEvent} event
   */
  function tap(sticker, event) {
    if (!owned.has(sticker.id)) return;
    returnFocusTo = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    viewing = {
      id: sticker.id,
      label: sticker.label,
      img: sticker.img,
      emoji: sticker.emoji,
      speak: () => speakSticker(sticker)
    };
    profiles.markStickerSeen(sticker.id);
    speakSticker(sticker);
  }

  /**
   * Say a collected word: its own clip when the cari-kata bucket has been generated,
   * otherwise its syllables chained from the level-2 clips (which are always committed).
   * @param {import('$lib/content/kata-catalog.js').CatalogWord} entry
   */
  function speakKata(entry) {
    if (player.variantCount(voiceId, 'cari-kata', entry.w) > 0) {
      player.speak(voiceId, 'cari-kata', entry.w).catch(() => {});
      return;
    }
    player.speakChain(voiceId, 2, entry.syl).catch(() => {});
  }

  /** @param {import('$lib/content/kata-catalog.js').CatalogWord} entry @param {MouseEvent} event */
  function tapKata(entry, event) {
    if (!kataOwned.has(entry.w)) return;
    returnFocusTo = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    viewing = {
      id: `kata:${entry.w}`,
      label: entry.w,
      img: entry.photo ? `/kata/${entry.w}.webp` : undefined,
      emoji: entry.e ?? '🔤',
      sub: syllableLabel(entry),
      speak: () => speakKata(entry)
    };
    profiles.markKataWordSeen(entry.w);
    speakKata(entry);
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
    <button onclick={() => goto(`${base}/belajar`)} class="back-button" aria-label="Kembali">←</button>
    <span class="font-black text-slate-600">📒 Buku Stiker</span>
    <span class="text-sm font-bold text-slate-400">
      {tab === 'kurikulum' ? `${owned.size}/${total}` : `${kataOwned.size}/${kataTotal}`}
    </span>
  </header>

  <div class="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1" role="tablist">
    <button
      type="button"
      role="tab"
      aria-selected={tab === 'kurikulum'}
      onclick={() => (tab = 'kurikulum')}
      class="rounded-xl px-3 py-2 text-sm font-black transition {tab === 'kurikulum'
        ? 'bg-white text-slate-700 shadow'
        : 'text-slate-400'}"
    >📚 Kurikulum</button>
    <button
      type="button"
      role="tab"
      aria-selected={tab === 'kata'}
      onclick={() => (tab = 'kata')}
      class="relative rounded-xl px-3 py-2 text-sm font-black transition {tab === 'kata'
        ? 'bg-white text-slate-700 shadow'
        : 'text-slate-400'}"
    >
      🔍 Cari Kata
      {#if profiles.newKataWordCount > 0}
        <span
          class="absolute right-1 top-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white"
          >+{profiles.newKataWordCount}</span
        >
      {/if}
    </button>
  </div>

  {#if tab === 'kata'}
    <div class="grid gap-7 pb-8">
      <p class="text-center text-sm font-bold text-slate-400">
        Kata yang kamu temukan di Cari Kata.
        {#if profiles.kataBonus > 0}
          <br />Kata bonus tanpa gambar: {profiles.kataBonus}
        {/if}
      </p>
      {#each albumThemes() as theme (theme.key)}
        {@const items = albumWordsForTheme(theme.key)}
        {@const got = items.filter((entry) => kataOwned.has(entry.w)).length}
        <section>
          <h2 class="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-400">
            <span class="text-lg">{theme.icon}</span>
            {theme.title}
            <span class="ml-auto normal-case text-slate-300">{got}/{items.length}</span>
          </h2>
          <div class="grid grid-cols-4 gap-3">
            {#each items as entry (entry.w)}
              {@const have = kataOwned.has(entry.w)}
              {@const isNew = have && !profiles.isKataWordSeen(entry.w)}
              <button
                type="button"
                onclick={(e) => tapKata(entry, e)}
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
                {#if have && entry.photo && !brokenImg.has(`kata:${entry.w}`)}
                  <img
                    src="{base}/kata/{entry.w}.webp"
                    alt={entry.w}
                    loading="lazy"
                    class="h-full w-full object-cover"
                    onerror={() => (brokenImg = new Set([...brokenImg, `kata:${entry.w}`]))}
                  />
                {:else}
                  <!-- Locked words keep their shape but not their colour, so the shelf reads as
                       "still to find" without hiding what is coming. -->
                  <span class="text-4xl {have ? '' : 'opacity-25 grayscale'}">{entry.e ?? '🔤'}</span>
                {/if}
                {#if have}
                  <span
                    class="absolute inset-x-0 bottom-0 truncate bg-slate-900/55 px-1 py-0.5 text-[11px] font-bold capitalize text-white"
                    >{entry.w}</span
                  >
                {/if}
              </button>
            {/each}
          </div>
        </section>
      {/each}

      {#if creditList.length}
        <details class="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
          <summary class="cursor-pointer font-black">Kredit Foto</summary>
          <ul class="mt-2 grid gap-1">
            {#each creditList as [word, credit] (word)}
              <li>
                <span class="font-bold capitalize">{word}</span> —
                {credit.photographer ?? 'tidak diketahui'}{credit.source ? ` · ${credit.source}` : ''}{credit.license
                  ? ` · ${credit.license}`
                  : ''}
              </li>
            {/each}
          </ul>
        </details>
      {/if}
    </div>
  {:else}
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
  {/if}

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
          v.speak();
        }}
      >
        {#if v.img && !brokenImg.has(v.id)}
          <img src="{base}{v.img}" alt={v.label} class="max-h-[70vh] w-auto object-contain" />
        {:else}
          <span class="grid h-52 w-52 place-items-center text-7xl">{v.emoji}</span>
        {/if}
      </button>
      <span class="rounded-full bg-white px-4 py-1.5 text-lg font-black capitalize text-slate-700 shadow"
        >{v.label}</span
      >
      {#if v.sub}
        <span class="text-lg font-black tracking-wide text-white/90">{v.sub}</span>
      {/if}
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
