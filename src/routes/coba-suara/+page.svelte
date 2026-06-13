<script>
  // Standalone Speech-to-Text test page (not linked from the kid UI).
  // Open at /coba-suara on the deployed HTTPS site and test with your child.
  import { onMount } from 'svelte';

  // Targets chosen to include confusable pairs (B/P, D/T) + a few syllables.
  const TARGETS = ['B', 'P', 'D', 'T', 'M', 'N', 'A', 'ba', 'be', 'bi', 'pa', 'da'];

  // Expected spoken forms per target (Indonesian letter names + the raw form).
  const LETTER_NAME = {
    b: 'be', c: 'ce', d: 'de', f: 'ef', g: 'ge', h: 'ha', j: 'je', k: 'ka',
    l: 'el', m: 'em', n: 'en', p: 'pe', q: 'ki', r: 'er', s: 'es', t: 'te',
    v: 've', w: 'we', x: 'eks', y: 'ye', z: 'zet', a: 'a', i: 'i', u: 'u', e: 'e', o: 'o'
  };
  /** @param {string} t */
  function expectedFor(t) {
    const low = t.toLowerCase();
    if (low.length === 1 && LETTER_NAME[low]) return [low, LETTER_NAME[low]];
    return [low];
  }

  let target = $state('B');
  let supported = $state(true);
  let listening = $state(false);
  let status = $state('');
  /** @type {{transcript:string, confidence:number}[]} */
  let alts = $state([]);
  let interim = $state('');
  /** @type {{target:string, heard:string, ok:boolean, conf:number}[]} */
  let log = $state([]);

  /** @type {any} */
  let recog = null;

  onMount(() => {
    const SR = window.SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;
    if (!SR) {
      supported = false;
      return;
    }
    recog = new SR();
    recog.lang = 'id-ID';
    recog.maxAlternatives = 5;
    recog.interimResults = true;
    recog.continuous = false;

    recog.onresult = (/** @type {any} */ e) => {
      interim = '';
      for (const res of e.results) {
        if (!res.isFinal) {
          interim = res[0]?.transcript ?? '';
          continue;
        }
        const list = [];
        for (let i = 0; i < res.length; i++) {
          list.push({ transcript: (res[i].transcript ?? '').trim(), confidence: res[i].confidence ?? 0 });
        }
        alts = list;
        evaluate(list);
      }
    };
    recog.onerror = (/** @type {any} */ e) => {
      status = `error: ${e.error}`;
      listening = false;
    };
    recog.onend = () => {
      listening = false;
      if (!status) status = 'selesai';
    };
  });

  /** @param {{transcript:string,confidence:number}[]} list */
  function evaluate(list) {
    const exp = expectedFor(target);
    const norm = (/** @type {string} */ s) => s.toLowerCase().replace(/[^a-z]/g, '');
    let ok = false;
    let best = list[0];
    for (const a of list) if (exp.includes(norm(a.transcript))) { ok = true; best = a; break; }
    log = [{ target, heard: list.map((a) => a.transcript).join(' / ') || '(kosong)', ok, conf: best?.confidence ?? 0 }, ...log].slice(0, 12);
  }

  function start() {
    if (!recog || listening) return;
    alts = [];
    interim = '';
    status = '';
    listening = true;
    try {
      recog.start();
      status = 'mendengarkan…';
    } catch {
      listening = false;
    }
  }
</script>

<div class="mx-auto max-w-md">
  <h1 class="mb-1 text-2xl font-black text-amber-600">Tes Suara (STT)</h1>
  <p class="mb-4 text-sm text-slate-500">
    Halaman uji. Pilih target, tekan mikrofon, dan ucapkan. Lihat apa yang didengar sistem.
  </p>

  {#if !supported}
    <div class="rounded-2xl bg-red-100 p-4 text-red-700">
      Browser ini tidak mendukung Speech Recognition. Coba <b>Chrome</b> atau <b>Safari</b>,
      dan pastikan situs dibuka via <b>HTTPS</b>.
    </div>
  {:else}
    <div class="mb-4 flex flex-wrap gap-2">
      {#each TARGETS as t}
        <button
          onclick={() => (target = t)}
          class="rounded-xl px-3 py-2 font-bold {target === t ? 'bg-amber-400 text-white' : 'bg-slate-100'}"
        >{t}</button>
      {/each}
    </div>

    <div class="mb-4 rounded-3xl bg-white p-6 text-center shadow">
      <div class="text-sm text-slate-400">Ucapkan</div>
      <div class="my-2 text-6xl font-black">{target}</div>
      <div class="text-xs text-slate-400">diharapkan: {expectedFor(target).join(' / ')}</div>
    </div>

    <button
      onclick={start}
      disabled={listening}
      class="mb-3 w-full rounded-2xl py-5 text-xl font-bold text-white active:scale-95 {listening ? 'bg-red-500' : 'bg-amber-500'}"
    >
      {listening ? '🎙️ Mendengarkan…' : '🎤 Tekan & Ucapkan'}
    </button>
    <div class="mb-4 text-center text-sm text-slate-500">{status}{interim ? ` · "${interim}"` : ''}</div>

    {#if alts.length}
      <div class="mb-4 rounded-2xl bg-slate-50 p-4">
        <div class="mb-2 text-sm font-bold text-slate-500">Hasil (alternatif):</div>
        {#each alts as a, i}
          <div class="flex justify-between border-b border-slate-100 py-1 text-sm last:border-0">
            <span class="font-mono">{i + 1}. "{a.transcript || '∅'}"</span>
            <span class="text-slate-400">{a.confidence ? Math.round(a.confidence * 100) + '%' : '—'}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if log.length}
      <h2 class="mb-2 text-sm font-bold uppercase text-slate-400">Riwayat</h2>
      <div class="grid gap-1">
        {#each log as r}
          <div class="flex items-center gap-2 rounded-lg bg-white p-2 text-sm shadow-sm">
            <span class="text-lg">{r.ok ? '✅' : '❌'}</span>
            <span class="font-bold">{r.target}</span>
            <span class="flex-1 text-slate-500">heard: {r.heard}</span>
            <span class="text-xs text-slate-400">{r.conf ? Math.round(r.conf * 100) + '%' : ''}</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
