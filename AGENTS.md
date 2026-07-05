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
- No test script currently exists.

**PR previews:** every PR auto-deploys to Cloudflare Pages via `.github/workflows/preview.yml`
(direct-upload with wrangler; a sticky PR comment has the URL) at
`pr-<N>.kids-learn-8f0.pages.dev`. This is separate from the GitHub Pages prod deploy, which only
triggers on push to `main`.

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

All pictures/images added to the app must have **no faces** (aniconism). This is not a ban
on animals — a faceless animal image is fine, but current face-bearing emoji/art are excluded
for that reason specifically. When adding new visual content, prefer faceless emoji/art:
objects, food, nature, celestial, etc.

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

