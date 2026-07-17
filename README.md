# Ayo Belajar Membaca — Kids Learn to Read (Bahasa Indonesia)

An offline-first PWA that teaches young children to read Bahasa Indonesia, level by
level, with every prompt spoken aloud. Built with SvelteKit, deployed on GitHub Pages.

**Live:** https://dyaskur.github.io/belajar_membaca_toddler/
**Design spec & decisions:** [PLAN.md](./PLAN.md) · **Operational how-tos:** [MAINTENANCE.md](./MAINTENANCE.md) · **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

---

## Run

```bash
npm install
npm run dev          # http://localhost:5173  (use --host to expose on LAN)
npm run build        # static build in /build
npm run preview      # serve the build
```

Works immediately with the committed audio. To (re)generate audio you need TTS keys
(see "Audio pipeline").

## Tech stack

- **SvelteKit (Svelte 5 runes)** + **Tailwind v4**, **`adapter-static`** → fully static SPA
- **PWA**, offline-first: service worker caches the app shell + audio
- **No backend** at runtime; profiles & progress in `localStorage`
- **Deploy:** GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`), served under
  the repo subpath (`kit.paths.base`)

---

## What's done

### Course structure (3 levels, 8 sub-levels)
1. Huruf · 2a. Suku Kata Terbuka · 2b. Suku Kata Tertutup ·
2c. Gabungan Huruf · 2d. Gugus Konsonan · 3a–3c. Susun Kata (short → long)

Progress branches after 2a: 2b, 2c, 2d, and 3a open together. Passing all four advanced
prerequisites opens 3b; passing 3b opens 3c. Pack IDs remain stable so saved progress and
audio from the earlier course structure continue to work.

Each level contains:
- **Lessons** — all open by default; **teach → practice**. The teach phase shows all the
  lesson's items, narrates *"Kita akan belajar N huruf, yaitu …"* and lights up each item
  as it's spoken. Syllable/word lessons also show a **blend breakdown** (`d + a = da`,
  `b+o=bo · l+a=la = bola`). Recognition practice uses answer tiles; Level 3 practice
  builds words from syllable tiles, with distractors in 3b/3c. Mastery is ≥80% first-try.
- **Tes Penempatan (placement test)** — open from the start; tests whole lessons (~26 q)
  and **stars every lesson answered all-correct** (a single wrong leaves it un-starred).
- **Ujian Akhir (final exam)** — unlocks once all lessons are passed; passing it unlocks
  the dependent node(s) in the course graph.
- **Level progress** = 70% lessons completed + 30% best final-exam score.

### Gameplay & feedback
- Spoken, randomized praise / encouragement; instant WebAudio chime/buzz
- **Talking robot mascot** (reacts happy/sad, mouth animates while speaking), **confetti**,
  **combo streak**, progress bar
- Wrong answer → contextual *"Maaf, kamu salah. Ini D. Kamu harus cari A."*, then **retry**
  the same question (you can tap again to interrupt the voice)
- Per-lesson celebration; special pass/fail screens for the exam with **Level Berikutnya**

### Voices & pronunciation
- Per-profile **voice** (4 speakers): Ibu Khotijah, Pak Umar, Kak Aisyah (Google Chirp3-HD)
  and **Mas Bule** (ElevenLabs, young male)
- **Pluggable TTS engines** (`scripts/engines/`): Google + ElevenLabs
- Pronunciation handled per content type (see PLAN.md §3b / pronunciation.js):
  - **Letters** → Google **Wavenet spell-out** (`say-as characters`); per-letter overrides
    for unclear ones (`k`→"ka", `p`→"pe", `r`→IPA `ər`), with **pinned** renders because
    Chirp3-HD/ElevenLabs are generative (non-deterministic)
  - **Syllables/digraphs** → Chirp3-HD **`<phoneme>` IPA** (forces /e/, c=tʃ, j=dʒ, …)
  - **Words/sentences** → Chirp3-HD plain
  - **ElevenLabs** voice → plain text only (no SSML); letters use Indonesian names

### "Ucapkan!" speaking activity
- Child reads a word aloud; browser Speech Recognition (id-ID) verifies it (lenient, n-best
  + fuzzy). Word only (no picture) so they actually read. Online-only; graceful fallback.

### Profiles & parent area
- Multiple local profiles, **colored robot avatars**
- Pengaturan Orang Tua: pick voice, change robot color, and an **"unlock all levels"** test
  toggle

---

## Audio pipeline

Audio is generated once at build time and committed (so the app runs offline with no key).

```bash
# .env (git-ignored):
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-key.json
ELEVENLABS_API_KEY=...

npm run generate:audio                 # all voices + levels (skip-if-exists)
npm run generate:audio -- --voice=ibu-dewi --level=2
```

- Output: `static/audio/{voiceId}/{level}/{slug}.mp3` + `pack.json` per (voice, level);
  plus a `words/` bucket for the speaking activity. Two variants per item (normal + slow).
- Runtime plays via the **Web Audio API** with **silence-trimming** (gapless) and falls back
  to browser speech synthesis if a clip is missing.
- **Cache-busting:** clip URLs carry `?v=N` (`AUDIO_V` in `src/lib/audio/player.svelte.js`).
  **Bump it whenever you regenerate audio.**

## Project map

| Path | Role |
|---|---|
| `src/lib/content/levels.js` | levels, lessons, exam/placement, sizes |
| `src/lib/content/voices.js` | voice manifest (engine + voice ids) |
| `src/lib/content/pronunciation.js` | per-letter/syllable pronunciation overrides |
| `src/lib/content/{feedback,prompts,teach,blend,words}.js` | spoken phrases, intros, blends, picture words |
| `src/lib/game/quiz.js` | round builders (lesson / exam / placement) |
| `src/lib/stores/profiles.svelte.js` | profiles, progress, unlock rules |
| `src/lib/audio/player.svelte.js` | Web Audio playback, manifest, cache version |
| `src/lib/components/{Robot,RobotAvatar,Confetti}.svelte` | mascot, avatar, confetti |
| `src/routes/` | `/` profiles · `/belajar` levels · `/belajar/[level]` lessons · `/belajar/[level]/[lesson]` · `/orang-tua` · `/ucapkan` · `/coba-suara` (STT test) |
| `scripts/generate-audio.js` + `scripts/engines/*` | build-time TTS pipeline |

## Deploy

Push to `main` → GitHub Actions builds (with `BASE_PATH`) and publishes to GitHub Pages.
The page is served under `/belajar_membaca_toddler/`; all links/audio are base-aware.

## Known optional follow-ups

- Pak Umar (Chirp3-HD Charon) was perceived as a bit feminine — could swap to another male
  Chirp3-HD voice.
- Mas Bule (ElevenLabs, free tier) reads with an English accent and a few isolated
  letters/syllables may be off renders (R/K pinned; others can be pinned by ear).
- Spot-check L4 closed syllables (an/bak/tas) and L6 sentences for pronunciation.
- Placement test on big levels (e.g. L2's 95 syllables) covers ~26 questions per run, so it
  can't star every lesson in one go.

## License

MIT — see [LICENSE](./LICENSE).
