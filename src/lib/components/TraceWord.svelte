<script>
  import { onDestroy } from 'svelte';
  import { player } from '$lib/audio/player.svelte.js';
  import { chimeCorrect, buzzWrong } from '$lib/audio/sfx.js';
  import { SPEAK_TRY } from '$lib/content/feedback.js';

  /**
   * Trace mode: the child finger-traces each UPPERCASE letter of the word, left to
   * right. Grading is coverage-based (no stroke order): we render the letter glyph to an
   * offscreen mask, then mark ink pixels the finger passes over. At 80% covered — with
   * every target spot drawn through (invisible spots on each stroke, so e.g. A's crossbar
   * can't be skipped) — the letter is "written", its sound plays, and we advance. Ink far OUTSIDE the letter is
   * tracked too — too much stray ink fails the attempt gently (buzz + shake + "coba
   * lagi", wipe, same letter), so canvas-wide scribbling can't pass. The parent remounts
   * this component per word (`{#key}`), so the word is fixed for the component's lifetime.
   *
   * @type {{ word: { w: string, e: string }, voiceId: string, oncomplete?: () => void, onwrong?: () => void }}
   */
  let { word, voiceId, oncomplete, onwrong } = $props();

  // Encouragement that does NOT say "baca"/read — this is writing (same as SpellWord).
  const TRY_AGAIN = SPEAK_TRY.filter((s) => !/baca/i.test(s));

  const letters = $derived([...word.w.toUpperCase()]);
  const SIZE = 280; // internal pixel buffer (CSS scales it down responsively)
  const BRUSH = 16; // finger radius in buffer px — covers the thin core when tracing the path
  const THRESHOLD = 0.8; // fraction of the (thin-core) glyph that must be covered to count
  // Overall coverage alone lets a whole stroke be skipped (A passed on its two legs
  // without the crossbar), so we scatter a few invisible target spots over the letter's
  // stroke cores that the finger must draw through — it has to pass within DOT_HIT of
  // each before the letter completes. The radius is tight, so bowed-in legs that pass
  // NEAR the crossbar spot don't trip it; a spot only registers when actually drawn over.
  const DOT_MAX = 8; // most dots on any one letter
  const DOT_MIN_GAP = 46; // px — stop adding dots once they'd crowd each other
  const DOT_HIT = 22; // px — finger centre must pass this close to a dot to light it
  const DOT_ERODE = 6; // place dots this far inside the glyph edge (on stroke cores)
  // Stray-ink limits (tuned for SIZE/BRUSH above). BOTH must be exceeded to fail:
  // the floor so a few wild taps/overshoots (~800px each) can never fail alone, and
  // the ratio so heavy-but-honest tracing of a narrow letter isn't punished.
  const OUTSIDE_MIN_PX = 3000; // stray px floor — ≈3-4 stray taps; an edge-to-edge swipe (~9k) exceeds it
  const OUTSIDE_RATIO = 0.35; // stray / (stray + near-letter): scribble ≥0.55, sloppy trace ≤0.3
  const LIVE_STRAY_MULT = 2; // mid-stroke check needs 2× the floor, so it only stops sustained scribble

  let activeIdx = $state(0);
  let progress = $state(0);
  let popping = $state(false); // brief ✓ + chime when a letter is finished
  /** @type {HTMLDivElement} */
  let cardEl; // the canvas wrapper — imperatively shaken on a messy fail
  /** Visible must-touch target dots (buffer px); `hit` flips when the finger draws through. */
  let dots = $state(/** @type {{ x: number, y: number, hit: boolean }[]} */ ([]));
  /** Pending advance timer — cleared on unmount so it can't fire after the remount. */
  let advanceTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  /** Pending messy-fail reset timer — cleared on letter change and unmount. */
  let failTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined);
  /** @type {HTMLCanvasElement} */
  let canvasEl;
  /** @type {CanvasRenderingContext2D} */
  let ctx;
  let mask = /** @type {Uint8Array} */ (new Uint8Array(0));
  let covered = /** @type {Uint8Array} */ (new Uint8Array(0));
  /** Tolerance zone: the glyph fattened well past the visible guide — ink here is never stray. */
  let zone = /** @type {Uint8Array} */ (new Uint8Array(0));
  /** Every canvas pixel the brush has touched (counted once, in or out of the zone). */
  let touched = /** @type {Uint8Array} */ (new Uint8Array(0));
  let inkCount = 0;
  let coveredCount = 0;
  let touchedInCount = 0;
  let strayCount = 0;
  let drawing = false;
  let locked = false;
  let failing = false; // mid messy-fail (feedback + wipe pending) — input is inert
  let last = /** @type {{ x: number, y: number } | null} */ (null);

  const FAMILY = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  // Thick glyph to trace OVER; a thinner core is the coverage TARGET, so a faithful
  // path-trace fills it (a finger-brush can't reach the fat glyph's outer edges).
  const GUIDE_FONT = (px) => `900 ${px}px ${FAMILY}`;
  const MASK_FONT = (px) => `600 ${px}px ${FAMILY}`;

  // Re-setup the canvas whenever the active letter changes (and once on mount).
  $effect(() => {
    activeIdx;
    if (canvasEl) setupLetter(letters[activeIdx]);
  });

  /** @param {string} letter */
  function setupLetter(letter) {
    ctx = /** @type {CanvasRenderingContext2D} */ (canvasEl.getContext('2d'));
    clearTimeout(failTimer);
    buildMask(letter);
    drawGuide(letter);
    drawing = false;
    locked = false;
    failing = false;
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

  /** Sample the glyph into the coverage mask + stray-tolerance zone. @param {string} letter */
  function buildMask(letter) {
    const off = document.createElement('canvas');
    off.width = off.height = SIZE;
    const o = /** @type {CanvasRenderingContext2D} */ (off.getContext('2d'));
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.font = MASK_FONT(SIZE * 0.82);
    o.fillStyle = '#000';
    o.fillText(letter, SIZE / 2, SIZE / 2 + SIZE * 0.03);
    const d = o.getImageData(0, 0, SIZE, SIZE).data;
    mask = new Uint8Array(SIZE * SIZE);
    covered = new Uint8Array(SIZE * SIZE);
    inkCount = 0;
    coveredCount = 0;
    for (let i = 0; i < mask.length; i++) {
      if (d[i * 4 + 3] > 40) {
        mask[i] = 1;
        inkCount++;
      }
    }
    // Tolerance zone: the fat guide glyph dilated by the brush width, so wobble on or
    // near the visible letter never counts as stray (mask ⊂ zone by construction).
    o.clearRect(0, 0, SIZE, SIZE);
    o.font = GUIDE_FONT(SIZE * 0.82);
    o.strokeStyle = '#000';
    o.lineWidth = BRUSH * 2;
    o.fillText(letter, SIZE / 2, SIZE / 2 + SIZE * 0.03);
    o.strokeText(letter, SIZE / 2, SIZE / 2 + SIZE * 0.03);
    const z = o.getImageData(0, 0, SIZE, SIZE).data;
    zone = new Uint8Array(SIZE * SIZE);
    touched = new Uint8Array(SIZE * SIZE);
    touchedInCount = 0;
    strayCount = 0;
    for (let i = 0; i < zone.length; i++) {
      if (z[i * 4 + 3] > 40) zone[i] = 1;
    }
    sampleDots();
  }

  /** Scatter up to DOT_MAX target dots over the glyph's stroke cores (greedy
   *  farthest-point spread, stopping once dots would crowd), so every stroke — including
   *  the one a child is most likely to skip — carries a dot they must draw through. */
  function sampleDots() {
    const e = DOT_ERODE;
    let pool = [];
    for (let y = e; y < SIZE - e; y += 2) {
      for (let x = e; x < SIZE - e; x += 2) {
        if (!mask[y * SIZE + x]) continue;
        let core = true;
        for (let dy = -e; dy <= e && core; dy += 2) {
          for (let dx = -e; dx <= e; dx += 2) {
            if (!mask[(y + dy) * SIZE + (x + dx)]) {
              core = false;
              break;
            }
          }
        }
        if (core) pool.push(y * SIZE + x);
      }
    }
    if (pool.length < 30) {
      // glyph too thin to erode (unlikely at weight 600) — fall back to raw ink
      pool = [];
      for (let i = 0; i < mask.length; i += 2) if (mask[i]) pool.push(i);
    }
    const out = /** @type {{ x: number, y: number, hit: boolean }[]} */ ([]);
    if (pool.length) {
      const minD = new Float64Array(pool.length).fill(Infinity);
      let next = pool[0]; // topmost core px — deterministic start
      for (let k = 0; k < DOT_MAX && next >= 0; k++) {
        const cx = next % SIZE;
        const cy = (next / SIZE) | 0;
        out.push({ x: cx, y: cy, hit: false });
        next = -1;
        let bestD = -1;
        for (let j = 0; j < pool.length; j++) {
          const dx = (pool[j] % SIZE) - cx;
          const dy = ((pool[j] / SIZE) | 0) - cy;
          const dd = dx * dx + dy * dy;
          if (dd < minD[j]) minD[j] = dd;
          if (minD[j] > bestD) {
            bestD = minD[j];
            next = pool[j];
          }
        }
        if (bestD < DOT_MIN_GAP * DOT_MIN_GAP) break; // rest would crowd existing dots
      }
    }
    dots = out;
  }

  /** @param {PointerEvent} e */
  function pos(e) {
    const r = canvasEl.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * SIZE) / r.width, y: ((e.clientY - r.top) * SIZE) / r.height };
  }

  /** Mark glyph ink within BRUSH of (x,y) as covered; tally in-zone vs stray pixels;
   * light any target dot the finger passes through. @param {number} x @param {number} y */
  function cover(x, y) {
    for (const dot of dots) {
      if (dot.hit) continue;
      const dx = x - dot.x;
      const dy = y - dot.y;
      if (dx * dx + dy * dy <= DOT_HIT * DOT_HIT) dot.hit = true;
    }
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

  /** Too much ink outside the letter? Needs BOTH the absolute floor and the ratio.
   * @param {number} [mult] raises the floor for the mid-stroke (live) check */
  function isMessy(mult = 1) {
    if (strayCount < OUTSIDE_MIN_PX * mult) return false;
    return strayCount / (strayCount + touchedInCount) >= OUTSIDE_RATIO;
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

  /** @template T @param {T[]} a */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /** Shake the card imperatively (Web Animations API) so it replays on EVERY fail —
   *  a CSS class toggle only re-fires when the class was truly removed first, which the
   *  earlier rAF retoggle didn't guarantee (2nd fail onward never re-triggered). */
  function shakeCard() {
    if (!cardEl || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    cardEl.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(0)' }
      ],
      { duration: 300, easing: 'ease-in-out' }
    );
  }

  /** Gentle messy fail: buzz + shake + "coba lagi", wipe the ink, retry the SAME
   *  letter. No attempt counter, no round-score cost — identical feedback every time. */
  function messyFail() {
    if (failing) return; // live check, pointerleave and pointerup can race — judge once
    failing = true;
    drawing = false;
    last = null;
    buzzWrong();
    onwrong?.(); // let the shell make the robot look sad
    player.speak(voiceId, 'words', pick(TRY_AGAIN));
    shakeCard();
    clearTimeout(failTimer);
    failTimer = setTimeout(() => {
      drawGuide(letters[activeIdx]); // wipes the ink; same letter, so no mask rebuild
      covered.fill(0);
      touched.fill(0);
      for (const dot of dots) dot.hit = false;
      coveredCount = 0;
      touchedInCount = 0;
      strayCount = 0;
      progress = 0;
      failing = false;
    }, 350); // just past the 0.3s shake
  }

  onDestroy(() => {
    clearTimeout(advanceTimer);
    clearTimeout(failTimer);
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
    // Live check: stop a sustained scribble mid-stroke, without waiting for the lift.
    if (isMessy(LIVE_STRAY_MULT)) messyFail();
  }

  // Judge on lift: messy first (so scribbled-to-80% still fails), then the pass check.
  // Passing needs overall coverage AND every target dot drawn through — else keep tracing.
  function up() {
    drawing = false;
    last = null;
    if (locked || failing) return;
    if (isMessy()) {
      messyFail();
    } else if (progress >= THRESHOLD && dots.every((d) => d.hit)) {
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

  <div bind:this={cardEl} class="relative w-full max-w-[280px]" class:pop={popping}>
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
  @keyframes pop {
    0% { transform: scale(1); }
    40% { transform: scale(1.06); }
    100% { transform: scale(1); }
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
  /* (The messy-fail shake is driven imperatively in JS — see shakeCard.) */
  @media (prefers-reduced-motion: reduce) {
    .pop, .check :global(span) { animation: none; }
  }
</style>
