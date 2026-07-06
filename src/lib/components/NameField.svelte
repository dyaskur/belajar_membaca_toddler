<script module>
  /** Spoken + written nudge when saving with an empty name. */
  export const NAME_NUDGE_TEXT = 'Silakan tulis namamu dulu.';
</script>

<script>
  import { player } from '$lib/audio/player.svelte.js';
  import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';

  /** @type {{ value: string, voiceId?: string }} */
  let { value = $bindable(), voiceId = DEFAULT_VOICE_ID } = $props();

  /** @type {HTMLInputElement | undefined} */
  let input = $state();
  let hint = $state(false);
  let shaking = $state(false);

  /**
   * Multi-cue empty-name nudge: ring + shake + hint + focus (pops the keyboard)
   * + the spoken line. Non-blocking — re-calling repeats every cue.
   */
  export function nudge() {
    hint = true;
    shaking = true;
    input?.focus();
    player.speak(voiceId, 1, NAME_NUDGE_TEXT);
  }
</script>

<div>
  <input
    bind:this={input}
    bind:value
    placeholder="Nama anak"
    class="w-full rounded-xl border px-4 py-3 text-lg {hint
      ? 'border-amber-500 ring-4 ring-amber-300'
      : 'border-slate-200'}"
    class:shake={shaking}
    oninput={() => (hint = false)}
    onanimationend={() => (shaking = false)}
  />
  {#if hint}
    <p class="mt-2 text-sm font-bold text-amber-600">Silakan tulis namamu dulu</p>
  {/if}
</div>

<style>
  .shake {
    animation: shake 0.4s ease-in-out;
  }
  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-6px);
    }
    40% {
      transform: translateX(6px);
    }
    60% {
      transform: translateX(-4px);
    }
    80% {
      transform: translateX(4px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shake {
      animation: none;
    }
  }
</style>
