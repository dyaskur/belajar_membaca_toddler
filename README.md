# Ayo Belajar Membaca — Kids Learn to Read (Bahasa Indonesia)

Offline-first PWA that teaches young children to read Bahasa Indonesia, level by level,
with every question spoken aloud. See **[PLAN.md](./PLAN.md)** for the full design spec
and decisions log.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in /build
npm run preview    # serve the build
```

> Works immediately with **browser speech synthesis** as a fallback voice — no audio
> files or API key required to try the whole app. Generate real clips when ready.

## Generate real audio (once)

```bash
# Auth: a Google Cloud service-account JSON with Text-to-Speech enabled.
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
npm run generate:audio                       # all voices + levels
npm run generate:audio -- --voice=ibu-dewi   # one voice
npm run generate:audio -- --level=1          # one level
```

Output: `static/audio/{voice}/{level}/{slug}.mp3` + `pack.json` per (voice, level).
Re-running skips clips that already exist.

## Architecture (quick map)

| Path | Role |
|---|---|
| `src/lib/content/voices.js` | Voice manifest (engine + voice id per speaker) |
| `src/lib/content/levels.js` | Levels + item generation + distractor inputs |
| `src/lib/content/feedback.js` | Spoken praise/encouragement phrase pools per level |
| `src/lib/game/quiz.js` | Round + distractor builder |
| `src/lib/stores/profiles.svelte.js` | Local profiles, chosen voice, progress, mastery |
| `src/lib/audio/player.svelte.js` | Lazy pack load, cache warm, play, speech fallback |
| `src/lib/audio/sfx.js` | Instant WebAudio chime/buzz |
| `src/routes/` | `/` profiles · `/belajar` level map · `/belajar/[level]` quiz · `/orang-tua` parent + voice |
| `scripts/generate-audio.js` | Build-time TTS pipeline (pluggable engines) |
| `scripts/engines/*.js` | TTS engine adapters (Google now; add more) |

## Adding a speaker / engine

1. Add an entry to `VOICES` in `src/lib/content/voices.js`.
2. If it's a new engine, add an adapter in `scripts/engines/` and register it in
   `scripts/generate-audio.js`.
3. Run `npm run generate:audio`. Content is voice-agnostic, so this is purely additive.
