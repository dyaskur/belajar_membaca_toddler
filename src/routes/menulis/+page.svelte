<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { robotColor } from '$lib/content/avatars.js';
  import { WRITE_MODES } from '$lib/content/menulis.js';
  import Robot from '$lib/components/Robot.svelte';

  onMount(() => {
    if (!profiles.active) goto(`${base}/belajar`);
  });

  const rc = $derived(robotColor(profiles.active?.avatar || 'blue'));

  /** @param {string} id */
  function play(id) {
    goto(`${base}/menulis/${id}`);
  }
</script>

<header class="mb-4 flex items-center justify-between">
  <button onclick={() => goto(`${base}/belajar`)} class="text-2xl" aria-label="Kembali">⬅️</button>
  <span class="font-bold text-slate-500">✍️ Belajar Menulis</span>
  <span class="w-7"></span>
</header>

<div class="mb-6 flex flex-col items-center text-center">
  <Robot mood="happy" size={110} head={rc.head} body={rc.body} />
  <p class="mt-2 text-sm text-slate-500">Pilih cara menulis</p>
</div>

<div class="grid gap-4">
  {#each WRITE_MODES as m (m.id)}
    <button
      onclick={() => play(m.id)}
      class="flex items-center gap-4 rounded-3xl {m.color} p-5 text-left text-white shadow active:scale-[0.98]"
    >
      <span class="text-4xl">{m.icon}</span>
      <span class="flex-1">
        <span class="block text-xl font-black">{m.title}</span>
        <span class="block text-sm text-white/80">{m.subtitle}</span>
      </span>
    </button>
  {/each}
</div>
