<script>
  // DEV-ONLY page to audition TTS pronunciation candidates and pick the best.
  // Populate it with:  node --env-file-if-exists=.env scripts/tts-candidates.js to tang
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  let data = $state(/** @type {null | { voice: string, syllables: any[] }} */ (null));
  let error = $state('');
  let nowPlaying = $state('');
  /** @type {HTMLAudioElement | null} */
  let audio = null;

  onMount(async () => {
    try {
      const res = await fetch(`${base}/preview/manifest.json?t=${Date.now()}`);
      if (!res.ok) throw new Error('no manifest');
      data = await res.json();
    } catch {
      error =
        'Belum ada kandidat. Jalankan dulu:\n  node --env-file-if-exists=.env scripts/tts-candidates.js to tang';
    }
  });

  /** @param {string} file @param {string} id */
  function play(file, id) {
    audio?.pause();
    nowPlaying = id;
    audio = new Audio(`${base}/preview/${file}?t=${Date.now()}`);
    audio.onended = () => (nowPlaying = '');
    audio.play().catch(() => (nowPlaying = ''));
  }
</script>

<header class="mb-4 flex items-center justify-between">
  <span class="text-lg font-black text-amber-600">🔊 TTS Candidates</span>
  {#if data}<span class="text-sm text-slate-400">voice: {data.voice}</span>{/if}
</header>

{#if error}
  <pre class="whitespace-pre-wrap rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{error}</pre>
{:else if data}
  <p class="mb-4 text-sm text-slate-500">
    Tap each one and tell me the label that sounds right (e.g. “tang → C”).
  </p>
  <div class="grid gap-6">
    {#each data.syllables as s (s.syl)}
      <section class="rounded-3xl bg-white p-4 shadow">
        <h2 class="mb-3 text-2xl font-black">{s.syl}</h2>
        <div class="grid gap-2">
          {#each s.candidates as c (c.label)}
            {@const id = s.syl + c.label}
            <button
              onclick={() => play(c.file, id)}
              class="flex items-center gap-3 rounded-2xl border-2 p-3 text-left active:scale-[0.99]
                {nowPlaying === id ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-slate-50'}"
            >
              <span class="text-2xl">{nowPlaying === id ? '🔊' : '▶️'}</span>
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 font-black text-white">{c.label}</span>
              <span class="flex-1">
                <span class="block font-bold">{c.ipa ? `/${c.ipa}/` : `"${c.text}"`} · rate {c.rate}</span>
                <span class="block text-xs text-slate-500">{c.desc}</span>
              </span>
            </button>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{:else}
  <p class="text-slate-400">Memuat…</p>
{/if}
