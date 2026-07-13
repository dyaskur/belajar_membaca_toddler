# Changelog

## v1.1.0 — 2026-07-13

New activities, first-run onboarding, and an app-wide visual refresh on top of v1.0.

### New activities
- **Belajar Menulis** — writing activity with three modes: trace (*tiru*),
  build (*susun*), and type (*ketik*) (#12)
- **Abjad** — tappable A–Z alphabet reference page (#11)
- **Cocokkan** — match-the-word-to-picture game (#21)
- **Mesin Kata** — syllable slot-machine game (#29)

### Onboarding & profiles
- **Profile creation wizard** for first run — pick speaker, robot color, age,
  and name (#33)
- Confirm before deleting a profile; clear a stale active-profile id (#36)

### Visual refresh ("juice")
- Eye-catching answer tiles and juicier win/fail effects in Belajar (#41)
- Animated **`b + a = ba`** blend reveal after correct answers (#47)
- Colorful word tiles + match burst, wobble on miss in Cocokkan (#43)
- Colorful build tiles + emerald spell feedback + win burst in Menulis (#44)
- Colorful **/abjad**, living progress bar, and streak flame tiers (#45)
- Robot mascot tap gags — head-fly and spin-head (#46)

### Course & quiz
- Configurable quiz tile count (#13)
- Quiz always includes a same-first-letter distractor (#31)
- Menulis *tiru* fails gently when a trace strays outside the letter (#35)

### Infra & CI
- Per-PR Cloudflare Pages preview deploys with page smoke-test screenshots (#27)
- Contributor guide (`AGENTS.md`)

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
