<script>
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { VOICES } from '$lib/content/voices.js';
  import { ROBOT_COLORS } from '$lib/content/avatars.js';
  import { TILE_COUNT_OPTIONS } from '$lib/content/levels.js';
  import RobotAvatar from '$lib/components/RobotAvatar.svelte';
  import { player } from '$lib/audio/player.svelte.js';

  const p = $derived(profiles.active);

  /** @param {string} voiceId */
  async function chooseVoice(voiceId) {
    profiles.setVoice(voiceId);
    // Preview the voice with a sample phrase (level 0 = no pack, uses fallback).
    await player.speak(voiceId, 1, 'Halo, ayo belajar membaca!');
  }
</script>

<header class="mb-6 flex items-center justify-between">
  <a href="{base}/" class="text-2xl">⬅️</a>
  <h1 class="text-xl font-black">Pengaturan Orang Tua</h1>
  <span></span>
</header>

{#if !p}
  <p class="text-center text-slate-500">Belum ada profil. Buat profil dulu di halaman utama.</p>
{:else}
  <section class="mb-8">
    <h2 class="mb-2 text-sm font-bold uppercase text-slate-400">Profil aktif</h2>
    <div class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow">
      <RobotAvatar color={p.avatar} size={44} />
      <span class="text-lg font-bold">{p.name}</span>
    </div>
    <p class="mb-2 mt-3 text-xs text-slate-400">Ganti warna robot:</p>
    <div class="flex flex-wrap gap-2">
      {#each ROBOT_COLORS as rc}
        <button
          onclick={() => profiles.setAvatar(rc.id)}
          class="rounded-2xl p-1.5 {p.avatar === rc.id ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-slate-100'}"
        >
          <RobotAvatar color={rc.id} size={40} />
        </button>
      {/each}
    </div>
  </section>

  <section class="mb-8">
    <h2 class="mb-2 text-sm font-bold uppercase text-slate-400">Suara pengisi (speaker)</h2>
    <p class="mb-3 text-sm text-slate-500">Pilih suara yang membacakan soal untuk {p.name}.</p>
    <div class="grid gap-3">
      {#each VOICES as v (v.id)}
        <button
          onclick={() => chooseVoice(v.id)}
          class="flex items-center gap-3 rounded-2xl p-4 text-left shadow active:scale-[0.98]
            {p.voiceId === v.id ? 'bg-amber-200' : 'bg-white'}"
        >
          <span class="text-3xl">{v.gender === 'male' ? '👨' : '👩'}</span>
          <span class="flex-1">
            <span class="block font-bold">{v.label}</span>
            <span class="block text-xs text-slate-400">{v.engine} · {v.engineVoice}</span>
          </span>
          {#if p.voiceId === v.id}<span class="text-xl">✅</span>{:else}<span class="text-xl">🔊</span>{/if}
        </button>
      {/each}
    </div>
  </section>

  <section class="mb-8">
    <h2 class="mb-2 text-sm font-bold uppercase text-slate-400">Jumlah pilihan jawaban</h2>
    <div class="grid grid-cols-4 gap-2 rounded-2xl bg-white p-2 shadow">
      {#each TILE_COUNT_OPTIONS as count (count)}
        <button
          type="button"
          aria-pressed={profiles.quizTileCount === count}
          aria-label={`${count} pilihan jawaban`}
          onclick={() => profiles.setQuizTileCount(count)}
          class="rounded-xl px-3 py-3 text-center text-lg font-black active:scale-95
            {profiles.quizTileCount === count ? 'bg-amber-400 text-white shadow' : 'bg-slate-100 text-slate-500'}"
        >
          {count}
        </button>
      {/each}
    </div>
    <p class="mt-2 text-sm text-slate-500">
      {profiles.quizTileCount === 3
        ? 'Paling ringan'
        : profiles.quizTileCount === 4
          ? 'Seimbang'
          : profiles.quizTileCount === 5
            ? 'Lebih menantang'
            : 'Paling sulit'}
    </p>
  </section>

  <section>
    <h2 class="mb-2 text-sm font-bold uppercase text-slate-400">Profil</h2>
    <div class="grid gap-2">
      {#each profiles.profiles as pr (pr.id)}
        <div class="flex items-center gap-3 rounded-2xl bg-white p-3 shadow">
          <RobotAvatar color={pr.avatar} size={28} />
          <span class="flex-1 font-bold {pr.id === p.id ? '' : 'text-slate-400'}">{pr.name}</span>
          <button onclick={() => profiles.select(pr.id)} class="rounded-lg bg-slate-100 px-3 py-1 text-sm">Pilih</button>
          <button onclick={() => profiles.remove(pr.id)} class="rounded-lg bg-red-100 px-3 py-1 text-sm text-red-600">Hapus</button>
        </div>
      {/each}
    </div>
  </section>

  <section class="mt-8">
    <h2 class="mb-2 text-sm font-bold uppercase text-slate-400">Mode Tes</h2>
    <button
      onclick={() => profiles.setUnlockAll(!profiles.unlockAll)}
      class="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow active:scale-[0.99]"
    >
      <span class="text-2xl">{profiles.unlockAll ? '🔓' : '🔒'}</span>
      <span class="flex-1">
        <span class="block font-bold">Buka semua level</span>
        <span class="block text-xs text-slate-400">Untuk mencoba semua level & pelajaran tanpa harus lulus dulu.</span>
      </span>
      <span class="rounded-full px-3 py-1 text-sm font-bold {profiles.unlockAll ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}">
        {profiles.unlockAll ? 'AKTIF' : 'NONAKTIF'}
      </span>
    </button>
  </section>
{/if}
