<script>
  import '../app.css';
  import { beforeNavigate } from '$app/navigation';
  import AudioDownloadGate from '$lib/components/AudioDownloadGate.svelte';
  import { CORE_PACKS } from '$lib/audio/config.js';
  import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';
  import { profiles } from '$lib/stores/profiles.svelte.js';

  let { children } = $props();

  // Toddlers mash the hardware/gesture back button mid-activity. Block only
  // popstate-triggered navigation (back/forward); in-app links and explicit
  // "Kembali" buttons still navigate normally.
  beforeNavigate((navigation) => {
    if (navigation.type === 'popstate') navigation.cancel();
  });

  // Android ships without audio to keep the install small, so the basic clips are
  // fetched on first launch — and again whenever a profile picks a different speaker.
  // AudioDownloadGate starts the packs it reports on, so there is nothing to kick off here.
  const voiceId = $derived(profiles.active?.voiceId ?? DEFAULT_VOICE_ID);
</script>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4">
  {@render children()}
</div>

<!-- Only once a profile exists: before that the chosen speaker is unknown, and fetching
     the default voice's packs would spend the data twice and cover the wizard. -->
{#if profiles.active}
  <AudioDownloadGate
    {voiceId}
    levels={CORE_PACKS}
    note="Sekali saja — setelah ini huruf bisa dibaca tanpa internet."
  />
{/if}
