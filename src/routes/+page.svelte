<script>
  import { goto } from '$app/navigation';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import Robot from '$lib/components/Robot.svelte';

  const AVATARS = ['🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐰', '🐥', '🦄', '🐳'];
  let adding = $state(false);
  let name = $state('');
  let avatar = $state(AVATARS[0]);

  function create() {
    if (!name.trim()) return;
    profiles.add(name.trim(), avatar);
    name = '';
    adding = false;
  }

  /** @param {string} id */
  function play(id) {
    profiles.select(id);
    goto('/belajar');
  }
</script>

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
      <span class="text-5xl">{p.avatar}</span>
      <span class="text-lg font-bold">{p.name}</span>
      <span class="text-xs text-slate-400">Level {p.unlockedLevel}</span>
    </button>
  {/each}

  <button
    onclick={() => (adding = true)}
    class="flex flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-amber-300 p-5 text-amber-500 active:scale-95"
  >
    <span class="text-5xl">➕</span>
    <span class="font-bold">Tambah</span>
  </button>
</div>

{#if adding}
  <div class="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
      <h2 class="mb-4 text-xl font-bold">Profil baru</h2>
      <input
        bind:value={name}
        placeholder="Nama anak"
        class="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg"
      />
      <div class="mb-4 flex flex-wrap gap-2">
        {#each AVATARS as a}
          <button
            onclick={() => (avatar = a)}
            class="rounded-xl p-2 text-3xl {avatar === a ? 'bg-amber-200' : 'bg-slate-100'}"
          >{a}</button>
        {/each}
      </div>
      <div class="flex gap-3">
        <button onclick={() => (adding = false)} class="flex-1 rounded-xl bg-slate-100 py-3 font-bold">Batal</button>
        <button onclick={create} class="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-white">Simpan</button>
      </div>
    </div>
  </div>
{/if}

<footer class="mt-auto pt-6 text-center text-xs text-slate-400">
  <a href="/orang-tua" class="underline">Pengaturan Orang Tua</a>
</footer>
