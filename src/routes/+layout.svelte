<script>
  import '../app.css';
  import { untrack } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import AudioDownloadGate from '$lib/components/AudioDownloadGate.svelte';
  import { CORE_PACKS } from '$lib/audio/config.js';
  import { downloader } from '$lib/audio/downloader.svelte.js';
  import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';
  import { isNative } from '$lib/native/platform.js';
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
  const voiceId = $derived(profiles.active?.voiceId ?? DEFAULT_VOICE_ID);
  let retries = $state(0);

  $effect(() => {
    if (!isNative) return;
    retries; // re-runs this effect when the user taps "Coba lagi"
    const voice = voiceId;
    // ensurePack reads the same $state it writes, so keep it out of this effect's
    // dependencies — tracking it would loop the effect on every progress tick.
    untrack(() => {
      for (const level of CORE_PACKS) downloader.ensurePack(voice, level).catch(() => {});
    });
  });
</script>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4">
  {@render children()}
</div>

<AudioDownloadGate
  {voiceId}
  levels={CORE_PACKS}
  note="Sekali saja — setelah ini huruf bisa dibaca tanpa internet."
  onretry={() => retries++}
/>
