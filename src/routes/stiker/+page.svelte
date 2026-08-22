<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { STICKERS, ALBUM_SECTIONS, stickersForSection } from '$lib/content/stickers.js';
  import { albumWords, themeSections } from '$lib/content/kata-catalog.js';

  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const owned = $derived(new Set(profiles.stickers));
  const kataOwned = $derived(new Set(profiles.kataWords));
  let tab = $state(/** @type {'kurikulum'|'cari-kata'} */ ('kurikulum'));
  let brokenImg = $state(/** @type {Set<string>} */ (new Set()));
  let brokenSil = $state(/** @type {Set<string>} */ (new Set()));
  let viewingSticker = $state(/** @type {import('$lib/content/stickers.js').Sticker|null} */ (null));
  let viewingKata = $state(/** @type {import('$lib/content/kata-catalog.js').CatalogWord|null} */ (null));
  /** @type {HTMLDivElement|undefined} */
  let viewerEl = $state();
  let returnFocusTo = /** @type {HTMLElement|null} */ (null);

  const kataSections = themeSections();
  const kataTotal = albumWords().length;
  const creditWords = albumWords().filter((entry) => entry.credit);

  onMount(() => {
    if (!profiles.active) return goto(`${base}/`);
    if (new URLSearchParams(location.search).get('tab') === 'cari-kata') tab = 'cari-kata';
    player.ensureLevel(voiceId, 'words').catch(() => {});
    player.ensureLevel(voiceId, 2).catch(() => {});
    player.ensureLevel(voiceId, 'cari-kata').catch(() => {});
  });

  $effect(() => {
    if (viewingSticker || viewingKata) viewerEl?.focus();
  });

  /** @param {'kurikulum'|'cari-kata'} next */
  function chooseTab(next) {
    tab = next;
    history.replaceState(history.state, '', `${base}/stiker${next === 'cari-kata' ? '?tab=cari-kata' : ''}`);
  }

  /** @param {import('$lib/content/stickers.js').Sticker} sticker */
  function speakSticker(sticker) {
    const bucket = sticker.bucket;
    if (sticker.talks && bucket !== undefined) {
      player.ensureLevel(voiceId, bucket).then(() => player.speak(voiceId, bucket, sticker.label)).catch(() => {});
    }
  }

  /** @param {import('$lib/content/kata-catalog.js').CatalogWord} entry */
  async function speakKata(entry) {
    await Promise.all([player.ensureLevel(voiceId, 2), player.ensureLevel(voiceId, 'cari-kata')]);
    if (player.variantCount(voiceId, 'cari-kata', entry.w) > 0) return player.speak(voiceId, 'cari-kata', entry.w);
    return player.speakChain(voiceId, 2, entry.syl, 70);
  }

  /** @param {import('$lib/content/stickers.js').Sticker} sticker @param {MouseEvent} event */
  function tapSticker(sticker, event) {
    if (!owned.has(sticker.id)) return;
    returnFocusTo = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    viewingSticker = sticker;
    viewingKata = null;
    profiles.markStickerSeen(sticker.id);
    speakSticker(sticker);
  }

  /** @param {import('$lib/content/kata-catalog.js').CatalogWord} entry @param {MouseEvent} event */
  function tapKata(entry, event) {
    if (!kataOwned.has(entry.w)) return;
    returnFocusTo = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    viewingKata = entry;
    viewingSticker = null;
    profiles.markKataWordSeen(entry.w);
    void speakKata(entry);
  }

  function closeViewer() {
    viewingSticker = null;
    viewingKata = null;
    player.stop();
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

<svelte:head><title>Buku Stiker · Ayo Belajar Membaca</title></svelte:head>

{#if profiles.active}
  <header class="mb-4 flex items-center justify-between">
    <button onclick={() => goto(`${base}/belajar`)} class="back-button" aria-label="Kembali">←</button>
    <span class="font-black text-slate-600">📒 Buku Stiker</span>
    <span class="text-sm font-bold text-slate-400">{tab === 'kurikulum' ? `${owned.size}/${STICKERS.length}` : `${kataOwned.size}/${kataTotal}`}</span>
  </header>

  <div class="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="Jenis album">
    <button type="button" role="tab" aria-selected={tab === 'kurikulum'} onclick={() => chooseTab('kurikulum')} class="rounded-xl px-3 py-2.5 font-black transition {tab === 'kurikulum' ? 'bg-white text-sky-700 shadow' : 'text-slate-400'}">
      Kurikulum
      {#if profiles.newStickerCount > 0}<span class="ml-1 rounded-full bg-rose-500 px-1.5 text-xs text-white">+{profiles.newStickerCount}</span>{/if}
    </button>
    <button type="button" role="tab" aria-selected={tab === 'cari-kata'} onclick={() => chooseTab('cari-kata')} class="rounded-xl px-3 py-2.5 font-black transition {tab === 'cari-kata' ? 'bg-white text-amber-700 shadow' : 'text-slate-400'}">
      Cari Kata
      {#if profiles.newKataWordCount > 0}<span class="ml-1 rounded-full bg-rose-500 px-1.5 text-xs text-white">+{profiles.newKataWordCount}</span>{/if}
    </button>
  </div>

  {#if tab === 'kurikulum'}
    <div class="grid gap-7 pb-8" role="tabpanel">
      {#each ALBUM_SECTIONS as section (section.key)}
        {@const items = stickersForSection(section.key)}
        {@const got = items.filter((sticker) => owned.has(sticker.id)).length}
        {#if items.length}
          <section>
            <h2 class="album-heading"><span class="text-lg">{section.icon}</span>{section.title}<span class="ml-auto normal-case text-slate-300">{got}/{items.length}</span></h2>
            <div class="grid grid-cols-4 gap-3">
              {#each items as sticker (sticker.id)}
                {@const have = owned.has(sticker.id)}
                {@const isNew = have && !profiles.isStickerSeen(sticker.id)}
                <button type="button" onclick={(event) => tapSticker(sticker, event)} disabled={!have} class="tile relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl shadow {have ? 'bg-white' : 'bg-slate-100'}">
                  {#if isNew}<span class="new-badge">BARU</span>{/if}
                  {#if have}
                    {#if !brokenImg.has(sticker.id)}
                      <img src="{base}{sticker.img}" alt={sticker.label} loading="lazy" class="h-full w-full object-cover" onerror={() => (brokenImg = new Set([...brokenImg, sticker.id]))} />
                    {:else}<span class="text-4xl">{sticker.emoji}</span>{/if}
                    <span class="tile-label">{sticker.label}</span>
                  {:else if !brokenSil.has(sticker.id)}
                    <img src="{base}{sticker.sil}" alt="" aria-hidden="true" loading="lazy" class="h-full w-full object-cover opacity-35" onerror={() => (brokenSil = new Set([...brokenSil, sticker.id]))} />
                  {:else}<span class="text-3xl text-slate-300">❓</span>{/if}
                </button>
              {/each}
            </div>
          </section>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="pb-8" role="tabpanel">
      <div class="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">
        <span>Kata bonus ditemukan: {profiles.active.kataBonusCount ?? 0}</span>
        <a href="{base}/cari-kata" class="ml-auto rounded-xl bg-amber-500 px-3 py-2 text-white shadow">🔍 Main</a>
      </div>

      <div class="grid gap-7">
        {#each kataSections as section (section.key)}
          {@const got = section.words.filter((entry) => kataOwned.has(entry.w)).length}
          <section>
            <h2 class="album-heading"><span class="text-lg">{section.icon}</span>{section.title}<span class="ml-auto normal-case text-slate-300">{got}/{section.words.length}</span></h2>
            <div class="grid grid-cols-4 gap-3">
              {#each section.words as entry (entry.w)}
                {@const have = kataOwned.has(entry.w)}
                {@const isNew = have && !profiles.isKataWordSeen(entry.w)}
                <button type="button" data-kata-word={entry.w} onclick={(event) => tapKata(entry, event)} disabled={!have} class="tile relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl shadow {have ? 'bg-white' : 'bg-slate-100'}">
                  {#if isNew}<span class="new-badge">BARU</span>{/if}
                  {#if entry.photo && entry.img && have && !brokenImg.has(`kata-${entry.w}`)}
                    <img src="{base}{entry.img}" alt={entry.w} loading="lazy" class="h-full w-full object-cover" onerror={() => (brokenImg = new Set([...brokenImg, `kata-${entry.w}`]))} />
                  {:else if entry.photo && entry.sil && !have && !brokenSil.has(`kata-${entry.w}`)}
                    <img src="{base}{entry.sil}" alt="" aria-hidden="true" loading="lazy" class="h-full w-full object-cover opacity-35" onerror={() => (brokenSil = new Set([...brokenSil, `kata-${entry.w}`]))} />
                  {:else}
                    <span class="text-4xl {have ? '' : 'locked-emoji'}" aria-hidden="true">{entry.e ?? '🖼️'}</span>
                  {/if}
                  {#if have}<span class="tile-label">{entry.w}</span>{/if}
                </button>
              {/each}
            </div>
          </section>
        {/each}
      </div>

      <details class="mt-8 rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">
        <summary class="cursor-pointer font-black text-slate-600">Kredit Foto</summary>
        <p class="mt-2">Foto tersimpan di aplikasi dan tetap tersedia saat offline.</p>
        <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {#each creditWords as entry}<a class="underline" href={entry.credit} target="_blank" rel="noreferrer">{entry.w}</a>{/each}
        </div>
      </details>
    </div>
  {/if}

  {#if viewingSticker || viewingKata}
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-900/80 p-6" role="dialog" aria-modal="true" aria-label={viewingSticker?.label ?? viewingKata?.w} tabindex="-1" bind:this={viewerEl} onkeydown={viewerKeydown} onclick={closeViewer}>
      {#if viewingSticker}
        {@const item = viewingSticker}
        <button type="button" class="max-h-[65vh] max-w-full overflow-hidden rounded-3xl bg-white shadow-2xl" onclick={(event) => { event.stopPropagation(); speakSticker(item); }}>
          {#if !brokenImg.has(item.id)}<img src="{base}{item.img}" alt={item.label} class="max-h-[65vh] w-auto object-contain" />{:else}<span class="grid h-52 w-52 place-items-center text-7xl">{item.emoji}</span>{/if}
        </button>
        <span class="viewer-word">{item.label}</span>
      {:else if viewingKata}
        {@const item = viewingKata}
        <button type="button" class="grid max-h-[60vh] min-h-52 min-w-52 place-items-center overflow-hidden rounded-3xl bg-white shadow-2xl" onclick={(event) => { event.stopPropagation(); void speakKata(item); }}>
          {#if item.photo && item.img && !brokenImg.has(`kata-${item.w}`)}<img src="{base}{item.img}" alt={item.w} class="max-h-[60vh] w-auto object-contain" />{:else}<span class="text-8xl">{item.e ?? '🖼️'}</span>{/if}
        </button>
        <div class="rounded-2xl bg-white px-5 py-2 text-center shadow"><strong class="block text-xl capitalize text-slate-700">{item.w}</strong><span class="font-black text-amber-600">{item.syl.join(' · ')}</span></div>
        <button type="button" onclick={(event) => { event.stopPropagation(); void speakKata(item); }} class="rounded-2xl bg-amber-500 px-6 py-3 font-black text-white shadow">🔊 Dengarkan</button>
      {/if}
      <button type="button" onclick={(event) => { event.stopPropagation(); closeViewer(); }} class="rounded-2xl bg-white/90 px-6 py-2.5 font-bold text-slate-600 shadow">Tutup ✕</button>
    </div>
  {/if}
{/if}

<style>
  .album-heading { margin-bottom: .5rem; display: flex; align-items: center; gap: .5rem; color: #94a3b8; font-size: .875rem; font-weight: 900; letter-spacing: .025em; text-transform: uppercase; }
  .new-badge { position: absolute; right: .25rem; top: .25rem; z-index: 10; border-radius: 999px; background: #f43f5e; padding: .125rem .375rem; color: white; font-size: 9px; font-weight: 900; line-height: 1; box-shadow: 0 1px 3px #0003; }
  .tile-label { position: absolute; inset-inline: 0; bottom: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: #0f172a8c; padding: .125rem .25rem; color: white; font-size: 11px; font-weight: 700; text-transform: capitalize; }
  .locked-emoji { filter: grayscale(1); opacity: .22; }
  .viewer-word { border-radius: 999px; background: white; padding: .375rem 1rem; color: #334155; font-size: 1.125rem; font-weight: 900; text-transform: capitalize; box-shadow: 0 2px 6px #0002; }
</style>
