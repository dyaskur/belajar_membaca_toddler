<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount, onDestroy } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { spinTick, reelThunk, sfxJackpot } from '$lib/audio/sfx.js';
  import { REEL_SETS, isPictureWord, mesinWordFor, MESIN_REAL, MESIN_FUNNY } from '$lib/content/mesin.js';
  import { feedbackForLevel } from '$lib/content/feedback.js';
  import { DEFAULT_AVATAR, robotColor } from '$lib/content/avatars.js';
  import Robot from '$lib/components/Robot.svelte';
  import Confetti from '$lib/components/Confetti.svelte';

  const SPINS_PER_ROUND = 10;
  
  let phase = $state(/** @type {'ready'|'spinning'|'reading'|'result'|'finished'} */ ('ready'));
  let spinCount = $state(0);
  let nonsenseStreak = $state(0);
  let previousCombo = $state('');
  
  let setIndex = $state(0);
  const currentSet = $derived(REEL_SETS[setIndex]);
  
  let reelAIndex = $state(0);
  let reelBIndex = $state(0);
  let offsetA = $state(0);
  let offsetB = $state(0);
  let resetTransition = $state(false);
  let reducedMotion = $state(false);
  
  let roundFoundWords = $state(/** @type {{w: string, isNew: boolean, pic?: string}[]} */ ([]));
  let currentResult = $state(/** @type {{w: string, isReal: boolean, isNew: boolean, pic?: string} | null} */ (null));
  
  let showBank = $state(false);
  let wobble = $state(false);
  
  /** @type {Confetti} */
  let confetti;
  
  const voiceId = $derived(profiles.active?.voiceId ?? 'ibu-dewi');
  const rc = $derived(robotColor(profiles.active?.avatar ?? DEFAULT_AVATAR));
  const bankCount = $derived(profiles.mesinWords.length);
  const fb = $derived(feedbackForLevel(1));
  
  const allMesinWords = $derived.by(() => {
    /** @type {{ w: string, set: number, pic?: string }[]} */
    const list = [];
    REEL_SETS.forEach((set, i) => {
       /** @type {{ w: string, set: number, pic?: string }[]} */
       const setWords = [];
       set.a.forEach(a => {
         set.b.forEach(b => {
            const w = mesinWordFor(a, b);
            if (w && !list.find(x => x.w === w)) {
              setWords.push({ w, set: i + 1, pic: isPictureWord(w)?.e });
            }
         });
       });
       list.push(...setWords);
    });
    return list;
  });
  
  let tickTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  let ticker = /** @type {ReturnType<typeof setInterval> | undefined} */ (undefined);
  let stopTimerA = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  let stopTimerB = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  let speechToken = 0;

  onMount(() => {
    if (!profiles.active) return goto(`${base}/belajar`);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    player.ensureLevel(voiceId, 2).catch(()=>{});
    player.ensureLevel(voiceId, 'words').catch(()=>{});
    player.ensureLevel(voiceId, 'mesin').catch(()=>{});
    player.ensureLevel(voiceId, 1).catch(()=>{});
    
    setIndex = Math.floor(Math.random() * REEL_SETS.length);
    reelAIndex = Math.floor(Math.random() * 8);
    reelBIndex = Math.floor(Math.random() * 8);
    offsetA = reelAIndex;
    offsetB = reelBIndex;
  });

  onDestroy(() => {
    player.stop();
    clearTimeout(tickTimer);
    clearInterval(ticker);
    clearTimeout(stopTimerA);
    clearTimeout(stopTimerB);
  });
  
  function pickOutcome() {
    const set = currentSet;
    let aIdx = 0, bIdx = 0, w;
    
    for (let i = 0; i < 50; i++) {
      aIdx = Math.floor(Math.random() * 8);
      bIdx = Math.floor(Math.random() * 8);
      w = mesinWordFor(set.a[aIdx], set.b[bIdx]);
      
      const isReal = !!w;
      const combo = `${aIdx}-${bIdx}`;
      
      if (combo === previousCombo) continue;
      
      if (nonsenseStreak >= 3) {
        if (isReal) break;
      } else {
        break;
      }
    }
    
    reelAIndex = aIdx;
    reelBIndex = bIdx;
    previousCombo = `${aIdx}-${bIdx}`;
    
    if (w) {
      nonsenseStreak = 0;
      const isNew = profiles.addMesinWord(w);
      const pic = isPictureWord(w);
      currentResult = { w, isReal: true, isNew, pic: pic?.e };
    } else {
      nonsenseStreak++;
      currentResult = { w: set.a[aIdx] + set.b[bIdx], isReal: false, isNew: false };
    }
  }

  function playSpins() {
    if (phase !== 'ready' && phase !== 'result') return;
    phase = 'spinning';
    currentResult = null;
    wobble = false;
    
    resetTransition = true;
    offsetA = offsetA % 8;
    offsetB = offsetB % 8;
    
    tickTimer = setTimeout(() => {
       resetTransition = false;
       pickOutcome();
       
       if (!reducedMotion) {
         offsetA = offsetA + 24 + reelAIndex - (offsetA % 8); 
         offsetB = offsetB + 32 + reelBIndex - (offsetB % 8);
         
         let ticks = 0;
         ticker = setInterval(() => {
           spinTick();
           ticks++;
           if (ticks > 12) clearInterval(ticker);
         }, 100);
         
         stopTimerA = setTimeout(() => reelThunk(), 1200);
         stopTimerB = setTimeout(() => { reelThunk(); readResult(); }, 1500);
       } else {
         offsetA = offsetA + reelAIndex - (offsetA % 8);
         offsetB = offsetB + reelBIndex - (offsetB % 8);
         reelThunk();
         stopTimerB = setTimeout(readResult, 500);
       }
    }, 50);
  }
  
  /** @param {any[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  
  async function readResult() {
    phase = 'reading';
    const token = ++speechToken;
    const sylA = currentSet.a[reelAIndex];
    const sylB = currentSet.b[reelBIndex];
    
    if (currentResult?.isReal) {
      await player.speak(voiceId, 2, sylA, 1);
      if (token !== speechToken) return;
      await player.speak(voiceId, 2, sylB, 1);
      if (token !== speechToken) return;
      
      if (currentResult.pic) {
        await player.speak(voiceId, 'words', currentResult.w);
      } else {
        await player.speak(voiceId, 'mesin', currentResult.w);
      }
      if (token !== speechToken) return;
      
      confetti?.fire(50);
      sfxJackpot();
      
      if (!roundFoundWords.find(x => x.w === currentResult?.w)) {
        roundFoundWords.push({ w: currentResult.w, isNew: currentResult.isNew, pic: currentResult.pic });
      }
      
      phase = 'result';
      spinCount++;
      if (spinCount >= SPINS_PER_ROUND) {
        phase = 'finished';
        player.speak(voiceId, 1, pick(fb.complete)).catch(()=>{});
      }
      player.speak(voiceId, 'mesin', pick(MESIN_REAL)).catch(()=>{});
    } else {
      await player.speak(voiceId, 2, sylA, 1);
      if (token !== speechToken) return;
      await player.speak(voiceId, 2, sylB, 1);
      if (token !== speechToken) return;
      
      await player.speak(voiceId, 2, sylA, 0);
      if (token !== speechToken) return;
      await player.speak(voiceId, 2, sylB, 0);
      if (token !== speechToken) return;
      
      wobble = true;
      phase = 'result';
      spinCount++;
      if (spinCount >= SPINS_PER_ROUND) {
        phase = 'finished';
        player.speak(voiceId, 1, pick(fb.complete)).catch(()=>{});
      }
      player.speak(voiceId, 'mesin', pick(MESIN_FUNNY)).catch(()=>{});
    }
  }

  function nextRound() {
    spinCount = 0;
    roundFoundWords = [];
    currentResult = null;
    wobble = false;
    setIndex = (setIndex + 1) % REEL_SETS.length;
    
    resetTransition = true;
    offsetA = Math.floor(Math.random() * 8);
    offsetB = Math.floor(Math.random() * 8);
    reelAIndex = offsetA;
    reelBIndex = offsetB;
    
    phase = 'ready';
  }
</script>

<style>
  .reel-strip {
    transition: transform 1200ms cubic-bezier(0.25, 1, 0.5, 1);
  }
  .reel-strip-b {
    transition: transform 1500ms cubic-bezier(0.25, 1, 0.5, 1);
  }
  .no-transition {
    transition: none !important;
  }
  .wobble {
    animation: wobble 0.5s ease-in-out;
  }
  @keyframes wobble {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-5deg); }
    75% { transform: rotate(5deg); }
  }
</style>

<Confetti bind:this={confetti} />

<header class="mb-3 flex items-center justify-between">
  <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
  <span class="font-bold text-slate-500">🎰 Mesin Kata · Putaran {Math.min(spinCount + 1, SPINS_PER_ROUND)}/{SPINS_PER_ROUND}</span>
  <button onclick={() => showBank = true} class="rounded-xl bg-orange-100 px-3 py-1 font-bold text-orange-600 active:scale-95">
    📚 {bankCount}/{allMesinWords.length}
  </button>
</header>

{#if phase === 'finished'}
  <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
    <Robot mood="happy" size={180} head={rc.head} body={rc.body} />
    <h2 class="text-3xl font-black">Kamu menemukan {roundFoundWords.length} kata!</h2>
    
    {#if roundFoundWords.length > 0}
      <div class="flex flex-wrap justify-center gap-3 py-4">
        {#each roundFoundWords as w}
          <div class="relative rounded-2xl bg-white px-4 py-2 font-bold shadow">
            {#if w.isNew}
              <span class="absolute -right-2 -top-3 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white shadow">Baru! ✨</span>
            {/if}
            <span class="text-xl">{w.pic || ''} {w.w}</span>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-xl text-slate-500">Coba lagi untuk menemukan kata!</p>
    {/if}
    
    <div class="flex gap-3">
      <button onclick={nextRound} class="rounded-2xl bg-orange-500 px-6 py-4 text-lg font-bold text-white shadow active:scale-95">
        Main Lagi
      </button>
      <button onclick={() => goto(`${base}/belajar`)} class="rounded-2xl bg-slate-100 px-6 py-4 text-lg font-bold shadow active:scale-95">Selesai</button>
    </div>
  </div>
  <!-- // TODO(#16): awardSticker('mesin') when /stiker lands -->
{:else}
  <div class="flex flex-1 flex-col justify-between pb-8">
    
    <div class="flex h-32 items-center justify-center">
       {#if currentResult}
         <div class="flex flex-col items-center {wobble ? 'wobble' : ''}">
            {#if currentResult.isReal && currentResult.pic}
              <span class="text-5xl">{currentResult.pic}</span>
            {/if}
            <span class="mt-2 text-4xl font-black tracking-widest text-slate-800">{currentResult.w}</span>
         </div>
       {/if}
    </div>

    <!-- Machine base -->
    <div class="relative mx-auto w-full max-w-sm rounded-3xl border-4 border-orange-600 bg-orange-500 p-6 shadow-2xl">
      <!-- The reels window -->
      <div class="relative flex justify-center gap-4 py-8">
        <!-- Inner shadow / glass -->
        <div class="absolute left-1/2 top-1/2 h-32 w-64 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-8 border-orange-200 bg-orange-100 shadow-xl"></div>
        
        <div class="z-10 h-24 w-24 overflow-hidden rounded-2xl bg-white text-5xl font-black shadow-inner">
           <div class="flex flex-col {resetTransition || reducedMotion ? 'no-transition' : 'reel-strip'}" style:transform="translateY(-{offsetA * 6}rem)">
             {#each Array(50) as _, i}
               <div class="flex h-24 shrink-0 items-center justify-center text-slate-800">{currentSet.a[i % 8]}</div>
             {/each}
           </div>
        </div>

        <div class="z-10 h-24 w-24 overflow-hidden rounded-2xl bg-white text-5xl font-black shadow-inner">
           <div class="flex flex-col {resetTransition || reducedMotion ? 'no-transition' : 'reel-strip-b'}" style:transform="translateY(-{offsetB * 6}rem)">
             {#each Array(50) as _, i}
               <div class="flex h-24 shrink-0 items-center justify-center text-slate-800">{currentSet.b[i % 8]}</div>
             {/each}
           </div>
        </div>
      </div>
      
      <!-- The side lever -->
      <div class="absolute -right-6 top-1/2 h-32 w-4 origin-bottom -translate-y-1/2 rounded-full bg-slate-300 transition-transform duration-300 {phase === 'spinning' ? 'rotate-[60deg]' : '-rotate-12'}">
        <div class="absolute -left-3 -top-4 h-10 w-10 rounded-full bg-red-500 shadow-md"></div>
      </div>
    </div>
    
    <!-- Mini robot reaction -->
    <div class="mt-6 flex h-24 justify-center">
      <Robot mood={phase === 'spinning' ? 'idle' : currentResult?.isReal ? 'happy' : phase === 'reading' ? 'idle' : phase === 'result' ? 'happy' : 'idle'} size={90} head={rc.head} body={rc.body} />
    </div>

    <!-- Big PUTAR button -->
    <div class="mt-8 flex justify-center">
      <button 
        disabled={phase !== 'ready' && phase !== 'result'}
        onclick={playSpins}
        class="relative flex h-24 w-64 items-center justify-center rounded-full bg-red-500 text-4xl font-black text-white shadow-[0_8px_0_#b91c1c] active:translate-y-2 active:shadow-none disabled:translate-y-2 disabled:opacity-80 disabled:shadow-none {(phase === 'ready' || phase === 'result') ? 'animate-bounce' : ''}"
      >
        PUTAR! 🎰
      </button>
    </div>
    
    <div class="mt-8 flex flex-wrap justify-center gap-2 px-4">
      {#each roundFoundWords as w}
        <div class="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold shadow-sm">{w.pic || ''} {w.w}</div>
      {/each}
    </div>
  </div>
{/if}

{#if showBank}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div class="flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header class="flex items-center justify-between bg-orange-500 px-5 py-4 text-white">
        <h2 class="text-xl font-black">📚 Kata-kataku</h2>
        <span class="text-lg font-bold">{bankCount}/{allMesinWords.length}</span>
        <button onclick={() => showBank = false} aria-label="Tutup" class="text-3xl active:scale-95">✖️</button>
      </header>
      <div class="flex-1 overflow-y-auto p-5">
        <div class="grid grid-cols-3 gap-3">
           {#each allMesinWords as item}
             {@const found = profiles.mesinWords.includes(item.w)}
             <button disabled={!found}
                onclick={() => player.speak(voiceId, item.pic ? 'words' : 'mesin', item.w)}
                class="flex flex-col items-center justify-center rounded-2xl border-2 p-2 {found ? 'border-amber-300 bg-amber-50 shadow-sm active:scale-95' : 'border-slate-100 bg-slate-50 opacity-60'}">
                {#if found}
                  <span class="text-3xl">{item.pic || '✨'}</span>
                  <span class="mt-1 text-sm font-bold text-slate-800">{item.w}</span>
                {:else}
                  <span class="text-3xl text-slate-300">❓</span>
                  <span class="mt-1 text-sm font-bold text-slate-300">???</span>
                {/if}
             </button>
           {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
