<script>
  const COLORS = ['#f59e0b', '#22d3ee', '#34d399', '#f472b6', '#a78bfa', '#fb7185'];
  let pieces = $state(/** @type {any[]} */ ([]));
  let bursts = $state(/** @type {any[]} */ ([]));
  let seq = 0;

  /** Fire a top-down confetti burst (streak milestones, level-complete). @param {number} n */
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

  /**
   * Radial confetti + star burst from a point (e.g. the tile a kid just tapped),
   * so the celebration reads as coming from the action itself.
   * @param {number} [n] @param {number} [x] @param {number} [y]
   */
  export function burst(n = 22, x = window.innerWidth / 2, y = window.innerHeight / 2) {
    const batch = Array.from({ length: n }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 46 + Math.random() * 90;
      return {
        id: seq++,
        x,
        y,
        bx: Math.cos(angle) * dist + 'px',
        by: Math.sin(angle) * dist - 20 + 'px',
        rot: Math.random() * 480 - 240 + 'deg',
        dur: 0.55 + Math.random() * 0.35,
        size: 7 + Math.random() * 7,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        star: Math.random() < 0.4,
        round: Math.random() > 0.5
      };
    });
    bursts = [...bursts, ...batch];
    const ids = new Set(batch.map((b) => b.id));
    setTimeout(() => (bursts = bursts.filter((p) => !ids.has(p.id))), 1000);
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
  {#each bursts as p (p.id)}
    {#if p.star}
      <span
        class="burst-star"
        style="left:{p.x}px; top:{p.y}px; font-size:{p.size * 1.7}px; color:{p.color};
          animation-duration:{p.dur}s; --bx:{p.bx}; --by:{p.by}; --rot:{p.rot};"
        >★</span
      >
    {:else}
      <span
        class="burst-piece"
        class:rounded-full={p.round}
        style="left:{p.x}px; top:{p.y}px; width:{p.size}px; height:{p.size}px; background:{p.color};
          animation-duration:{p.dur}s; --bx:{p.bx}; --by:{p.by}; --rot:{p.rot};"
      ></span>
    {/if}
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

  .burst-piece,
  .burst-star {
    position: absolute;
    animation-name: burst-fly;
    animation-timing-function: cubic-bezier(0.15, 0.6, 0.35, 1);
    animation-fill-mode: forwards;
    transform: translate(-50%, -50%);
  }
  .burst-piece {
    border-radius: 2px;
  }
  .burst-star {
    line-height: 1;
  }
  @keyframes burst-fly {
    0% { transform: translate(-50%, -50%) scale(0.3) rotate(0); opacity: 1; }
    35% {
      transform: translate(calc(-50% + var(--bx) * 0.6), calc(-50% + var(--by) * 0.6)) scale(1.1)
        rotate(calc(var(--rot) * 0.5));
      opacity: 1;
    }
    100% {
      transform: translate(calc(-50% + var(--bx)), calc(-50% + var(--by) + 46px)) scale(0.7)
        rotate(var(--rot));
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .piece,
    .burst-piece,
    .burst-star {
      display: none;
    }
  }
</style>
