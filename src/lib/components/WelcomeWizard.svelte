<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { VOICES, DEFAULT_VOICE_ID } from '$lib/content/voices.js';
  import { ROBOT_COLORS, DEFAULT_AVATAR, robotColor } from '$lib/content/avatars.js';
  import { DEFAULT_AGE_BAND, profileOptsForAgeBand } from '$lib/content/ages.js';
  import Robot from './Robot.svelte';
  import RobotAvatar from './RobotAvatar.svelte';
  import AgePicker from './AgePicker.svelte';
  import NameField from './NameField.svelte';

  const GREETING = 'Halo, ayo belajar membaca!';
  const LAST_STEP = 4;

  let step = $state(0); // 0 = welcome screen, then ① speaker ② color ③ age ④ name
  let voiceId = $state(DEFAULT_VOICE_ID);
  let avatar = $state(DEFAULT_AVATAR);
  let ageBand = $state(DEFAULT_AGE_BAND);
  let name = $state('');
  /** @type {NameField | undefined} */
  let nameField = $state();
  let greeted = false;

  const preview = $derived(robotColor(avatar));

  function start() {
    // This tap is also the user gesture that unlocks/resumes the AudioContext
    // (the player listens for the first pointerdown), so the greeting is audible on iOS.
    step = 1;
    if (!greeted) {
      greeted = true;
      player.speak(voiceId, 1, GREETING);
    }
  }

  /** @param {string} id */
  function chooseVoice(id) {
    voiceId = id;
    player.speak(id, 1, GREETING);
  }

  function finish() {
    const trimmed = name.trim();
    if (!trimmed) {
      nameField?.nudge();
      return;
    }
    profiles.add(trimmed, avatar, voiceId, profileOptsForAgeBand(ageBand));
    goto(`${base}/belajar`);
  }
</script>

{#if step === 0}
  <div class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
    <Robot mood="happy" size={150} />
    <h1 class="text-3xl font-black text-amber-600">Ayo Belajar Membaca</h1>
    <button
      onclick={start}
      class="rounded-3xl bg-amber-500 px-14 py-5 text-2xl font-black text-white shadow-lg active:scale-95"
    >
      Mulai
    </button>
  </div>
{:else}
  <div class="mx-auto flex w-full max-w-sm flex-1 flex-col">
    <p class="mb-1 text-center text-xs font-bold text-slate-400">Langkah {step} dari {LAST_STEP}</p>

    {#if step === 1}
      <h1 class="mb-4 text-center text-2xl font-black text-amber-600">Pilih suara</h1>
      <div class="grid gap-3">
        {#each VOICES as v (v.id)}
          <button
            onclick={() => chooseVoice(v.id)}
            class="flex items-center gap-3 rounded-2xl p-4 text-left shadow active:scale-[0.98]
              {voiceId === v.id ? 'bg-amber-200' : 'bg-white'}"
          >
            <span class="text-3xl">{v.gender === 'male' ? '👨' : '👩'}</span>
            <span class="flex-1 font-bold">{v.label}</span>
            {#if voiceId === v.id}<span class="text-xl">✅</span>{:else}<span class="text-xl">🔊</span>{/if}
          </button>
        {/each}
      </div>
    {:else if step === 2}
      <h1 class="mb-4 text-center text-2xl font-black text-amber-600">Pilih warna robot</h1>
      <div class="mb-4 flex justify-center">
        <Robot mood="happy" size={130} head={preview.head} body={preview.body} />
      </div>
      <div class="flex flex-wrap justify-center gap-2">
        {#each ROBOT_COLORS as rc (rc.id)}
          <button
            onclick={() => (avatar = rc.id)}
            class="rounded-2xl p-1.5 {avatar === rc.id ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-slate-100'}"
          >
            <RobotAvatar color={rc.id} size={40} />
          </button>
        {/each}
      </div>
    {:else if step === 3}
      <h1 class="mb-4 text-center text-2xl font-black text-amber-600">Umur kamu berapa?</h1>
      <AgePicker bind:value={ageBand} />
      <p class="mt-3 text-center text-xs text-slate-400">
        Untuk memilih tingkat kesulitan awal. Bisa diubah di Pengaturan Orang Tua.
      </p>
    {:else}
      <h1 class="mb-4 text-center text-2xl font-black text-amber-600">Siapa nama kamu?</h1>
      <NameField bind:value={name} bind:this={nameField} {voiceId} />
    {/if}

    <div class="mt-auto flex gap-3 pt-6">
      {#if step > 1}
        <button
          onclick={() => (step -= 1)}
          class="flex-1 rounded-xl bg-slate-100 py-4 text-lg font-bold text-slate-500 active:scale-95"
        >
          ⬅️ Kembali
        </button>
      {/if}
      {#if step < LAST_STEP}
        <button
          onclick={() => (step += 1)}
          class="flex-1 rounded-xl bg-amber-500 py-4 text-lg font-black text-white active:scale-95"
        >
          Lanjut →
        </button>
      {:else}
        <button
          onclick={finish}
          class="flex-1 rounded-xl bg-amber-500 py-4 text-lg font-black text-white active:scale-95"
        >
          Mulai
        </button>
      {/if}
    </div>
  </div>
{/if}
