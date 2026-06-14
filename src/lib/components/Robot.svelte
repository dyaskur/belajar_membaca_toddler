<script>
  import { player } from '$lib/audio/player.svelte.js';

  /**
   * @typedef {'idle'|'happy'|'sad'} Mood
   * @type {{ mood?: Mood, size?: number, head?: string, body?: string }}
   */
  let { mood = 'idle', size = 160, head = '#14b8a6', body = '#2563eb' } = $props();

  // The robot "talks" (mouth equalizer + antenna pulse) whenever audio is playing.
  const talking = $derived(player.speaking);
</script>

<div class="robot" style="width:{size}px" data-mood={mood} class:talking>
  <svg viewBox="0 0 200 250" class="block w-full">
    <!-- antenna -->
    <line x1="100" y1="42" x2="100" y2="22" stroke="#94a3b8" stroke-width="5" stroke-linecap="round" />
    <circle class="antenna" cx="100" cy="16" r="9" fill="#fbbf24" />

    <!-- arms -->
    <rect class="arm arm-l" x="30" y="138" width="16" height="58" rx="8" fill={body} />
    <rect class="arm arm-r" x="154" y="138" width="16" height="58" rx="8" fill={body} />

    <!-- body -->
    <rect x="52" y="126" width="96" height="86" rx="20" fill={body} />
    <rect x="72" y="144" width="56" height="44" rx="10" fill="#1e3a8a" />
    <circle class="led led1" cx="86" cy="166" r="5" fill="#22d3ee" />
    <circle class="led led2" cx="100" cy="166" r="5" fill="#34d399" />
    <circle class="led led3" cx="114" cy="166" r="5" fill="#f472b6" />
    <!-- legs -->
    <rect x="68" y="210" width="18" height="16" rx="6" fill="#1e3a8a" />
    <rect x="114" y="210" width="18" height="16" rx="6" fill="#1e3a8a" />

    <!-- head -->
    <rect x="54" y="44" width="92" height="78" rx="18" fill={head} />
    <rect x="64" y="56" width="72" height="54" rx="12" fill="#0f172a" />

    <!-- eyes -->
    {#if mood === 'happy'}
      <path d="M76 84 q9 -14 18 0" stroke="#22d3ee" stroke-width="5" fill="none" stroke-linecap="round" />
      <path d="M106 84 q9 -14 18 0" stroke="#22d3ee" stroke-width="5" fill="none" stroke-linecap="round" />
    {:else if mood === 'sad'}
      <path d="M76 80 q9 12 18 0" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round" />
      <path d="M106 80 q9 12 18 0" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round" />
    {:else}
      <g class="eyes">
        <circle cx="85" cy="80" r="8" fill="#22d3ee" />
        <circle cx="115" cy="80" r="8" fill="#22d3ee" />
      </g>
    {/if}

    <!-- mouth -->
    {#if talking}
      <g class="eq" fill="#22d3ee">
        <rect x="82" y="92" width="6" height="14" rx="3" />
        <rect x="92" y="92" width="6" height="14" rx="3" />
        <rect x="102" y="92" width="6" height="14" rx="3" />
        <rect x="112" y="92" width="6" height="14" rx="3" />
      </g>
    {:else if mood === 'happy'}
      <path d="M82 96 q18 18 36 0" stroke="#22d3ee" stroke-width="5" fill="none" stroke-linecap="round" />
    {:else if mood === 'sad'}
      <path d="M84 104 q16 -14 32 0" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round" />
    {:else}
      <path d="M86 99 q14 8 28 0" stroke="#22d3ee" stroke-width="5" fill="none" stroke-linecap="round" />
    {/if}
  </svg>
</div>

<style>
  .robot {
    display: inline-block;
    transform-origin: 50% 90%;
  }
  /* body animation per mood */
  .robot[data-mood='idle'] { animation: float 3s ease-in-out infinite; }
  .robot[data-mood='happy'] { animation: bounce 0.5s ease infinite; }
  .robot[data-mood='sad'] { animation: tilt 0.6s ease; }

  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes bounce { 0%,100% { transform: translateY(0) scale(1); } 30% { transform: translateY(-16px) scale(1.04); } }
  @keyframes tilt { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }

  /* blinking eyes when idle */
  .eyes { animation: blink 4s infinite; transform-origin: center 80px; }
  @keyframes blink { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }

  /* antenna pulse while talking / happy */
  .antenna { transition: opacity 0.2s; }
  .robot.talking .antenna,
  .robot[data-mood='happy'] .antenna { animation: pulse 0.6s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; r: 9px; } 50% { opacity: 0.5; r: 11px; } }

  /* equalizer mouth */
  .eq rect { transform-origin: center 99px; animation: eq 0.5s ease-in-out infinite; }
  .eq rect:nth-child(1) { animation-delay: 0s; }
  .eq rect:nth-child(2) { animation-delay: 0.12s; }
  .eq rect:nth-child(3) { animation-delay: 0.24s; }
  .eq rect:nth-child(4) { animation-delay: 0.08s; }
  @keyframes eq { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1.3); } }

  /* body LEDs twinkle */
  .led { animation: twinkle 1.6s infinite; }
  .led2 { animation-delay: 0.4s; }
  .led3 { animation-delay: 0.8s; }
  @keyframes twinkle { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

  /* arms wave on happy */
  .robot[data-mood='happy'] .arm-l { animation: wave-l 0.4s ease infinite; transform-origin: 38px 138px; }
  .robot[data-mood='happy'] .arm-r { animation: wave-r 0.4s ease infinite; transform-origin: 162px 138px; }
  @keyframes wave-l { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-24deg); } }
  @keyframes wave-r { 0%,100% { transform: rotate(0); } 50% { transform: rotate(24deg); } }

  @media (prefers-reduced-motion: reduce) {
    .robot, .eyes, .antenna, .eq rect, .led, .arm { animation: none !important; }
  }
</style>
