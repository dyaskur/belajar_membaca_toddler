<script>
  import RobotAvatar from './RobotAvatar.svelte';

  /**
   * @type {{ level: import('$lib/content/levels.js').Level, icon: string, locked?: boolean, complete?: boolean, progress?: number, robotColor?: string, hasRobot?: boolean, celebrating?: boolean, shaking?: boolean, onclick?: () => void }}
   */
  let {
    level,
    icon,
    locked = false,
    complete = false,
    progress = 0,
    robotColor = 'teal',
    hasRobot = false,
    celebrating = false,
    shaking = false,
    onclick
  } = $props();

  const available = $derived(!locked && !complete);
</script>

<div class="node-wrap" class:robot-hop={celebrating}>
  {#if hasRobot}
    <div class="robot-rest" aria-hidden="true">
      <RobotAvatar color={robotColor} size={58} />
    </div>
  {/if}
  <button
    type="button"
    data-node={level.id}
    {onclick}
    aria-label={`Level ${level.label}, ${level.title}${locked ? ', terkunci' : complete ? ', selesai' : ', terbuka'}`}
    class:node-pulse={available}
    class:node-complete={complete}
    class:node-locked={locked}
    class:locked-shake={shaking}
    class="node-button stage-{level.stage}"
  >
    <span class="node-icon">{icon}</span>
    {#if locked}
      <span class="node-lock">🔒</span>
    {:else if complete}
      <span class="node-star">⭐</span>
    {:else if progress > 0}
      <span class="node-progress">{Math.round(progress * 100)}%</span>
    {/if}
  </button>
  <span class="node-label">{level.label}</span>
  <span class="node-title">{level.title}</span>
</div>

<style>
  .node-wrap {
    position: relative;
    z-index: 2;
    display: flex;
    width: 108px;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .node-button {
    position: relative;
    display: flex;
    height: 78px;
    width: 78px;
    align-items: center;
    justify-content: center;
    border: 5px solid white;
    border-radius: 999px;
    box-shadow: 0 5px 0 rgb(148 163 184 / 0.3), 0 8px 18px rgb(15 23 42 / 0.12);
    transition: transform 0.15s ease, filter 0.15s ease;
  }
  .node-button:active { transform: translateY(3px) scale(0.96); }
  .stage-1 { background: linear-gradient(145deg, #fcd34d, #f59e0b); }
  .stage-2 { background: linear-gradient(145deg, #67e8f9, #0ea5e9); }
  .stage-3 { background: linear-gradient(145deg, #c4b5fd, #8b5cf6); }
  .node-icon { font-size: 2.15rem; filter: drop-shadow(0 2px 1px rgb(255 255 255 / 0.45)); }
  .node-lock, .node-star {
    position: absolute;
    right: -8px;
    bottom: -5px;
    display: grid;
    height: 30px;
    width: 30px;
    place-items: center;
    border-radius: 999px;
    background: white;
    font-size: 1rem;
    box-shadow: 0 2px 6px rgb(15 23 42 / 0.2);
  }
  .node-progress {
    position: absolute;
    bottom: -7px;
    border-radius: 999px;
    background: white;
    padding: 2px 6px;
    color: #d97706;
    font-size: 0.65rem;
    font-weight: 900;
    box-shadow: 0 2px 6px rgb(15 23 42 / 0.15);
  }
  .node-label { margin-top: 8px; color: #d97706; font-size: 0.72rem; font-weight: 900; }
  .node-title { max-width: 108px; color: #475569; font-size: 0.7rem; font-weight: 800; line-height: 1.15; }
  .node-complete { border-color: #fde68a; }
  .node-locked { filter: grayscale(0.75); opacity: 0.58; }
  .node-pulse { animation: node-pulse 1.8s ease-in-out infinite; }
  .robot-rest {
    position: absolute;
    z-index: 3;
    top: -42px;
    right: -9px;
    filter: drop-shadow(0 4px 3px rgb(15 23 42 / 0.2));
  }
  .robot-hop .robot-rest { animation: robot-hop 0.8s cubic-bezier(.2, .8, .3, 1.25) 2; }
  .robot-hop .node-button { animation: node-win 0.55s ease 2; }
  .locked-shake { animation: locked-shake 0.45s ease; }
  @keyframes node-pulse {
    0%, 100% { box-shadow: 0 5px 0 rgb(148 163 184 / 0.3), 0 0 0 0 rgb(14 165 233 / 0.35); }
    50% { box-shadow: 0 5px 0 rgb(148 163 184 / 0.3), 0 0 0 11px rgb(14 165 233 / 0); }
  }
  @keyframes robot-hop {
    0%, 100% { transform: translateY(0) rotate(0); }
    45% { transform: translateY(-26px) rotate(-7deg); }
    70% { transform: translateY(3px) rotate(5deg); }
  }
  @keyframes node-win { 50% { transform: scale(1.12); } }
  @keyframes locked-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    50% { transform: translateX(7px); }
    75% { transform: translateX(-4px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .node-pulse, .robot-hop .robot-rest, .robot-hop .node-button, .locked-shake { animation: none; }
  }
  @media (max-width: 420px) {
    .node-wrap { width: 96px; }
    .node-button { height: 72px; width: 72px; }
    .node-title { max-width: 96px; font-size: 0.66rem; }
  }
</style>
