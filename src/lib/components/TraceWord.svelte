<script>
  import { player } from '$lib/audio/player.svelte.js';

  /**
   * Trace mode: the child finger-traces each UPPERCASE letter of the word, left to
   * right. Grading is COVERAGE-ONLY (no stroke order): we render the letter glyph to an
   * offscreen mask, then mark ink pixels the finger passes over. At ~70% covered the
   * letter is "written", its sound plays, and we advance. The parent remounts this
   * component per word (`{#key}`), so the word is fixed for the component's lifetime.
   *
   * @type {{ word: { w: string, e: string }, voiceId: string, oncomplete?: () => void }}
   */
  let { word, voiceId, oncomplete } = $props();

  const letters = $derived([...word.w.toUpperCase()]);
  const SIZE = 280; // internal pixel buffer (CSS scales it down responsively)
  const BRUSH = 14; // finger radius in buffer px — forgiving, but tight enough to track the trace
  const THRESHOLD = 0.85; // fraction of the glyph that must be covered before it counts as written

  let activeIdx = $state(0);
  let progress = $state(0);
  /** @type {HTMLCanvasElement} */
  let canvasEl;
  /** @type {CanvasRenderingContext2D} */
  let ctx;
  let mask = /** @type {Uint8Array} */ (new Uint8Array(0));
  let covered = /** @type {Uint8Array} */ (new Uint8Array(0));
  let inkCount = 0;
  let coveredCount = 0;
  let drawing = false;
  let locked = false;
  let last = /** @type {{ x: number, y: number } | null} */ (null);

  const FONT = (px) => `900 ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;

  // Re-setup the canvas whenever the active letter changes (and once on mount).
  $effect(() => {
    activeIdx;
    if (canvasEl) setupLetter(letters[activeIdx]);
  });

  /** @param {string} letter */
  function setupLetter(letter) {
    ctx = /** @type {CanvasRenderingContext2D} */ (canvasEl.getContext('2d'));
    buildMask(letter);
    drawGuide(letter);
    drawing = false;
    locked = false;
    last = null;
    progress = 0;
  }

  /** @param {string} letter */
  function drawGuide(letter) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#e2e8f0'; // slate-200 — faint letter to trace over
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = FONT(SIZE * 0.82);
    ctx.fillText(letter, SIZE / 2, SIZE / 2 + SIZE * 0.03);
  }

  /** Sample the glyph's solid pixels into a coverage mask. @param {string} letter */
  function buildMask(letter) {
    const off = document.createElement('canvas');
    off.width = off.height = SIZE;
    const o = /** @type {CanvasRenderingContext2D} */ (off.getContext('2d'));
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.font = FONT(SIZE * 0.82);
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
  }

  /** @param {PointerEvent} e */
  function pos(e) {
    const r = canvasEl.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * SIZE) / r.width, y: ((e.clientY - r.top) * SIZE) / r.height };
  }

  /** Mark glyph ink within BRUSH of (x,y) as covered. @param {number} x @param {number} y */
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

  function evalCoverage() {
    progress = inkCount ? coveredCount / inkCount : 0;
    if (progress >= THRESHOLD && !locked) {
      locked = true;
      letterComplete();
    }
  }

  function letterComplete() {
    player.speak(voiceId, 1, letters[activeIdx].toLowerCase()); // reuse per-letter clip
    setTimeout(() => {
      if (activeIdx + 1 >= letters.length) oncomplete?.();
      else activeIdx++;
    }, 280);
  }

  /** @param {PointerEvent} e */
  function down(e) {
    if (locked) return;
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
    if (!drawing || locked || !last) return;
    const p = pos(e);
    stroke(last, p);
    last = p;
  }

  function up() {
    drawing = false;
    last = null;
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

  <canvas
    bind:this={canvasEl}
    width={SIZE}
    height={SIZE}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointerleave={up}
    class="aspect-square w-full max-w-[280px] touch-none rounded-3xl bg-white shadow"
  ></canvas>

  <!-- Coverage meter (motivating fill bar) -->
  <div class="h-2 w-full max-w-[280px] overflow-hidden rounded-full bg-slate-100">
    <div class="h-full rounded-full bg-amber-400 transition-[width] duration-100" style="width:{Math.min(100, Math.round(progress * 100))}%"></div>
  </div>
</div>
