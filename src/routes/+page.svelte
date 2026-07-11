<script>
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { player } from '$lib/audio/player.svelte.js';
  import AgePicker from '$lib/components/AgePicker.svelte';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { ROBOT_COLORS, DEFAULT_AVATAR } from '$lib/content/avatars.js';
  import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';
  import { DEFAULT_AGE_BAND, profileOptionsForAge } from '$lib/content/profile-options.js';
  import Robot from '$lib/components/Robot.svelte';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';
  import WelcomeWizard from '$lib/components/WelcomeWizard.svelte';

  const NAME_NUDGE = 'Silakan tulis namamu dulu.';

  let adding = $state(false);
  let name = $state('');
  let avatar = $state(DEFAULT_AVATAR);
  let ageBand = $state(DEFAULT_AGE_BAND);
  let showNameHint = $state(false);
  let shakeName = $state(false);
  /** @type {HTMLInputElement | undefined} */
  let nameInput = $state();

  function openAddModal() {
    name = '';
    ageBand = DEFAULT_AGE_BAND;
    showNameHint = false;
    shakeName = false;
    adding = true;
  }

  function closeAddModal() {
    adding = false;
    showNameHint = false;
    shakeName = false;
  }

  function clearNameNudge() {
    showNameHint = false;
    shakeName = false;
  }

  async function nudgeName() {
    showNameHint = true;
    shakeName = false;
    await tick();
    shakeName = true;
    nameInput?.focus();
    await player.speak(DEFAULT_VOICE_ID, 1, NAME_NUDGE);
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      await nudgeName();
      return;
    }
    profiles.add(trimmed, avatar, DEFAULT_VOICE_ID, profileOptionsForAge(ageBand));
    name = '';
    closeAddModal();
  }

  /** @param {string} id */
  function play(id) {
    profiles.select(id);
    goto(`${base}/belajar`);
  }
</script>

{#if profiles.profiles.length === 0}
  <WelcomeWizard />
{:else}
  <header class="mb-6 flex flex-col items-center text-center">
    <Robot mood="happy" size={120} />
    <h1 class="mt-2 text-3xl font-black text-amber-600">Ayo Belajar Membaca</h1>
    <p class="text-sm text-slate-500">Pilih nama kamu</p>
  </header>

  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
    {#each profiles.profiles as p (p.id)}
      <button
        onclick={() => play(p.id)}
        class="flex flex-col items-center gap-2 rounded-3xl bg-white p-5 shadow active:scale-95"
      >
        <RobotAvatar color={p.avatar} size={64} />
        <span class="text-lg font-bold">{p.name}</span>
        <span class="text-xs text-slate-400">Level {p.unlockedLevel}</span>
      </button>
    {/each}

    <button
      onclick={openAddModal}
      class="flex flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-amber-300 p-5 text-amber-500 active:scale-95"
    >
      <span class="text-5xl">+</span>
      <span class="font-bold">Tambah</span>
    </button>
  </div>

  {#if adding}
    <div class="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div class="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <h2 class="mb-4 text-xl font-bold">Profil baru</h2>
        <input
          bind:this={nameInput}
          bind:value={name}
          oninput={clearNameNudge}
          aria-invalid={showNameHint}
          aria-describedby="add-profile-name-hint"
          placeholder="Nama anak"
          class:nudge-shake={shakeName}
          class="w-full rounded-xl border px-4 py-3 text-lg outline-none transition
            {showNameHint
              ? 'border-red-300 bg-amber-50 ring-4 ring-amber-200'
              : 'border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-100'}"
        />
        <p id="add-profile-name-hint" class="mb-4 mt-2 min-h-5 text-sm font-bold text-red-500">
          {showNameHint ? 'Silakan tulis namamu dulu' : ''}
        </p>
        <div class="mb-4 flex flex-wrap gap-2">
          {#each ROBOT_COLORS as rc}
            <button
              type="button"
              onclick={() => (avatar = rc.id)}
              class="rounded-2xl p-1.5 {avatar === rc.id ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-slate-100'}"
            >
              <RobotAvatar color={rc.id} size={40} />
            </button>
          {/each}
        </div>
        <div class="mb-4">
          <AgePicker bind:value={ageBand} />
        </div>
        <div class="flex gap-3">
          <button onclick={closeAddModal} class="flex-1 rounded-xl bg-slate-100 py-3 font-bold">Batal</button>
          <button onclick={create} class="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-white">Simpan</button>
        </div>
      </div>
    </div>
  {/if}

  <footer class="mt-auto pt-6 text-center text-xs text-slate-400">
    <a href="{base}/orang-tua" class="underline">Pengaturan Orang Tua</a>
  </footer>
{/if}

<style>
  .nudge-shake {
    animation: nudge-shake 0.34s ease;
  }

  @keyframes nudge-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .nudge-shake {
      animation: none;
    }
  }
</style>
