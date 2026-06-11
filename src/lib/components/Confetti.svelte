<script>
  const COLORS = ['#f59e0b', '#22d3ee', '#34d399', '#f472b6', '#a78bfa', '#fb7185'];
  let pieces = $state(/** @type {any[]} */ ([]));
  let seq = 0;

  /** Fire a confetti burst. @param {number} n */
  export function fire(n = 28) {
    const batch = Array.from({ length: n }, () => ({
      id: seq++,
      left: Math.random() * 100,
      delay: Math.random() * 0.15,
      dur: 0.9 + Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 160 + 'px',
      rot: Math.random() * 720 - 360 + 'deg',
      size: 8 + Math.random() * 8,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      round: Math.random() > 0.5
    }));
    pieces = [...pieces, ...batch];
    const ids = new Set(batch.map((b) => b.id));
    setTimeout(() => (pieces = pieces.filter((p) => !ids.has(p.id))), 2000);
  }
</script>

<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
  {#each pieces as p (p.id)}
    <span
      class="piece"
      class:rounded-full={p.round}
      style="left:{p.left}%; width:{p.size}px; height:{p.size}px; background:{p.color};
        animation-duration:{p.dur}s; animation-delay:{p.delay}s; --drift:{p.drift}; --rot:{p.rot};"
    ></span>
  {/each}
</div>

<style>
  .piece {
    position: absolute;
    top: -6%;
    border-radius: 2px;
    animation-name: fall;
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
    animation-fill-mode: forwards;
  }
  @keyframes fall {
    0% { transform: translateY(-10vh) translateX(0) rotate(0); opacity: 1; }
    100% { transform: translateY(110vh) translateX(var(--drift)) rotate(var(--rot)); opacity: 0.9; }
  }
  @media (prefers-reduced-motion: reduce) {
    .piece { display: none; }
  }
</style>
