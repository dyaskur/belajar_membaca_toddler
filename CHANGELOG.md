# Changelog

## v1.0.0 — 2026-06-15

First complete release. Offline-first PWA for learning to read Bahasa Indonesia,
deployed to GitHub Pages.

### Course
- 6 levels (letters → syllables → words → closed syllables → digraphs → sentences)
- Lessons open by default, **teach → practice** flow with narrated intro and a
  letter/syllable **blend breakdown** (`d + a = da`, `b+o=bo · l+a=la = bola`)
- **Placement test** that stars each fully-correct lesson
- **Final exam** (harder, 4 tiles) that gates the next level
- Weighted level progress (70% lessons + 30% best exam)
- Mastery gating, retry-on-wrong with contextual correction

### Voices & audio
- 4 per-profile voices: Ibu Khotijah, Pak Umar, Kak Aisyah (Google Chirp3-HD),
  Kak Bule (ElevenLabs)
- Pluggable TTS engines (Google + ElevenLabs); build-time generation, committed audio
- Per-content-type pronunciation: Wavenet spell-out for letters, Chirp3-HD `<phoneme>`
  IPA for syllables, plain for words/sentences; per-letter overrides + pinned renders
- Web Audio playback with silence-trimming (gapless); `?v=N` cache-busting

### Experience
- Talking robot mascot (recolored per profile as avatars), confetti, combo streak
- Spoken randomized praise/encouragement + instant WebAudio chime/buzz
- **"Ucapkan!"** speaking activity (browser Speech-to-Text, word reading)
- Parent area: voice select, robot color, "unlock all levels" test toggle
- Installable PWA, fully offline after first load

### Infra
- SvelteKit (Svelte 5) + Tailwind v4, `adapter-static`
- GitHub Actions → GitHub Pages, base-path aware, SPA fallback
