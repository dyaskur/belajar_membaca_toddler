# Maintenance Runbook

Operational how-tos. (Overview → [README.md](./README.md); design/decisions → [PLAN.md](./PLAN.md).)

## Golden rules

1. **Bump `AUDIO_V`** in `src/lib/audio/player.svelte.js` whenever you change/regenerate ANY
   committed clip. The service worker caches clips by URL; without a new `?v=N` users get stale
   audio. (Currently `v=15`.)
2. **Audio is committed** under `static/audio/` so the app runs offline with no key. Generation
   is **skip-if-exists** — it never overwrites an existing clip. To re-render a clip you must
   `rm` it first.
3. **Chirp3-HD and ElevenLabs are non-deterministic.** Identical requests render differently.
   Some good letter/syllable renders are **pinned** (committed by hand) — see "Fix a bad
   render". Don't `rm`+regenerate pinned clips expecting the same sound.
4. **Conventional Commits**, no co-author line. The repo's pre-commit hook normalizes the git
   author and may abort once or twice asking to "re-commit" — just re-run the same `git commit`.

## Regenerate audio

Keys live in `.env` (git-ignored): `GOOGLE_APPLICATION_CREDENTIALS`, `ELEVENLABS_API_KEY`.

```bash
npm run generate:audio                          # everything (skip-if-exists)
npm run generate:audio -- --voice=ibu-dewi      # one voice
npm run generate:audio -- --level=2             # one level
rm static/audio/ibu-dewi/2/ba.mp3               # force one clip to re-render
```

Then **bump `AUDIO_V`**, `npm run build`, commit, push (auto-deploys).

## Fix a bad / unclear letter or syllable

Because generative voices vary, the reliable fix is **generate candidates → human picks →
pin the chosen file**:

1. Generate several renders to a throwaway folder (e.g. `static/audio/_pick/`) via a small
   node script using `scripts/engines/*`, with the exact text/SSML/voice you want.
2. Serve them (`npm run dev`) and have the user pick the clear one by ear (we can't judge audio).
3. `cp` the chosen file onto the real clip path (`static/audio/{voice}/1/{letter}.mp3` and the
   `__2` slow variant). `skip-if-exists` then protects it from future regeneration.
4. Delete the throwaway folder, bump `AUDIO_V`, build, commit, deploy.

Pronunciation overrides (so a fresh full regen also gets it right) live in
`src/lib/content/pronunciation.js`:
- `LETTER_OVERRIDES` — render a letter on the main Chirp3-HD voice as plain text (`k`→"ka") or
  an IPA `<phoneme>` (`r`→`ər`). Supports `{ ipa, text, rate, tries, targetLen }`.
- `syllableIPA()` — composes IPA for syllables (used on Chirp3-HD via `<phoneme>`).
- `LETTER_NAMES` — plain Indonesian letter names for engines without SSML (ElevenLabs).

**Don't:** use `<phoneme>` on Chirp3-HD for isolated *letters* (mangles the consonant) — but DO
use it for *syllables*. ElevenLabs ignores `<phoneme>` (renders silence) — plain text only.

## Add a TTS voice

1. Add an entry to `VOICES` in `src/lib/content/voices.js` (`id`, `label`, `engine`,
   `engineVoice`, `gender`; Google voices also `letterVoice`). The **`id` is the audio folder
   name** — don't change it later (renaming the `label` is safe).
2. If it's a new engine, add an adapter in `scripts/engines/` and register it in the `ENGINES`
   map in `scripts/generate-audio.js`. Non-Google engines render plain text (no SSML).
3. `npm run generate:audio -- --voice=<id>`, bump `AUDIO_V`, build, commit.

### ElevenLabs notes
- Free plan **cannot use library voices via API** (402 paid_plan_required) — only the account's
  usable voices. The key needs the **`voices_read`** permission to list voices.
- Model `eleven_multilingual_v2`; no SSML; `speed` ≈ 0.7–1.2 (mapped from our `speakingRate`).
- Free quota is limited (~10k chars/mo) — a full multi-level generation can approach it.

## Deploy

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) builds with `BASE_PATH` and
publishes to GitHub Pages (served under `/belajar_membaca_toddler/`). SPA deep links work via a
`404.html` copy. Local dev server isn't persistent — it only runs during a session.

## Test / parent tools

- **Unlock all levels:** Pengaturan Orang Tua → Mode Tes (so you can reach any level/lesson).
- **STT diagnostic:** `/coba-suara` (not linked from kid UI).
