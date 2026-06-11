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
| Voices | Google **Chirp3-HD** (Aoede / Charon / Leda). Chosen over Standard/Wavenet because the older models mispronounced isolated syllables (e.g. "ne"); Chirp3-HD renders them cleanly with plain text. `id-ID` SSML phonemes are unreliable — avoid; use plain text. |
| Audio delivery | **Per-level, per-voice packs**; cache for offline; prefetch next; bundle default-voice L1 |
| Feedback sounds | **Spoken praise via TTS in chosen voice**, random 3–5 per level |
| Feedback scope | Correct praise + wrong encouragement + level-complete + tiny instant chime/buzz |
| Profiles | Multiple, local, no accounts |
| UI language | Kid UI = icons/audio; adult UI = Bahasa Indonesia |
