<script>
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { DEFAULT_AVATAR, ROBOT_COLORS, robotColor } from '$lib/content/avatars.js';
  import { DEFAULT_VOICE_ID, VOICES } from '$lib/content/voices.js';
  import { DEFAULT_AGE_BAND, profileOptionsForAge } from '$lib/content/profile-options.js';
  import { player } from '$lib/audio/player.svelte.js';
  import { profiles } from '$lib/stores/profiles.svelte.js';
  import { clearNameNudgeState, nudgeNameInput } from '$lib/name-nudge.js';
  import AgePicker from './AgePicker.svelte';
  import Robot from './Robot.svelte';
  import RobotAvatar from './RobotAvatar.svelte';

  const GREETING = 'Halo, ayo belajar membaca!';

  let step = $state(0);
  let voiceId = $state(DEFAULT_VOICE_ID);
  let avatar = $state(DEFAULT_AVATAR);
  let ageBand = $state(DEFAULT_AGE_BAND);
  let name = $state('');
  let showNameHint = $state(false);
  let shakeName = $state(false);
  /** @type {HTMLInputElement | undefined} */
  let nameInput = $state();

  const color = $derived(robotColor(avatar));

  async function start() {
    step = 1;
    await tick();
    await player.speak(voiceId, 1, GREETING);
  }

  /** @param {string} nextVoiceId */
  async function chooseVoice(nextVoiceId) {
    voiceId = nextVoiceId;
    await player.speak(nextVoiceId, 1, GREETING);
  }

  function back() {
    if (step > 1) step -= 1;
  }

  function next() {
    if (step < 4) step += 1;
  }

  function clearNameNudge() {
    clearNameNudgeState(setNameNudge);
  }

  /** @param {boolean} show @param {boolean} shake */
  function setNameNudge(show, shake) {
    showNameHint = show;
    shakeName = shake;
  }

  async function nudgeName() {
    await nudgeNameInput({
      setNameNudge,
      focusInput: () => nameInput?.focus(),
      speak: (text) => player.speak(voiceId, 1, text)
    });
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      await nudgeName();
      return;
    }
    profiles.add(trimmed, avatar, voiceId, profileOptionsForAge(ageBand));
    goto(`${base}/belajar`);
  }
</script>

<section class="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center py-6">
  {#if step === 0}
    <div class="flex flex-col items-center text-center">
      <Robot mood="happy" size={150} />
      <h1 class="mt-3 text-4xl font-black text-amber-600">Ayo Belajar Membaca</h1>
      <button
        type="button"
        onclick={start}
        class="mt-8 w-full max-w-xs rounded-2xl bg-amber-500 px-8 py-4 text-2xl font-black text-white shadow-lg active:scale-95"
      >
        Mulai
      </button>
    </div>
  {:else}
    <div class="mb-5 flex items-center justify-between text-sm font-black uppercase text-slate-400">
      <span>Langkah {step}/4</span>
      <div class="flex gap-1" aria-hidden="true">
        {#each [1, 2, 3, 4] as dot}
          <span class="block size-2 rounded-full {dot <= step ? 'bg-amber-400' : 'bg-slate-200'}"></span>
        {/each}
      </div>
    </div>

    <div class="rounded-3xl bg-white p-5 shadow-xl sm:p-6">
      {#if step === 1}
        <h2 class="mb-4 text-2xl font-black text-slate-800">Pilih suara</h2>
        <div class="grid gap-3">
          {#each VOICES as voice (voice.id)}
            <button
              type="button"
              aria-pressed={voiceId === voice.id}
              onclick={() => chooseVoice(voice.id)}
              class="flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left shadow-sm active:scale-[0.98]
                {voiceId === voice.id
                  ? 'border-amber-400 bg-amber-100 text-amber-900'
                  : 'border-slate-100 bg-slate-50 text-slate-600'}"
            >
              <span class="grid size-12 place-items-center rounded-full bg-white text-xl font-black text-amber-500">♪</span>
              <span class="flex-1 font-black">{voice.label}</span>
              <span class="text-xl font-black">{voiceId === voice.id ? '✓' : '›'}</span>
            </button>
          {/each}
        </div>
      {:else if step === 2}
        <h2 class="mb-4 text-2xl font-black text-slate-800">Pilih warna robot</h2>
        <div class="mb-5 flex justify-center">
          <Robot mood="happy" head={color.head} body={color.body} size={150} />
        </div>
        <div class="grid grid-cols-4 gap-2">
          {#each ROBOT_COLORS as rc (rc.id)}
            <button
              type="button"
              aria-pressed={avatar === rc.id}
              aria-label={`Robot ${rc.id}`}
              onclick={() => (avatar = rc.id)}
              class="grid aspect-square place-items-center rounded-2xl border-2 p-1 active:scale-95
                {avatar === rc.id ? 'border-amber-400 bg-amber-100 shadow' : 'border-slate-100 bg-slate-50'}"
            >
              <RobotAvatar color={rc.id} size={48} />
            </button>
          {/each}
        </div>
      {:else if step === 3}
        <h2 class="mb-4 text-2xl font-black text-slate-800">Berapa umurmu?</h2>
        <AgePicker bind:value={ageBand} />
      {:else}
        <h2 class="mb-4 text-2xl font-black text-slate-800">Tulis nama kamu</h2>
        <input
          bind:this={nameInput}
          bind:value={name}
          oninput={clearNameNudge}
          aria-invalid={showNameHint}
          aria-describedby="welcome-name-hint"
          placeholder="Nama anak"
          class:nudge-shake={shakeName}
          class="w-full rounded-2xl border-2 px-4 py-4 text-xl font-bold outline-none transition
            {showNameHint
              ? 'border-red-300 bg-amber-50 ring-4 ring-amber-200'
              : 'border-slate-200 bg-white focus:border-amber-300 focus:ring-4 focus:ring-amber-100'}"
        />
        <p id="welcome-name-hint" class="mt-2 min-h-5 text-sm font-bold text-red-500">
          {showNameHint ? 'Silakan tulis namamu dulu' : ''}
        </p>
      {/if}

      <div class="mt-6 flex gap-3">
        {#if step > 1}
          <button
            type="button"
            onclick={back}
            class="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-600 active:scale-95"
          >
            ← Kembali
          </button>
        {/if}
        {#if step < 4}
          <button
            type="button"
            onclick={next}
            class="flex-1 rounded-2xl bg-amber-500 px-4 py-3 font-black text-white shadow active:scale-95"
          >
            Lanjut →
          </button>
        {:else}
          <button
            type="button"
            onclick={save}
            class="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-lg font-black text-white shadow active:scale-95"
          >
            Mulai
          </button>
        {/if}
      </div>
    </div>
  {/if}
</section>
