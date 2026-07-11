<script>
  import { onDestroy } from 'svelte';
  import { player } from '$lib/audio/player.svelte.js';
  import { buzzWrong, chimeCorrect } from '$lib/audio/sfx.js';
  import { SPEAK_TRY } from '$lib/content/feedback.js';

  /**
   * Trace mode: the child finger-traces each UPPERCASE letter of the word, left to
   * right. Grading is coverage-based with a generous outside-the-lines retry guard:
   * we render the letter glyph to an offscreen mask, then mark ink pixels the finger
   * passes over. At 80% covered the letter is "written", its sound plays, and we
   * advance. The parent remounts this component per word (`{#key}`), so the word is
   * fixed for the component's lifetime.
   *
   * @type {{ word: { w: string, e: string }, voiceId: string, oncomplete?: () => void, onwrong?: () => void }}
   */
  let { word, voiceId, oncomplete, onwrong } = $props();

  const letters = $derived([...word.w.toUpperCase()]);
  // Encouragement that does NOT reveal the spelling (drop the "baca"/read line — this is writing).
  const TRY_AGAIN = SPEAK_TRY.filter((s) => !/baca/i.test(s));
  const SIZE = 280; // internal pixel buffer (CSS scales it down responsively)
  const BRUSH = 16; // finger radius in buffer px — covers the thin core when tracing the path
  const THRESHOLD = 0.8; // fraction of the (thin-core) glyph that must be covered to count
  const OUTSIDE_MIN_PX = 4000; // floor so a few wobbly/off-letter taps never fail alone
  const OUTSIDE_RATIO = 0.4; // fail only when outside ink dominates the attempt
  const OVERFILL_MIN_PX = 36000; // dense coloring, beyond what guide-only tracing can touch
  const LIVE_STRAY_MULT = 2; // live checks need a bigger floor than lift-time judgment

  let activeIdx = $state(0);
  let progress = $state(0);
  let popping = $state(false); // brief ✓ + chime when a letter is finished
  let shaking = $state(false); // gentle retry shake for messy attempts
  let failing = $state(false); // blocks double-fire during shake/reset
  /** Pending advance timer — cleared on unmount so it can't fire after the remount. */
  let advanceTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  /** Pending messy-fail reset timer — cleared on unmount/letter setup. */
  let failTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  /** Pending shake retoggle frame — cancelled if the letter remounts/unmounts mid-fail. */
  let shakeFrame = /** @type {number | undefined} */ (undefined);
  /** @type {HTMLCanvasElement} */
  let canvasEl;
  /** @type {CanvasRenderingContext2D} */
  let ctx;
  let mask = /** @type {Uint8Array} */ (new Uint8Array(0));
  let zone = /** @type {Uint8Array} */ (new Uint8Array(0));
  let covered = /** @type {Uint8Array} */ (new Uint8Array(0));
  let touched = /** @type {Uint8Array} */ (new Uint8Array(0));
  let inkCount = 0;
  let coveredCount = 0;
  let touchedInCount = 0;
  let strayCount = 0;
  let drawing = false;
  let locked = false;
  let last = /** @type {{ x: number, y: number } | null} */ (null);

  const FAMILY = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  // Thick glyph to trace OVER; a thinner core is the coverage TARGET, so a faithful
  // path-trace fills it (a finger-brush can't reach the fat glyph's outer edges).
  /** @param {number} px */
  const GUIDE_FONT = (px) => `900 ${px}px ${FAMILY}`;
  /** @param {number} px */
  const MASK_FONT = (px) => `600 ${px}px ${FAMILY}`;

  // Re-setup the canvas whenever the active letter changes (and once on mount).
  $effect(() => {
    activeIdx;
    if (canvasEl) setupLetter(letters[activeIdx]);
  });

  /** @param {string} letter */
  function setupLetter(letter) {
    clearFailFeedback();
    ctx = /** @type {CanvasRenderingContext2D} */ (canvasEl.getContext('2d'));
    buildMask(letter);
    drawGuide(letter);
    drawing = false;
    locked = false;
    failing = false;
    shaking = false;
    last = null;
    progress = 0;
  }

  /** @param {string} letter */
  function drawGuide(letter) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#e2e8f0'; // slate-200 — faint letter to trace over
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = GUIDE_FONT(SIZE * 0.82);
    ctx.fillText(letter, SIZE / 2, SIZE / 2 + SIZE * 0.03);
  }

  /** Sample the glyph's solid pixels into coverage and tolerance masks. @param {string} letter */
  function buildMask(letter) {
    const off = document.createElement('canvas');
    off.width = off.height = SIZE;
    const o = /** @type {CanvasRenderingContext2D} */ (off.getContext('2d'));
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.fillStyle = '#000';
    o.font = MASK_FONT(SIZE * 0.82);
    o.fillText(letter, SIZE / 2, SIZE / 2 + SIZE * 0.03);
    const maskData = o.getImageData(0, 0, SIZE, SIZE).data;

    o.clearRect(0, 0, SIZE, SIZE);
    o.font = GUIDE_FONT(SIZE * 0.82);
    o.lineWidth = BRUSH * 2;
    o.lineJoin = 'round';
    o.strokeStyle = '#000';
    o.fillStyle = '#000';
    o.fillText(letter, SIZE / 2, SIZE / 2 + SIZE * 0.03);
    o.strokeText(letter, SIZE / 2, SIZE / 2 + SIZE * 0.03);
    const zoneData = o.getImageData(0, 0, SIZE, SIZE).data;

    mask = new Uint8Array(SIZE * SIZE);
    zone = new Uint8Array(SIZE * SIZE);
    covered = new Uint8Array(SIZE * SIZE);
    touched = new Uint8Array(SIZE * SIZE);
    inkCount = 0;
    for (let i = 0; i < mask.length; i++) {
      if (maskData[i * 4 + 3] > 40) {
        mask[i] = 1;
        inkCount++;
      }
      if (zoneData[i * 4 + 3] > 40 || mask[i]) zone[i] = 1;
    }
    resetAttempt();
  }

  /** @param {PointerEvent} e */
  function pos(e) {
    const r = canvasEl.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * SIZE) / r.width, y: ((e.clientY - r.top) * SIZE) / r.height };
  }

  /** Reset this letter's drawn attempt without rebuilding the masks. */
  function resetAttempt() {
    covered.fill(0);
    touched.fill(0);
    coveredCount = 0;
    touchedInCount = 0;
    strayCount = 0;
    progress = 0;
  }

  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /** Mark glyph ink within BRUSH of (x,y) as covered and track stray ink. @param {number} x @param {number} y */
  function cover(x, y) {
    const r = BRUSH;
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(x - r));
    const x1 = Math.min(SIZE - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r));
    const y1 = Math.min(SIZE - 1, Math.ceil(y + r));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx - x;
        const dy = yy - y;
        if (dx * dx + dy * dy > r2) continue;
        const i = yy * SIZE + xx;
        if (!touched[i]) {
          touched[i] = 1;
          if (zone[i]) touchedInCount++;
          else strayCount++;
        }
        if (mask[i] && !covered[i]) {
          covered[i] = 1;
          coveredCount++;
        }
      }
    }
  }

  /** Draw + cover a stroke segment, then re-check coverage. */
  function stroke(/** @type {{x:number,y:number}} */ a, /** @type {{x:number,y:number}} */ b) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = BRUSH * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / (BRUSH * 0.6)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      cover(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
    evalCoverage();
  }

  // Only update the live progress bar here — do NOT complete mid-stroke. The letter is
  // judged when the child lifts their finger (see up()), so it never snaps away while
  // they're still drawing.
  function evalCoverage() {
    progress = inkCount ? coveredCount / inkCount : 0;
  }

  /** @param {number} [mult] */
  function isMessy(mult = 1) {
    const totalTouched = touchedInCount + strayCount;
    if (!totalTouched || strayCount < OUTSIDE_MIN_PX * mult) return false;
    return strayCount / totalTouched >= OUTSIDE_RATIO || totalTouched >= OVERFILL_MIN_PX;
  }

  function clearFailFeedback() {
    clearTimeout(failTimer);
    failTimer = undefined;
    if (shakeFrame !== undefined) {
      cancelAnimationFrame(shakeFrame);
      shakeFrame = undefined;
    }
  }

  function messyFail() {
    if (failing || locked) return;
    failing = true;
    drawing = false;
    last = null;
    buzzWrong();
    onwrong?.();
    player.speak(voiceId, 'words', pick(TRY_AGAIN));
    shaking = false;
    if (shakeFrame !== undefined) cancelAnimationFrame(shakeFrame);
    shakeFrame = requestAnimationFrame(() => {
      shaking = true;
      shakeFrame = undefined;
    });
    clearTimeout(failTimer);
    failTimer = setTimeout(() => {
      drawGuide(letters[activeIdx]);
      resetAttempt();
      shaking = false;
      failing = false;
      failTimer = undefined;
    }, 350);
  }

  function letterComplete() {
    chimeCorrect(); // non-TTS "correct!" sound effect
    popping = true; // trigger the ✓ pop animation
    player.speak(voiceId, 1, letters[activeIdx].toLowerCase()); // reuse per-letter clip
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      popping = false;
      if (activeIdx + 1 >= letters.length) oncomplete?.();
      else activeIdx++;
    }, 520); // hold a beat so the ✓ + chime land before advancing
  }

  onDestroy(() => {
    clearTimeout(advanceTimer);
    clearFailFeedback();
  });

  /** @param {PointerEvent} e */
  function down(e) {
    if (locked || failing) return;
    drawing = true;
    last = pos(e);
    canvasEl.setPointerCapture?.(e.pointerId);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(last.x, last.y, BRUSH, 0, Math.PI * 2);
    ctx.fill();
    cover(last.x, last.y);
    evalCoverage();
  }

  /** @param {PointerEvent} e */
  function move(e) {
    if (!drawing || locked || failing || !last) return;
    const p = pos(e);
    stroke(last, p);
    last = p;
    if (isMessy(LIVE_STRAY_MULT)) messyFail();
  }

  // Judge on lift: fail outside-heavy attempts before accepting coverage.
  function up() {
    drawing = false;
    last = null;
    if (locked || failing) return;
    if (isMessy()) {
      messyFail();
      return;
    }
    if (progress >= THRESHOLD) {
      locked = true;
      letterComplete();
    }
  }
