<script>
  import { downloader } from '$lib/audio/downloader.svelte.js';
  import { isNative } from '$lib/native/platform.js';
  import ProgressBar from './ProgressBar.svelte';
  import Robot from './Robot.svelte';

  /**
   * Android-only overlay shown while a voice's audio packs download.
   *
   * The web PWA serves audio from its own origin, so this renders nothing there. On
   * Android the APK ships without clips: the first launch fetches the core packs and
   * each level fetches its own the first time it is opened.
   *
   * @type {{
   *   voiceId: string,
   *   levels: (number|string)[],
   *   title?: string,
   *   note?: string,
   *   onretry?: () => void
   * }}
   */
  let {
    voiceId,
    levels,
    title = 'Menyiapkan suara…',
    note = 'Sekali saja — setelah ini bisa dipakai tanpa internet.',
    onretry
  } = $props();

  /** Re-attempt the failed packs. Callers override this when they also need to restart
   *  whatever was waiting on the audio (e.g. re-running a lesson's intro). */
  function retry() {
    if (onretry) return onretry();
    for (const level of levels) downloader.ensurePack(voiceId, level).catch(() => {});
  }

  const progress = $derived(downloader.progressFor(voiceId, levels));
  // Nothing to show once every pack is on disk (or off Android entirely).
  const visible = $derived(isNative && (progress.downloading || progress.error));
  // Until the first manifest arrives we know the work exists but not its size, so the
  // bar idles at a small non-zero width instead of reading as "stuck at 0".
  const percent = $derived(progress.total ? Math.round(progress.ratio * 100) : 5);
</script>

{#if visible}
  <div class="gate" role="status" aria-live="polite">
    <div class="card">
      <Robot mood={progress.error ? 'sad' : 'idle'} size={110} interactive={false} />

      {#if progress.error}
        <h2>Tidak bisa mengunduh suara</h2>
        <p class="note">Periksa koneksi internet, lalu coba lagi.</p>
        <button class="retry" onclick={retry}>Coba lagi</button>
      {:else}
        <h2>{title}</h2>
        <div class="bar"><ProgressBar value={percent} /></div>
        <p class="count">
          {#if progress.total}
            {progress.done} / {progress.total} suara
          {:else}
            Menghubungkan…
          {/if}
        </p>
        <p class="note">{note}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .gate {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: rgba(255, 251, 235, 0.96);
  }
  .card {
    display: flex;
    width: 100%;
    max-width: 22rem;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    border-radius: 1.5rem;
    background: #fff;
    padding: 1.75rem 1.5rem;
    box-shadow: 0 18px 40px rgba(120, 83, 15, 0.18);
    text-align: center;
  }
  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: #78350f;
  }
  .bar {
    width: 100%;
  }
  .count {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #b45309;
    font-variant-numeric: tabular-nums;
  }
  .note {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #78716c;
  }
  .retry {
    margin-top: 0.25rem;
    border-radius: 9999px;
    background: #f59e0b;
    padding: 0.65rem 1.6rem;
    font-size: 1rem;
    font-weight: 800;
    color: #fff;
    box-shadow: 0 4px 0 #b45309;
  }
  .retry:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 #b45309;
  }
</style>
