<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { PICTURE_WORDS } from '$lib/content/words.js';
  import { feedbackForLevel } from '$lib/content/feedback.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect, buzzWrong } from '$lib/audio/sfx.js';
  import { sttSupported, recognizeOnce, matchesWord } from '$lib/audio/recognize.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  const DECK = 8;
  let supported = $state(true);
  let deck = $state(/** @type {{w:string,e:string}[]} */ ([]));
  let idx = $state(0);
  let done = $state(0); // words gotten right
  let finished = $state(false);
  let listening = $state(false);
  let result = $state(/** @type {'none'|'ok'|'try'} */ ('none'));
  let heard = $state('');
  /** @type {'idle'|'happy'|'sad'} */
  let mood = $state('idle');
  /** @type {Confetti} */
  let confetti;

  const cur = $derived(deck[idx]);
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const fb = $derived(feedbackForLevel(1));

  /** @template T @param {T[]} a */
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

  onMount(async () => {
    if (!profiles.active) return goto(`${base}/belajar`);
    supported = sttSupported();
    deck = shuffle(PICTURE_WORDS).slice(0, DECK);
    if (supported) await player.ensureLevel(voiceId, 1); // for spoken praise
  });

  async function listen() {
    if (listening || !cur) return;
    result = 'none';
    heard = '';
    listening = true;
    mood = 'idle';
    const { alternatives } = await recognizeOnce({ lang: 'id-ID' });
    listening = false;
    heard = alternatives.map((a) => a.transcript).filter(Boolean)[0] ?? '';
    if (matchesWord(cur.w, alternatives)) {
      result = 'ok';
      mood = 'happy';
      done++;
      confetti?.fire(32);
      chimeCorrect();
      await player.speak(voiceId, 1, pick(fb.correct));
      setTimeout(nextCard, 700);
    } else {
      result = 'try';
      mood = 'sad';
      buzzWrong();
      await player.speak(voiceId, 1, pick(fb.wrong));
    }
  }

  /** @template T @param {T[]} a */
  function pick(a) {
    return a[Math.floor(Math.random() * a.length)];
  }

  function nextCard() {
    result = 'none';
    heard = '';
    mood = 'idle';
    if (idx + 1 >= deck.length) {
      finished = true;
      return;
    }
    idx++;
  }
</script>

<Confetti bind:this={confetti} />

<header class="mb-4 flex items-center justify-between">
  <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
  <span class="font-bold text-slate-500">🎤 Ucapkan</span>
  <span class="text-sm text-slate-400">{Math.min(idx + 1, deck.length)}/{deck.length}</span>
</header>

{#if !supported}
  <div class="mt-10 rounded-3xl bg-white p-6 text-center shadow">
    <div class="text-5xl">🙉</div>
    <p class="mt-3 font-bold">Mode suara belum bisa di perangkat ini.</p>
    <p class="mt-1 text-sm text-slate-500">
      Butuh internet dan browser <b>Chrome</b> atau <b>Safari</b>. Coba lagi nanti, ya!
    </p>
    <button onclick={() => goto(`${base}/belajar`)} class="mt-4 rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white">Kembali</button>
  </div>
{:else if finished}
  <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
    <Robot mood="happy" size={180} />
    <h2 class="text-3xl font-black">Pintar! 🌟</h2>
    <p class="text-xl">Benar {done} dari {deck.length} kata</p>
    <div class="flex gap-3">
      <button onclick={() => location.reload()} class="rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-white active:scale-95">Lagi</button>
      <button onclick={() => goto(`${base}/belajar`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold active:scale-95">Selesai</button>
    </div>
  </div>
{:else if cur}
  <div class="flex flex-1 flex-col items-center justify-start gap-5">
    <Robot {mood} size={130} />

    <div class="w-full rounded-3xl bg-white p-8 text-center shadow">
      <div class="text-8xl">{cur.e}</div>
      <div class="mt-3 text-5xl font-black">
        <span class="text-amber-500">{cur.w[0].toUpperCase()}</span>{cur.w.slice(1)}
      </div>
    </div>

    {#if result === 'ok'}
      <div class="text-xl font-black text-green-500">✅ Betul!</div>
    {:else if result === 'try'}
      <div class="text-center">
        <div class="text-xl font-black text-orange-500">Coba lagi, ya! 💪</div>
        {#if heard}<div class="text-xs text-slate-400">terdengar: "{heard}"</div>{/if}
      </div>
    {:else}
      <div class="text-sm text-slate-400">Tekan mikrofon lalu ucapkan kata di atas</div>
    {/if}

    <button
      onclick={listen}
      disabled={listening}
      class="w-full rounded-2xl py-6 text-2xl font-black text-white active:scale-95 {listening ? 'bg-red-500' : 'bg-amber-500'}"
    >
      {listening ? '🎙️ Mendengarkan…' : '🎤 Ucapkan'}
    </button>

    <button onclick={nextCard} class="text-sm font-bold text-slate-400 underline">Lewati ➡️</button>
  </div>
{/if}