</script>

<div class="flex w-full flex-col items-center gap-3">
  <!-- Progress: which letters are written -->
  <div class="flex gap-1 text-3xl font-black tracking-wide">
    {#each letters as L, i (i)}
      <span class={i < activeIdx ? 'text-amber-500' : i === activeIdx ? 'text-slate-800' : 'text-slate-300'}>{L}</span>
    {/each}
  </div>

  <p class="text-sm text-slate-400">Tebalkan huruf <b class="text-slate-600">{letters[activeIdx]}</b></p>

  <div class="relative w-full max-w-[280px]" class:pop={popping} class:shake={shaking}>
    <canvas
      bind:this={canvasEl}
      width={SIZE}
      height={SIZE}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointerleave={up}
      class="aspect-square w-full touch-none rounded-3xl bg-white shadow"
    ></canvas>
    {#if popping}
      <div class="check pointer-events-none absolute inset-0 flex items-center justify-center">
        <span class="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-5xl text-white shadow-lg">✓</span>
      </div>
    {/if}
  </div>

  <!-- Coverage meter (motivating fill bar) -->
  <div class="h-2 w-full max-w-[280px] overflow-hidden rounded-full bg-slate-100">
    <div class="h-full rounded-full bg-amber-400 transition-[width] duration-100" style="width:{Math.min(100, Math.round(progress * 100))}%"></div>
  </div>
</div>

<style>
  /* A quick happy "pop" of the canvas when a letter is finished. */
  .pop {
    animation: pop 0.4s ease;
  }
  .shake {
    animation: shake 0.3s ease-in-out;
  }
  @keyframes pop {
    0% { transform: scale(1); }
    40% { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }
  /* The green ✓ badge springs in, then settles. */
  .check :global(span) {
    animation: check-in 0.45s cubic-bezier(0.2, 1.4, 0.4, 1);
  }
  @keyframes check-in {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pop, .shake, .check :global(span) { animation: none; }
  }
</style>
