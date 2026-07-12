<script>
  import { onDestroy } from 'svelte';

  // Post-correct-answer blend reveal for CV syllables: "b" flies in from the left,
  // "+" pops, "a" flies in from the right, "=" pops, then everything slams together
  // into the golden syllable. Stages advance as the caller's speak promises resolve,
  // so the visuals stay synced to the voice ("b… a… ba!") whatever the clip lengths.
  const ST = { HIDDEN: 0, IN: 1, L1: 2, PLUS: 3, L2: 4, EQ: 5, MERGE: 6, OUT: 7 };

  /** @type {{ onmerge?: (x: number, y: number) => void }} */
  let { onmerge = undefined } = $props();

  let stage = $state(ST.HIDDEN);
  let letters = $state(/** @type {string[]} */ ([]));
  let syllable = $state('');
  let reduced = $state(false); // prefers-reduced-motion: static equation, voice still plays
  /** @type {HTMLElement|null} */
  let resultEl = $state(null);
  /** @type {((v: 'skipped') => void) | null} */
  let skipResolve = null;
  let settled = false;
  // Taps land here fast after the winning tile tap; ignore skips for a beat so an
  // excited double-tap on the tile doesn't blow past the reveal it just earned.
  let armedAt = 0;

  const delay = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * Run the full reveal. Audio is the caller's job (speak callbacks + an
   * already-started praise promise); audio teardown on skip is too.
   * @param {{
   *   letters: string[],
   *   syllable: string,
   *   praise: Promise<void>,
   *   speakLetter: (L: string) => Promise<void>,
   *   speakSyllable: (s: string) => Promise<void>
   * }} opts
   * @returns {Promise<'done'|'skipped'>} resolves exactly once
   */
  export async function play({ letters: L, syllable: s, praise, speakLetter, speakSyllable }) {
    skipResolve?.('skipped'); // defensive: unwind a stale run before starting over
    letters = L;
    syllable = s;
    settled = false;
    armedAt = performance.now() + 350;
    reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const skipped = new Promise((r) => (skipResolve = r));
    /** @param {Promise<any>} p */
    const step = (p) => Promise.race([skipped, p.then(() => 'done')]);
    // Each stage waits for BOTH its audio and a minimum visual time: audio-driven when
    // clips play, floor-timed when speak() resolves instantly (muted / missing clip).
    const paced = (/** @type {Promise<any>} */ audio, /** @type {number} */ minMs) =>
      step(Promise.all([Promise.resolve(audio).catch(() => {}), delay(reduced ? 0 : minMs)]));

    stage = ST.IN; // overlay slides in while the praise ("Hebat!") is still playing
    let r = await paced(praise, 300);
    if (r !== 'skipped') { stage = ST.L1; r = await paced(speakLetter(L[0]), 420); }
    if (r !== 'skipped') { stage = ST.PLUS; r = await step(delay(reduced ? 0 : 180)); }
    if (r !== 'skipped') { stage = ST.L2; r = await paced(speakLetter(L[1]), 420); }
    if (r !== 'skipped') { stage = ST.EQ; r = await step(delay(reduced ? 0 : 180)); }
    if (r !== 'skipped') {
      stage = ST.MERGE;
      if (!reduced) {
        requestAnimationFrame(() => {
          const rect = resultEl?.getBoundingClientRect();
          if (rect && stage === ST.MERGE)
            onmerge?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
      }
      r = await paced(speakSyllable(s), 500);
    }
    if (r !== 'skipped') r = await step(delay(reduced ? 100 : 350)); // hold the payoff
    if (r !== 'skipped') { stage = ST.OUT; await step(delay(reduced ? 0 : 200)); }
    settled = true;
    skipResolve = null;
    stage = ST.HIDDEN;
    return r === 'skipped' ? 'skipped' : 'done';
  }

  function skip() {
    if (settled || !skipResolve) return; // double/triple taps are no-ops
    if (performance.now() < armedAt) return;
    settled = true;
    skipResolve('skipped');
  }

  // Unmount mid-sequence (route change) unwinds a pending play() immediately.
  onDestroy(() => skipResolve?.('skipped'));
</script>

{#if stage > ST.HIDDEN}
  <button
    class="bl-overlay fixed inset-0 z-40 flex w-full items-center justify-center border-0 bg-white/70 backdrop-blur-sm"
    class:bl-out={stage >= ST.OUT}
    onpointerdown={skip}
    onclick={skip}
    aria-label="Lanjut"
  >
    <div class="bl-card">
      {#if reduced}
        <!-- Static equation (same language as the teach-phase blend row) -->
        <div class="flex items-center gap-3 text-5xl font-black sm:text-6xl">
          <span class="rounded-2xl bg-white px-4 py-2 text-slate-700 shadow">{letters[0]}</span>
          <span class="text-amber-500">+</span>
          <span class="rounded-2xl bg-white px-4 py-2 text-slate-700 shadow">{letters[1]}</span>
          <span class="text-slate-400">=</span>
          <span class="rounded-2xl bg-amber-400 px-4 py-2 text-white shadow">{syllable}</span>
        </div>
      {:else}
        <div class="grid place-items-center">
          <div
            class="bl-eq flex items-center gap-4 text-6xl font-black sm:text-7xl"
            class:bl-merging={stage >= ST.MERGE}
            style="grid-area: 1 / 1"
          >
            {#if stage >= ST.L1}
              <span class="bl-from-left rounded-2xl bg-white px-5 py-3 text-slate-700 shadow-lg"
                >{letters[0]}</span
              >
            {/if}
            {#if stage >= ST.PLUS}<span class="bl-pop text-amber-500">+</span>{/if}
            {#if stage >= ST.L2}
              <span class="bl-from-right rounded-2xl bg-white px-5 py-3 text-slate-700 shadow-lg"
                >{letters[1]}</span
              >
            {/if}
            {#if stage >= ST.EQ}<span class="bl-pop text-slate-400">=</span>{/if}
          </div>
          {#if stage >= ST.MERGE}
            <span
              bind:this={resultEl}
              class="bl-result rounded-3xl bg-amber-400 px-8 py-4 text-7xl font-black text-white sm:text-8xl"
              style="grid-area: 1 / 1">{syllable}</span
            >
          {/if}
        </div>
      {/if}
    </div>
  </button>
{/if}

<style>
  .bl-overlay {
    cursor: pointer;
    animation: bl-fadein 0.25s ease-out;
  }
  @keyframes bl-fadein {
    from { opacity: 0; }
  }
  .bl-overlay.bl-out {
    animation: bl-fadeout 0.2s ease forwards;
  }
  @keyframes bl-fadeout {
    to { opacity: 0; }
  }

  .bl-card {
    animation: bl-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes bl-in {
    from { opacity: 0; transform: translateY(28px) scale(0.9); }
  }

  .bl-from-left {
    animation: bl-from-left 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes bl-from-left {
    from { transform: translateX(-45vw) scale(0.6) rotate(-8deg); opacity: 0.4; }
  }
  .bl-from-right {
    animation: bl-from-right 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes bl-from-right {
    from { transform: translateX(45vw) scale(0.6) rotate(8deg); opacity: 0.4; }
  }

  .bl-pop {
    animation: bl-pop 0.25s ease-out;
  }
  @keyframes bl-pop {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  /* The equation collapses into the center as the golden result slams in over it. */
  .bl-merging {
    animation: bl-merge 0.28s ease-in forwards;
  }
  @keyframes bl-merge {
    to { transform: scale(0.3); opacity: 0; }
  }

  .bl-result {
    animation: bl-slam 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow:
      0 0 44px rgba(251, 191, 36, 0.65),
      0 10px 24px rgba(0, 0, 0, 0.12);
  }
  @keyframes bl-slam {
    0% { transform: scale(0.2) rotate(-6deg); opacity: 0; }
    60% { transform: scale(1.22) rotate(2deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .bl-overlay,
    .bl-overlay.bl-out,
    .bl-card,
    .bl-from-left,
    .bl-from-right,
    .bl-pop,
    .bl-merging,
    .bl-result {
      animation: none;
    }
  }
</style>
