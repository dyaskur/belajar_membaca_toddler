<script>
  const COLORS = ['#f59e0b', '#22d3ee', '#34d399', '#f472b6', '#a78bfa', '#fb7185'];
  const BURST_COLORS = ['#facc15', '#38bdf8', '#34d399', '#fb7185', '#c084fc', '#fdba74'];
  let pieces = $state(/** @type {any[]} */ ([]));
  let seq = 0;

  /**
   * @param {any[]} batch
   * @param {number} ms
   */
  function removeLater(batch, ms) {
    const ids = new Set(batch.map((b) => b.id));
    setTimeout(() => (pieces = pieces.filter((p) => !ids.has(p.id))), ms);
  }

  /** Fire a confetti burst. @param {number} n */
  export function fire(n = 28) {
    const batch = Array.from({ length: n }, () => ({
      id: seq++,
      kind: 'fall',
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
    removeLater(batch, 2000);
  }

  /**
   * Fire confetti and star particles from a viewport point.
   * @param {{ x: number, y: number } | null | undefined} origin
   * @param {number} n
   */
  export function burst(origin, n = 30) {
    const x = origin?.x ?? (typeof window === 'undefined' ? 0 : window.innerWidth / 2);
    const y = origin?.y ?? (typeof window === 'undefined' ? 0 : window.innerHeight / 2);
    const batch = Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const distance = 64 + Math.random() * 120;
      return {
        id: seq++,
        kind: 'burst',
        x,
        y,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance + 12,
        dur: 0.62 + Math.random() * 0.28,
        rot: Math.random() * 540 - 270 + 'deg',
        scale: 0.7 + Math.random() * 0.65,
        size: 7 + Math.random() * 10,
        color: BURST_COLORS[(Math.random() * BURST_COLORS.length) | 0],
        round: Math.random() > 0.62,
        star: Math.random() > 0.68
      };
    });
    pieces = [...pieces, ...batch];
    removeLater(batch, 1100);
  }
</script>

<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
  {#each pieces as p (p.id)}
    <span
      class="piece {p.kind === 'burst' ? 'burst-piece' : 'fall-piece'}"
      class:rounded-full={p.round}
      class:star-piece={p.star}
      style={p.kind === 'burst'
        ? `left:${p.x}px; top:${p.y}px; width:${p.size}px; height:${p.size}px; background:${p.color};
          animation-duration:${p.dur}s; --dx:${p.dx}px; --dy:${p.dy}px; --rot:${p.rot}; --scale:${p.scale};`
        : `left:${p.left}%; width:${p.size}px; height:${p.size}px; background:${p.color};
          animation-duration:${p.dur}s; animation-delay:${p.delay}s; --drift:${p.drift}; --rot:${p.rot};`}
    ></span>
  {/each}
</div>

<style>
  .piece {
    position: absolute;
    border-radius: 2px;
  }
  .fall-piece {
    top: -6%;
    animation-name: fall;
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
    animation-fill-mode: forwards;
  }
  .burst-piece {
    transform: translate(-50%, -50%) scale(0.4);
    animation-name: burst;
    animation-timing-function: cubic-bezier(0.14, 0.78, 0.34, 1);
    animation-fill-mode: forwards;
  }
  .star-piece {
    clip-path: polygon(50% 0%, 62% 34%, 98% 35%, 69% 56%, 79% 92%, 50% 71%, 21% 92%, 31% 56%, 2% 35%, 38% 34%);
  }
  @keyframes fall {
    0% { transform: translateY(-10vh) translateX(0) rotate(0); opacity: 1; }
    100% { transform: translateY(110vh) translateX(var(--drift)) rotate(var(--rot)); opacity: 0.9; }
  }
  @keyframes burst {
    0% { transform: translate(-50%, -50%) scale(0.35) rotate(0); opacity: 1; }
    58% { opacity: 1; }
    100% {
      transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(var(--scale)) rotate(var(--rot));
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .piece { display: none; }
  }
</style>
