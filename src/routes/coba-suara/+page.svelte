<script>
  // Standalone STT test — WHOLE WORD mode (not linked from kid UI).
  // Open at /coba-suara on the deployed HTTPS site and test with your child.
  // Approach: show a word + picture, child says the WORD (recognizers handle words
  // far better than lone letters); we fuzzy-match the transcript.
  import { onMount } from 'svelte';

  /** word, emoji, starting letter */
  const WORDS = [
    { w: 'bola', e: '⚽' }, { w: 'sapi', e: '🐄' }, { w: 'kucing', e: '🐱' },
    { w: 'buku', e: '📖' }, { w: 'topi', e: '👒' }, { w: 'gajah', e: '🐘' },
    { w: 'ikan', e: '🐟' }, { w: 'ayam', e: '🐔' }, { w: 'pisang', e: '🍌' },
    { w: 'kuda', e: '🐴' }, { w: 'apel', e: '🍎' }, { w: 'ular', e: '🐍' },
    { w: 'nasi', e: '🍚' }, { w: 'jeruk', e: '🍊' }, { w: 'daun', e: '🍃' }
  ];

  let i = $state(0);
  const cur = $derived(WORDS[i]);
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
    const w = /** @type {any} */ (window);
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return (supported = false);
    recog = new SR();
    recog.lang = 'id-ID';
    recog.maxAlternatives = 5;
    recog.interimResults = true;
    recog.continuous = false;
    recog.onresult = (/** @type {any} */ e) => {
      interim = '';
      for (const res of e.results) {
        if (!res.isFinal) { interim = res[0]?.transcript ?? ''; continue; }
        const list = [];
        for (let k = 0; k < res.length; k++)
          list.push({ transcript: (res[k].transcript ?? '').trim(), confidence: res[k].confidence ?? 0 });
        alts = list;
        evaluate(list);
      }
    };
    recog.onerror = (/** @type {any} */ e) => { status = `error: ${e.error}`; listening = false; };
    recog.onend = () => { listening = false; if (!status) status = 'selesai'; };
  });

  /** @param {string} a @param {string} b */
  function lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, x) => [x, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let x = 1; x <= m; x++)
      for (let y = 1; y <= n; y++)
        d[x][y] = Math.min(d[x - 1][y] + 1, d[x][y - 1] + 1, d[x - 1][y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
    return d[m][n];
  }

  /** @param {{transcript:string,confidence:number}[]} list */
  function evaluate(list) {
    const norm = (/** @type {string} */ s) => s.toLowerCase().replace(/[^a-z]/g, '');
    const target = norm(cur.w);
    let ok = false;
    for (const a of list) {
      const tokens = a.transcript.toLowerCase().split(/\s+/).map(norm);
      // accept exact, near-miss (edit distance <=1), or the word appearing as a token
      if (tokens.some((t) => t === target || lev(t, target) <= 1) || norm(a.transcript) === target) {
        ok = true;
        break;
      }
    }
    log = [{ target: cur.w, heard: list.map((a) => a.transcript).join(' / ') || '(kosong)', ok, conf: list[0]?.confidence ?? 0 }, ...log].slice(0, 12);
  }

  function start() {
    if (!recog || listening) return;
    alts = []; interim = ''; status = ''; listening = true;
    try { recog.start(); status = 'mendengarkan…'; } catch { listening = false; }
  }
  function nextWord() { i = (i + 1) % WORDS.length; alts = []; status = ''; interim = ''; }
</script>

<div class="mx-auto max-w-md">
  <h1 class="mb-1 text-2xl font-black text-amber-600">Tes Suara — Kata</h1>
  <p class="mb-4 text-sm text-slate-500">
    Anak mengucapkan <b>kata</b> (bukan satu huruf). Pengenalan kata jauh lebih akurat.
  </p>

  {#if !supported}
    <div class="rounded-2xl bg-red-100 p-4 text-red-700">
      Browser tidak mendukung Speech Recognition. Pakai <b>Chrome</b>/<b>Safari</b> via <b>HTTPS</b>.
    </div>
  {:else}
    <div class="mb-4 rounded-3xl bg-white p-8 text-center shadow">
      <div class="text-5xl font-black">
        <span class="text-amber-500">{cur.w[0].toUpperCase()}</span>{cur.w.slice(1)}
      </div>
      <div class="mt-1 text-xs text-slate-400">ucapkan kata ini</div>
    </div>

    <div class="mb-3 flex gap-3">
      <button onclick={start} disabled={listening}
        class="flex-1 rounded-2xl py-5 text-xl font-bold text-white active:scale-95 {listening ? 'bg-red-500' : 'bg-amber-500'}">
        {listening ? '🎙️ Mendengarkan…' : '🎤 Ucapkan'}
      </button>
      <button onclick={nextWord} class="rounded-2xl bg-slate-100 px-5 text-xl font-bold active:scale-95">➡️</button>
    </div>
    <div class="mb-4 text-center text-sm text-slate-500">{status}{interim ? ` · "${interim}"` : ''}</div>

    {#if alts.length}
      <div class="mb-4 rounded-2xl bg-slate-50 p-4">
        <div class="mb-2 text-sm font-bold text-slate-500">Didengar:</div>
        {#each alts as a, k}
          <div class="flex justify-between border-b border-slate-100 py-1 text-sm last:border-0">
            <span class="font-mono">{k + 1}. "{a.transcript || '∅'}"</span>
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
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
