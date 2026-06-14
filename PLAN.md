# Kids Learn to Read (Bahasa Indonesia) — Build Plan

> Original design spec + decisions log. The app reached **v1.0 (2026-06-15)** and evolved
> past parts of this plan. **For the as-built current state, see [README.md](./README.md)
> and [CHANGELOG.md](./CHANGELOG.md).** This doc is kept accurate for the materially-changed
> areas (course structure §3b, voices §4, feedback §6, decisions §11) and records the why.

---

## 1. Goal

A tablet web app (PWA) that teaches young children to read **Bahasa Indonesia**, level by level.
Every question is **spoken aloud** (audio-first, because the kids can't read yet). Audio is
**generated once** by a build-time TTS pipeline and shipped as static files — never synthesized
live on the device.

---

## 2. Tech Stack

- **SvelteKit (Svelte 5)** + **Tailwind CSS**
- **`@sveltejs/adapter-static`** → fully static build, no server at runtime
- **PWA**: installable, **offline-first** (service worker + CacheStorage/IndexedDB)
- Target device: **tablet** (touch, large tap targets, landscape-friendly)
- Local persistence: profiles + progress in **localStorage/IndexedDB** (no backend, no accounts)
- Audio generation: **Node build script** calling a pluggable TTS engine (Google Cloud TTS first)

No backend service is required for runtime. The only external dependency is a TTS provider key,
used **at build time only**.

---

## 3. Learning Model

### Levels (progression)
1. **Level 1 — Letters**: recognize single letters (multiple choice).
2. **Level 2 — CV syllables**: consonant + vowel — `ba bi bu bo be`, `ca ci cu co ce`, …
3. **Level 3 — Words**: simple 2-syllable words (e.g. `bola`, `sapi`, `buku`).
4. **Level 4 — Closed syllables**: VC / CVC patterns (e.g. `an`, `bak`, `tas`).
5. **Level 5 — Digraphs**: `ng`, `ny`, `kh`, `sy` (e.g. `nga`, `nyi`).
6. **Level 6 — Sentences**: short simple sentences.

> Levels 3–6 word/sentence lists are **seed content** — start small, easy to edit/expand.

### Question flow (every level)
- **Teach-then-quiz**: briefly present the target (show + speak), then quiz.
- **3 answer tiles**: 1 correct + **2 auto-generated distractors** (similar-looking/sounding).
- **Round** = ~10 questions.
- **Mastery gate**: score **≥ 80%** in a round unlocks the next level. (Threshold configurable.)
- Tiles stay at **3** for now (option to grow 3→4 later — not in v1).

### Every question is spoken
- Audio **autoplays** when a question appears.
- A **replay button** lets the child hear it again (unlimited).
- Audio is **pre-generated** (see §5), keyed by `(engine, voice, text)`.

---

## 3b. Course structure — as built (v1.0)

Each level is a **course**: a placement test, open lessons, and a final exam.
Routes: `/belajar/[level]` = lesson list; `/belajar/[level]/[lesson]` = a lesson/test.
(§3 describes the original flat-round design, which the course replaced.)

### Lessons (all open by default)
- Each level is sliced into bite-sized lessons (`lessonsForLevel` in `levels.js`):
  - **Level 1** → groups of 4 ending `u v w` / `x y z` (first lesson A B C D, no lone Z).
  - **Level 2** → one lesson per consonant row (`ba bi bu be bo`, …) = 19 lessons.
  - **Levels 3–6** → groups of ~5 (trailing single item folded into the previous lesson).
- **No sequential gating** — every lesson is playable in any order (changed from the earlier
  one-at-a-time design).

### Lesson flow: teach → practice
1. **Teach phase** — shows **all** the lesson's items together and narrates *"Kita akan
   belajar N huruf, yaitu …"* (one fluid clip), lighting up each item as it's spoken. Tap an
   item to replay it. Syllable/word lessons also show a **blend breakdown** (`d + a = da`,
   `b+o=bo · l+a=la = bola`) using letter (L1) + syllable (L2) clips. See `teach.js`, `blend.js`.
2. **Practice** — 3-tile quiz, **70% new + 30% review** (`buildLessonRound`). Mastery ≥80%
   (first-try). Wrong answer → contextual *"Ini D. Kamu harus cari A."* then **retry** (tap
   another tile to interrupt the voice). Pass stars the lesson; "Lanjut" → next lesson.

### Tests
- **Tes Penempatan (placement test)** — open from the start; capped at ~26 questions built
  from **whole lessons** (`buildPlacementRound`). On finish it **stars every lesson whose
  items were all answered correctly** (a single wrong leaves it un-starred). Does not unlock
  the next level by itself.
- **Ujian Akhir (final exam)** — unlocks once **all lessons are passed**; **harder: 4 tiles**
  (`buildExamRound`, `FINAL_EXAM_TILES`). Passing it **unlocks the next level**.

### Progress & unlock
- A **level** unlocks the next only via the **final exam** pass (`recordLessonResult`).
- **Level progress %** (`profiles.levelProgress`) = `0.7 × lessons-completed-fraction +
  0.3 × best-final-exam-score`.
- Profile state: `lessonScore[levelId][index]`, `unlockedLevel`, plus a testing
  **"unlock all levels"** toggle.

---

## 4. Speakers / Voices (key architecture decision)

Audio is a first-class dimension, **not** baked into content. It is keyed by:

```
(engine, voice, text)  ->  audio file
```

- **Pluggable TTS engine interface.** `scripts/engines/` has **Google** and **ElevenLabs**
  adapters; adding more is additive (no content rework).
- **Voice is a per-profile preference.** Each child profile selects "their" speaker.
- **As-built roster (v1.0)** — 4 voices in `voices.js` (display label / engine voice):
  - **Ibu Khotijah** — Google Chirp3-HD Aoede (id `ibu-dewi`, default)
  - **Pak Umar** — Google Chirp3-HD Charon (id `pak-budi`)
  - **Kak Aisyah** — Google Chirp3-HD Leda (id `kakak-sari`)
  - **Kak Bule** — ElevenLabs young-male (id `kak-charlie`; English accent, free-plan limit)
  - Internal **ids** are also the audio folder names; renaming labels doesn't move audio.
- **Generative-voice caveat:** Chirp3-HD and ElevenLabs are **non-deterministic** — identical
  requests render differently. Specific approved letter renders (R, K, …) are **pinned** as
  committed files; `skip-if-exists` protects them. Don't blindly delete+regenerate pinned clips.

### Audio delivery — per-level, per-voice packs
- When a profile **enters a level**, fetch & cache **that level's pack for the chosen voice**.
- Once a level's pack is cached → that level plays **fully offline**.
- **Prefetch the next level** in the background.
- **Bundle the default voice's Level-1 pack** in the app so the very first launch works
  instantly, offline, with no download.
- Cache packs in **CacheStorage/IndexedDB**; generation is **skip-if-exists** (truly once per voice).

A "pack" = all audio a child needs for one (level, voice): the question clips **and** the
feedback phrases (see §6).

---

## 5. Build-Time TTS Pipeline

A Node script (`scripts/generate-audio.*`) that:
1. Reads **content data** (text, voice-agnostic) + a **voice manifest** (engine + voice IDs).
2. For each `(voice, level)`, synthesizes every needed clip via the selected **engine adapter**.
3. Writes files to `static/audio/{voice}/{level}/…` and emits/updates a **manifest** mapping
   `(voice, level)` → list of `{ id, text, file }`.
4. **Skip-if-exists**: never regenerates an existing clip → safe & cheap to re-run.

Engine adapter interface (conceptual):

```ts
interface TtsEngine {
  id: string; // e.g. "google"
  synthesize(text: string, voice: string): Promise<Buffer>; // returns audio bytes
}
```

**Only external dependency:** a Google Cloud TTS service-account key (build-time env var).
Until the key is present, the app runs with **placeholder clips** so the UI is fully testable.

---

## 6. Feedback — spoken, randomized, per level, per voice

Replaces generic sound effects. Each (level, voice) pack contains **3–5 random variants** of each
feedback type, spoken in the **profile's chosen voice**, picked at random each time:

- **Correct praise** — `Hebat!`, `Pintar!`, `Betul!`
- **Wrong (as built)** — contextual, naming both: *"Maaf, kamu salah. **Ini D. Kamu harus
  cari A.**"* (composed from a lead + connectors + the tapped tile + the target), then the
  child **retries** the same question. (The Ucapkan speaking activity instead just encourages
  — it must NOT read the word, or the child waits to be told.)
- **Lesson complete** — `Kamu hebat! Selesai!` on pass; on fail, `LESSON_FAIL` (no celebration).
- **Tests** — placement: "N pelajaran selesai"; final exam: pass/fail screen with spoken
  `EXAM_PASS`/`EXAM_FAIL` and a **Level Berikutnya** button.
- **Tiny shared non-speech chime/buzz** (WebAudio, the only non-TTS audio) fires **instantly**;
  the spoken phrase follows.

Phrase lists live in `feedback.js` — editable, expandable.

---

## 7. UX / UI

- **Kid-facing**: icon-driven, audio-driven, large touch targets, minimal text (kids can't read).
- **Adult-facing** (profile management, voice selection, settings): text in **Bahasa Indonesia**.
- **Multiple local profiles** — each with its own progress + chosen voice. No login/accounts.
- Instant **visual feedback** (animation) on every answer, paired with the audio feedback above.

---

## 8. Data / Content Separation

Keep **content** (voice-agnostic) separate from **audio** (generated per engine/voice/level):

- `content/` — level definitions, word/sentence lists, feedback phrase lists, distractor rules.
- `static/audio/{voice}/{level}/` — generated clips.
- `manifest` — maps (voice, level) → clips; drives lazy loading + caching.

This separation is what makes new speakers/engines purely additive.

---

## 9. Build Order (suggested first PR)

1. Scaffold SvelteKit (Svelte 5) + Tailwind + `adapter-static` + PWA (service worker).
2. Local **profile** CRUD + **voice-selection** flow (parent area).
3. **Content** data structures + seed Level 1–2 (letters, CV syllables) + distractor generator.
4. **Teach/quiz loop** running on the **default voice + Level-1 pack** (placeholder clips OK).
5. **Pluggable TTS generator** script + voice manifest + `static/audio/{voice}/{level}` output.
6. **Pack manifest + lazy-load/cache layer** (fetch on level entry, prefetch next, offline).
7. **Spoken feedback** system (random 3–5 per type) + instant chime/buzz.
8. Mastery gating + progress persistence.

Then: add Google key → run generator → replace placeholders.

---

## 10. Open Items (not blockers to scaffold)

1. **Google Cloud TTS service-account key** (build-time only) — only external dependency.
2. **Starter voice roster** — exact `id-ID` voice IDs to seed (pick 2–3; M/F mix).
3. **Seed content** — praise/encouragement phrases + Level 3–6 word/sentence lists (author edits).
4. **Mastery threshold** (default **80%**) and whether tiles grow **3→4** later (default: stay 3).

---

## 11. Decisions Log (resolved)

| Topic | Decision |
|---|---|
| Framework | SvelteKit (Svelte 5) + Tailwind, `adapter-static`, PWA, offline-first |
| Runtime backend | None — static + local storage |
| Audio synthesis | Build-time only, generated once, shipped static |
| Levels | 6: letters → CV → words → closed syllables → digraphs → sentences |
| Question format | Teach-then-quiz, 3 tiles (1 correct + 2 auto distractors), rounds of ~10 |
| Progression | Mastery ≥80% unlocks next level |
| Speak each question | Autoplay + unlimited replay |
| Voice key | `(engine, voice, text)`; pluggable engine interface |
| Voice selection | **Per-profile** preference, default until chosen |
| First engine | Google Cloud TTS (`id-ID`); ElevenLabs/Azure later, additive |
| Voices | Google **Chirp3-HD** (Aoede / Charon / Leda) for syllables/words/sentences. |
| Pronunciation (per content type) | **Letters** (L1): gender-matched **Wavenet** + SSML `<say-as interpret-as="characters">` (Chirp3-HD anglicizes isolated letters → "double-u"). **Syllables** (L2; digraphs L5): **Chirp3-HD + SSML `<phoneme alphabet="ipa">`** with IPA composed from consonant+vowel maps (forces /e/ not English "be"=/bi/, and correct c=tʃ, j=dʒ, y=j). **Words/sentences**: Chirp3-HD plain. See `src/lib/content/pronunciation.js`. Per-letter IPA on Standard voices was unreliable, but phoneme on Chirp3-HD works. |
| Audio cache-busting | Clip URLs carry `?v=N` (`AUDIO_V` in `player.svelte.js`); bump N when regenerating so the offline service worker doesn't serve stale clips by filename. |
| Audio delivery | **Per-level, per-voice packs**; cache for offline; prefetch next; bundle default-voice L1 |
| Feedback sounds | **Spoken praise via TTS in chosen voice**, random 3–5 per level |
| Feedback scope | Correct praise + wrong encouragement + level-complete + tiny instant chime/buzz |
| Profiles | Multiple, local, no accounts |
| UI language | Kid UI = icons/audio; adult UI = Bahasa Indonesia |
| **Course: lessons** | Bite-sized lessons (L1 groups of 4 ending uvw/xyz; L2 = consonant rows). **All open by default** (no sequential gating). |
| **Course: lesson flow** | **Teach → practice**: teach shows all items + narrates + highlights + blend breakdown; practice = 3 tiles, **70% new / 30% review**, retry-on-wrong with contextual correction |
| **Course: placement test** | Open from start; ~26 q from whole lessons; **stars each fully-correct lesson**; doesn't unlock next level |
| **Course: final exam** | Unlocks when all lessons pass; **harder = 4 tiles**; passing it **unlocks the next level** |
| **Course: level progress** | `0.7 × lessons-completed + 0.3 × best-final-exam-score` |
| Engines | Pluggable: **Google** (Chirp3-HD + Wavenet) and **ElevenLabs** (`scripts/engines/`) |
| Voices (v1.0) | 4: Ibu Khotijah, Pak Umar, Kak Aisyah (Google), Kak Bule (ElevenLabs). Generative ⇒ non-deterministic ⇒ approved letter renders **pinned**. |
| Letter overrides | Per-letter fixes on the main voice where spell-out is unclear: `k`→"ka", `p`→"pe", `r`→IPA `ər` (`LETTER_OVERRIDES`) |
| Playback | **Web Audio API** with silence-trimming (gapless); speech-synth fallback for missing clips |
| Speaking activity | **Ucapkan** — read a word aloud, browser STT (id-ID) verifies; encourages only (never reads the answer) |
| Avatars | Per-profile **colored robot** (same mascot, recolored) — non-living, picker in parent area |
| Deploy | GitHub Actions → **GitHub Pages** under repo subpath (`kit.paths.base`), SPA 404 fallback |
