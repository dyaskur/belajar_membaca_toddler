<script>
  import { base } from '$app/paths';
  import { onDestroy } from 'svelte';
  import Robot from './Robot.svelte';

  /**
   * Parent gate: a press-and-hold speed bump shown before the settings page.
   * Trivial for an adult, motorically out of reach for most toddlers (they tap,
   * they don't hold). Client-side only — a speed bump, not security.
   *
   * @type {{ onpass: () => void }}
   */
  let { onpass } = $props();

  const HOLD_MS = 3000;

  let progress = $state(0); // 0..1 fill of the ring
  /** @type {number|undefined} rAF handle for the visual fill */
  let rafId;
  /** @type {ReturnType<typeof setTimeout>|undefined} completion timer */
  let doneTimer;
  /** @type {number|undefined} */
  let startedAt;
  let holding = false;

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // The fill loop only paints — the unlock is driven by doneTimer, so it stays
  // exact even when rAF is throttled (background tab, low-power device).
  /** @param {number} now */
  function tick(now) {
    if (!holding || startedAt === undefined) return;
    progress = Math.min((now - startedAt) / HOLD_MS, 1);
    if (holding) rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (holding) return;
    holding = true;
    startedAt = performance.now();
    doneTimer = setTimeout(finish, HOLD_MS);
    if (reduceMotion) {
      progress = 1; // no animation — just show it's engaged
    } else {
      rafId = requestAnimationFrame(tick);
    }
  }

  function stop() {
    if (!holding) return;
    cancel();
    progress = 0;
  }

  function cancel() {
    holding = false;
    startedAt = undefined;
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafId = undefined;
    }
    if (doneTimer !== undefined) {
      clearTimeout(doneTimer);
      doneTimer = undefined;
    }
  }

  function finish() {
    cancel();
    progress = 1;
    onpass();
  }

  /** @param {KeyboardEvent} e */
  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) start();
    }
  }

  /** @param {KeyboardEvent} e */
  function onKeyUp(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      stop();
    }
  }

  onDestroy(cancel);

  // Ring geometry.
  const R = 52;
  const C = 2 * Math.PI * R;
  const dash = $derived(C * (1 - progress));
</script>

<section class="mx-auto w-full max-w-xl text-center">
  <div class="w-full rounded-3xl bg-white p-6 shadow-xl sm:p-8">
    <div class="flex justify-center">
      <Robot mood="idle" size={120} interactive={false} />
    </div>
    <h1 class="mt-3 text-2xl font-black text-amber-600">Khusus orang tua 👋</h1>
    <p class="mt-2 text-slate-500">Tekan dan tahan tombol selama 3 detik.</p>

    <div class="mt-6 flex justify-center">
      <button
        type="button"
        onpointerdown={start}
        onpointerup={stop}
        onpointerleave={stop}
        onpointercancel={stop}
        onkeydown={onKeyDown}
        onkeyup={onKeyUp}
        aria-label="Tekan dan tahan selama 3 detik untuk membuka pengaturan"
        class="relative grid size-40 touch-none select-none place-items-center rounded-full bg-amber-500 text-white shadow-lg active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
      >
        <svg class="pointer-events-none absolute inset-0 size-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="8" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="white"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray={C}
            stroke-dashoffset={dash}
          />
        </svg>
        <span class="pointer-events-none text-5xl">🔒</span>
      </button>
    </div>

    <a
      href="{base}/"
      class="mt-8 inline-block w-full max-w-xs rounded-2xl bg-slate-100 px-8 py-4 text-xl font-black text-slate-500 active:scale-95"
    >
      ⬅️ Kembali
    </a>
  </div>
</section>
