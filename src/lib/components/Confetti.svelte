<script>
  const COLORS = ['#f59e0b', '#22d3ee', '#34d399', '#f472b6', '#a78bfa', '#fb7185'];
  let pieces = $state(/** @type {any[]} */ ([]));
  let seq = 0;

  /** Fire a confetti burst. @param {number|{n?:number, x?:number, y?:number}} opts */
  export function fire(opts = 28) {
    let n = typeof opts === 'number' ? opts : opts.n ?? 28;
    let burst = typeof opts === 'object' && opts.x !== undefined;
    let originX = burst ? opts.x : 0;
    let originY = burst ? opts.y : 0;

    const batch = Array.from({ length: n }, () => {
      let isBurst = burst;
      let left = isBurst ? originX + 'px' : (Math.random() * 100) + '%';
      let top = isBurst ? originY + 'px' : '-6%';
      let delay = isBurst ? Math.random() * 0.05 : Math.random() * 0.15;
      
      let driftX = (Math.random() - 0.5) * 160;
      let driftY = isBurst ? 0 : 110;
      
      if (isBurst) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 80 + Math.random() * 150;
        driftX = Math.cos(angle) * velocity;
        driftY = Math.sin(angle) * velocity + 150; // gravity effect
      }

      return {
        id: seq++,
        left,
        top,
        anim: isBurst ? 'burst' : 'fall',
        delay,
        dur: isBurst ? 0.6 + Math.random() * 0.4 : 0.9 + Math.random() * 0.8,
        drift: driftX + 'px',
        driftY: isBurst ? driftY + 'px' : '110vh',
        rot: Math.random() * 720 - 360 + 'deg',
        size: 8 + Math.random() * 8,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        round: Math.random() > 0.5
      };
    });
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
      style="left:{p.left}; top:{p.top}; width:{p.size}px; height:{p.size}px; background:{p.color};
        animation-name:{p.anim}; animation-duration:{p.dur}s; animation-delay:{p.delay}s; --drift:{p.drift}; --drift-y:{p.driftY}; --rot:{p.rot};"
    ></span>
  {/each}
</div>

<style>
  .piece {
    position: absolute;
    border-radius: 2px;
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
    animation-fill-mode: forwards;
  }
  @keyframes fall {
    0% { transform: translateY(-10vh) translateX(0) rotate(0); opacity: 1; }
    100% { transform: translateY(var(--drift-y)) translateX(var(--drift)) rotate(var(--rot)); opacity: 0.9; }
  }
  @keyframes burst {
    0% { transform: translate(-50%, -50%) scale(0.5) rotate(0); opacity: 1; }
    70% { opacity: 1; }
    100% { transform: translate(calc(-50% + var(--drift)), calc(-50% + var(--drift-y))) rotate(var(--rot)); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .piece { display: none; }
  }
</style>
