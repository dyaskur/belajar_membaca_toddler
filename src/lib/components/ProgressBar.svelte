<script>
  import { untrack } from 'svelte';

  /**
   * A "living" progress bar (issue #34 UI juice): the fill springs to its new
   * width, its color warms from amber toward green as it grows, and a quick
   * shimmer sweeps across each time it gains ground. No idle motion.
   * @type {{ value?: number }}
   */
  let { value = 0 } = $props();

  const clamped = $derived(Math.max(0, Math.min(100, value)));
  // Hue warms amber (40) → green (140) as the bar fills, tying "full" to the
  // same green the games use for "correct".
  const hue = $derived(40 + clamped);

  let prev = untrack(() => clamped); // last value, seeded without a spurious shimmer
  let sweep = $state(0); // bumped when the bar grows, to replay the shimmer once
  $effect(() => {
    if (clamped > prev) sweep += 1;
    prev = clamped;
  });
</script>

<div class="pbar">
  <div class="pfill" style="width:{clamped}%; background: hsl({hue} 85% 52%);">
    {#key sweep}
      {#if sweep > 0}<span class="shine"></span>{/if}
    {/key}
  </div>
</div>

<style>
  .pbar {
    height: 0.75rem;
    width: 100%;
    overflow: hidden;
    border-radius: 9999px;
    background: #e2e8f0;
  }
  .pfill {
    position: relative;
    height: 100%;
    border-radius: 9999px;
    transition:
      width 0.55s cubic-bezier(0.34, 1.4, 0.64, 1),
      background-color 0.45s ease;
  }
  .shine {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background: linear-gradient(100deg, transparent 35%, rgba(255, 255, 255, 0.6) 50%, transparent 65%);
    background-size: 220% 100%;
    animation: pbar-shine 0.7s ease-out;
  }
  @keyframes pbar-shine {
    from {
      background-position: 120% 0;
    }
    to {
      background-position: -40% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pfill {
      transition:
        width 0.2s linear,
        background-color 0.2s ease;
    }
    .shine {
      display: none;
    }
  }
</style>
