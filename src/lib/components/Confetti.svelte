<script>
  const COLORS = ['#f59e0b', '#22d3ee', '#34d399', '#f472b6', '#a78bfa', '#fb7185'];
  let pieces = $state(/** @type {any[]} */ ([]));
  let seq = 0;

  /** @param {Set<number>} ids @param {number} ms */
  function reap(ids, ms) {
    setTimeout(() => (pieces = pieces.filter((p) => !ids.has(p.id))), ms);
  }

  /** Top-down confetti rain (streak milestones, level complete). @param {number} n */
  export function fire(n = 28) {
    const batch = Array.from({ length: n }, () => ({
      id: seq++,
      mode: 'fall',
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
    reap(new Set(batch.map((b) => b.id)), 2000);
  }

  /**
   * Radial burst of confetti + stars from a screen point (viewport px) — fired
   * from the tile the child just tapped, so the payoff is tied to the action.
   * @param {number} x @param {number} y @param {number} n
   */
  export function burst(x, y, n = 22) {
    const batch = Array.from({ length: n }, () => {
      const ang = Math.random() * Math.PI * 2;
      const dist = 55 + Math.random() * 120;
      const star = Math.random() > 0.55;
      return {
        id: seq++,
        mode: 'burst',
        star,
        x,
        y,
        dx: Math.cos(ang) * dist + 'px',
        dy: Math.sin(ang) * dist + 'px',
        fall: 55 + Math.random() * 90 + 'px',
        dur: 0.7 + Math.random() * 0.5,
        rot: Math.random() * 540 - 270 + 'deg',
        size: star ? 14 + Math.random() * 10 : 7 + Math.random() * 7,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        round: Math.random() > 0.5
      };
    });
    pieces = [...pieces, ...batch];
    reap(new Set(batch.map((b) => b.id)), 1600);
  }
</script>

<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
  {#each pieces as p (p.id)}
    {#if p.mode === 'burst'}
      <span
        class="burst"
        class:star={p.star}
        style="left:{p.x}px; top:{p.y}px; --dx:{p.dx}; --dy:{p.dy}; --fall:{p.fall}; --rot:{p.rot};
          animation-duration:{p.dur}s;
          {p.star
          ? `color:${p.color}; font-size:${p.size}px;`
          : `width:${p.size}px; height:${p.size}px; background:${p.color}; border-radius:${p.round ? '50%' : '2px'};`}"
        >{p.star ? '★' : ''}</span
      >
    {:else}
      <span
        class="piece"
        class:rounded-full={p.round}
        style="left:{p.left}%; width:{p.size}px; height:{p.size}px; background:{p.color};
          animation-duration:{p.dur}s; animation-delay:{p.delay}s; --drift:{p.drift}; --rot:{p.rot};"
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
    0% {
      transform: translateY(-10vh) translateX(0) rotate(0);
      opacity: 1;
    }
    100% {
      transform: translateY(110vh) translateX(var(--drift)) rotate(var(--rot));
      opacity: 0.9;
    }
  }

  .burst {
    position: absolute;
    line-height: 1;
    transform: translate(-50%, -50%);
    animation-name: burst;
    animation-timing-function: cubic-bezier(0.15, 0.6, 0.4, 1);
    animation-fill-mode: forwards;
  }
  @keyframes burst {
    0% {
      transform: translate(-50%, -50%) scale(0.3);
      opacity: 1;
    }
    25% {
      transform: translate(calc(-50% + var(--dx) * 0.55), calc(-50% + var(--dy) * 0.55)) scale(1.1)
        rotate(calc(var(--rot) * 0.4));
      opacity: 1;
    }
    100% {
      transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + var(--fall))) scale(0.6)
        rotate(var(--rot));
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .piece,
    .burst {
      display: none;
    }
  }
</style>
