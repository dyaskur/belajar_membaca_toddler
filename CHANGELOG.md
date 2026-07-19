# Changelog

## [1.3.0](https://github.com/dyaskur/belajar_membaca_toddler/compare/v1.2.0...v1.3.0) (2026-07-19)


### New activities & features

* **belajar:** restructure course into branching sub-levels by codex ([#55](https://github.com/dyaskur/belajar_membaca_toddler/issues/55)) ([e3f40fe](https://github.com/dyaskur/belajar_membaca_toddler/commit/e3f40febb1ff43b63e3e83096b1f2bdca9e1be3b))

## [1.2.0](https://github.com/dyaskur/belajar_membaca_toddler/compare/v1.1.0...v1.2.0) (2026-07-17)


### New activities & features

* **belajar:** tap a suku kata to hear it whole, not spelled ([#54](https://github.com/dyaskur/belajar_membaca_toddler/issues/54)) ([087a2ee](https://github.com/dyaskur/belajar_membaca_toddler/commit/087a2ee48c0d49553e157a212200d0568be3c7ab))
* **belajar:** wrong-answer coaching — blend hint + parent-toggleable tile lock ([#48](https://github.com/dyaskur/belajar_membaca_toddler/issues/48)) ([b293306](https://github.com/dyaskur/belajar_membaca_toddler/commit/b29330695b4034517fcc8125d3a6a0b0edf4b26e))


### Infra & CI

* humanize release notes with Gemini ([#52](https://github.com/dyaskur/belajar_membaca_toddler/issues/52)) ([defa2ae](https://github.com/dyaskur/belajar_membaca_toddler/commit/defa2aee4d0a0fe52a7af4080d2535837c2b2632))

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
