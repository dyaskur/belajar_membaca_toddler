# Kids Learn to Read (Bahasa Indonesia) — Build Plan

> Self-contained spec for an offline-first kids' reading app. Written so any AI agent
> can continue the build cold. Last decided: 2026-06-10.

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

## 3b. Course structure — Lessons within Levels (v2, IMPLEMENTED)

Turns each flat level into a guided **course** of small lessons. **Built & deployed** —
the lesson flow has replaced the flat per-level round (§3 describes the original design).
Routes: `/belajar/[level]` = lesson list; `/belajar/[level]/[lesson]` = teach → practice.

### Lessons
- Each level is sliced into **bite-sized lessons of ~5 new items** ("natural groups"):
  - **Level 2** → one lesson per consonant row (`ba bi bu be bo`, then `ca ci cu ce co`, …)
    = 19 lessons. (Items are already generated consonant-major, so a generic chunk-of-5
    yields exactly the consonant rows.)
  - **Level 1** → letters in groups of ~5 (≈6 lessons).
  - **Levels 3–6** → words/sentences in groups of ~4–5.
  - Implemented as a generic chunker `lessonsForLevel(levelId, size=5)`, with the option
    to override specific levels with hand-authored groupings later.

### Lesson flow: **teach → practice**
1. **Teach phase** (no failing): introduces each *new* item one at a time — big visual +
   spoken (autoplay, replay), "tap to continue". Optionally prefixed with a warm teaching
   line ("Ini huruf… *be*"). The child *learns* before being tested.
2. **Practice phase**: a short quiz (≈8 questions) using the 3-tile format from §3.
   - **Review mix = 70% new / 30% earlier.** ~70% of questions come from this lesson's new
     items, ~30% are pulled from earlier lessons in the same level (first lesson = all new).

### Progression: **sequential, mastery-gated**
- Lessons unlock **one at a time**: pass a lesson at **≥80%** to open the next.
- A **level is complete** when **all its lessons** are passed → the next level unlocks.
- This replaces the level-level "round of 10 random" gate with lesson-level gating; each
  passed lesson shows a **star**.

### Data model changes
- **Content**: add `lessonsForLevel(levelId)` → `Lesson[]` where
  `Lesson = { index, title, items: Item[] }` (title derived from items, e.g. "ba bi bu be bo").
- **Profile progress**: replace the per-level score with per-lesson tracking, e.g.
  `lessonScore[levelId][lessonIndex] = bestFraction`. Derive: a lesson is unlocked if it's
  index 0 or the previous lesson passed; a level is unlocked if every lesson of the previous
  level passed. (`unlockedLevel`/`bestScore` become derived from this.)
- **Quiz builder**: new `buildLessonRound(levelId, lessonIndex)` implementing the 70/30 mix.

### UI changes
- New **lesson-list / path screen** between the level map and the quiz:
  - Route: `/belajar/[level]` → list of lesson bubbles (locked / open / starred).
  - Route: `/belajar/[level]/[lesson]` → teach phase, then practice (reuses current quiz UI,
    mascot, confetti, combo, progress bar).
- New **Teach** component (big item card, autoplay, replay, tap-to-advance).

### Audio additions (cheap, skip-if-exists)
- Optional **teach-intro phrase pool** per level (like §6 prompts): "Ini huruf", "Dengar ya",
  "Ini…". Generated once per voice; reuses existing per-item target clips for the item itself.

### Build order (when we implement)
1. `lessonsForLevel` chunker + `Lesson` type in `levels.js`.
2. Profile progress migration to `lessonScore` (+ derived unlock helpers).
3. `buildLessonRound` (70/30) in `quiz.js`.
4. Teach component + lesson-list screen + `[lesson]` route.
5. Teach-intro phrases in `prompts.js`/`feedback.js` + regenerate audio.
6. Update level map to enter the lesson list; carry stars through.

---

## 4. Speakers / Voices (key architecture decision)

Audio is a first-class dimension, **not** baked into content. It is keyed by:

```
(engine, voice, text)  ->  audio file
```

- **Pluggable TTS engine interface.** Google Cloud TTS (`id-ID`) is the first implementation.
  ElevenLabs / Azure / others can be added later **without reworking content** — purely additive.
- **Voice is a per-profile preference.** Each child profile selects "their" speaker in the
  parent/profile area; a default voice is used until one is chosen. Set once, persists, changeable.
- **Starter voice roster**: seed 2–3 `id-ID` voices (Google Neural2/Wavenet, mix of M/F).
  Expandable by adding entries to the voice manifest + re-running the generator.

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
- **Wrong encouragement** — gentle `Coba lagi!`, `Ayo, sekali lagi!` (never scolding), then
  **re-says the target** word/letter.
- **Level / round complete** — bigger celebration: `Kamu hebat! Selesai!` (distinct from
  per-question praise), played on earning the star.
- **Tiny shared non-speech chime/buzz** (~2 files, the only non-TTS audio): fires **instantly**
  for immediate feedback; the spoken phrase follows (~1s speech lead) so response feels snappy.

Praise/encouragement phrase lists are **seed content** — editable, expandable.

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
| **Course: lessons** (planned) | Slice each level into **~5-item lessons** (natural groups; L2 = consonant rows) |
| **Course: lesson flow** | **Teach → practice** — introduce new items first, then quiz |
| **Course: review mix** | **70% new / 30%** earlier lessons in the level |
| **Course: progression** | **Sequential, mastery-gated** (≥80% per lesson; all lessons pass → next level) |
