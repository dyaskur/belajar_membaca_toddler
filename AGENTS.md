# Agent Instructions

## Project overview

**Ayo Belajar Membaca** — offline-first SvelteKit (Svelte 5) + Tailwind v4 PWA teaching
Bahasa Indonesia reading. Deployed to GitHub Pages: https://dyaskur.github.io/belajar_membaca_toddler/
(push to `main` → GitHub Actions → Pages). Design docs: `README.md`, `PLAN.md`, `CHANGELOG.md`.

Commands:
- `npm run dev` — start dev server
- `npm run build` / `npm run preview` — production build / preview it locally
- `npm run check` — svelte-kit sync + svelte-check (type/lint check; run before considering
  a change done)
- `npm run generate:audio` — regenerate TTS audio clips (needs `.env` with
  `GOOGLE_APPLICATION_CREDENTIALS` and `ELEVENLABS_API_KEY`)
- `npm run test:unit` / `npm run test:e2e` — vitest unit specs / Playwright smoke specs
- Photo pipeline, per source set (`stickers` = curriculum album, `kata` = Album Kata words):
  `npm run suggest:photos` (fills `assets/kata-src/sources.tsv` with candidates, needs
  `PEXELS_API_KEY` to pre-fill) → `npm run fetch:stickers -- --set=kata` →
  `npm run prepare:stickers -- --set=kata`. A newly pictured word must also be added to
  `PHOTO_WORDS` in `src/lib/content/kata-catalog.js`, or the album will not show it.

**PR previews:** every same-repository PR auto-deploys to Cloudflare Pages via
`.github/workflows/preview-deploy.yml`. After that succeeds, `.github/workflows/preview.yml`
runs the smoke tests and screenshots against the deployed URL and posts the sticky PR comment.
Preview URLs are `pr-<N>.kids-learn-8f0.pages.dev`. This is separate from the GitHub Pages prod
deploy, which only triggers on push to `main`.

## Commit messages and PR titles

This repo uses **squash-and-merge**, so a pull request's title becomes the final
commit message on `main` — the individual commits inside the branch are discarded.

Both git commit messages and PR titles MUST follow **Conventional Commits**:

```
<type>(<optional scope>): <short summary>
```

- Subject: imperative mood, lowercase, no trailing period.
- Common types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `perf`, `build`, `ci`.
- Add a body with bullet points when the change has multiple parts.

When opening a PR (e.g. `gh pr create --title ...`), the `--title` value must itself
be a valid Conventional Commits subject line, since that's what ends up in `main`'s history.

Note: this repo has a pre-commit hook that adjusts the author name/email and may abort
once or twice asking to "re-commit" — just re-run the same `git commit` command until it lands.

**Model trailer:** every commit made by an AI coding agent MUST end with a trailer identifying
the exact model that made the change, e.g.:

```
Model: Claude Sonnet 5
```

Use the model's real name (not the tool/product name — e.g. `Claude Sonnet 5`, not "Claude Code";
`GPT-5.1-Codex`, not "Codex"). This exists because a prior squash-merge commit incorrectly
credited a `Co-authored-by:` trailer to the wrong agent/model — get the identification right.

## Branch naming

Use `<type>/<short-kebab-description>`, matching the Conventional Commits types above
(e.g. `feat/kartu-game`, `fix/audio-cachebust`, `chore/deps-bump`). Don't prefix branches with
the AI tool's name (`codex/…`, `claude/…`) — some existing branches predate this convention;
don't rename them, just follow this going forward for new branches.

## GitHub issue titles

Issue titles use a spelled-out prefix, NOT the Conventional Commits abbreviation:
`feature: <name> — <short description>` (not `feat:`). Other prefixes in use: `content:`,
`voice:`, `course:`. Match whichever fits the issue.

## Image/picture content rule

**Emoji and drawn/illustrated art** added to the app must have **no faces** (aniconism). This
is not a ban on animals — a faceless animal image is fine, but current face-bearing emoji/art
are excluded for that reason specifically. When adding new emoji/art, prefer faceless ones:
objects, food, nature, celestial, etc.

**Real photographs may contain human or animal faces** (decided in #99, and applies to #98
too). Without this carve-out, whole categories — `sapi`, `kuda`, `mama`, `bayi` — could never
be pictured at all. It applies to photos only; do not use it to justify a face-bearing emoji.
The other photo rules still hold: one clear subject a 3-year-old recognizes at 512px, no text
overlays, no watermarks, and the licence recorded in the set's `credits.json`.

## Audio content

Audio clips are build-time generated and committed (`scripts/generate-audio.js`). After
regenerating any clips, bump `AUDIO_V` in `src/lib/audio/player.svelte.js` to cache-bust, or
users will get stale audio. Chirp3-HD and ElevenLabs voices are non-deterministic — some
specific letter renders are intentionally pinned as committed files; don't blindly
delete+regenerate pinned clips.

4 voices (labels → internal ids, used as audio folder names — do not rename the ids):
Ibu Khotijah → `ibu-dewi`, Pak Umar → `pak-budi`, Kak Aisyah → `kakak-sari` (all Google),
Kak Bule → `kak-charlie` (ElevenLabs).

Pronunciation is per-content-type:
- Letters: Google Wavenet with `say-as`
- Syllables: Chirp3-HD with `<phoneme>` IPA
- Words/sentences: plain text (Google)
- ElevenLabs: plain text only, no SSML support
