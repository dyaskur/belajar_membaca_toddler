// Single source of truth for which routes get screenshotted, how they're grouped
// in the PR comment, and what they're labelled. Both workflows read this (via
// `node -p`) instead of keeping their own copies — the previous hardcoded list in
// preview.yml had to be edited in lockstep with the spec, and drift showed up as
// silently missing screenshots rather than a failure.

import { LEVELS, isPackUnlocked } from '../../src/lib/content/levels.js';

/** Baseline `unlockedLevel` of the CI profile — keep in sync with fixtures.js. */
const BASELINE_LEVEL = 1;

/**
 * Lesson-list page (/belajar/<id>) for every level, derived from LEVELS so a new
 * pack gets screenshot coverage the moment it's added to the curriculum. Ordered
 * by the curriculum itself (1, 2a…2d, 3a…3c), right after /belajar in the group.
 *
 * The `unlockAll` override is decided by the app's own unlock rule against the CI
 * profile (baseline pack 1, nothing completed): without it the page's onMount
 * bounces to /belajar and the shot shows the wrong screen. Level 1 needs no
 * override, so it keeps screenshotting the realistic locked-final-exam state.
 * @type {Record<string, { group: string, label: string, order: number, unlockAll?: boolean }>}
 */
const LEVEL_PAGES = Object.fromEntries(
  LEVELS.map((lvl, i) => [
    `/belajar/${lvl.id}`,
    {
      group: 'belajar',
      label: `Level ${lvl.label} · ${lvl.title}`,
      order: i + 2,
      unlockAll: !isPackUnlocked(lvl.id, BASELINE_LEVEL, () => false)
    }
  ])
);

/**
 * `unlockAll` opts a route into the progress override (see LEVEL_PAGES above).
 * /belajar itself deliberately stays locked so the prerequisite-graph rendering
 * is under test.
 * @type {Record<string, { group: string, label: string, order: number, unlockAll?: boolean }>}
 */
export const PAGE_META = {
  '/': { group: 'beranda', label: 'Beranda', order: 1 },
  '/abjad': { group: 'beranda', label: 'Abjad A–Z', order: 2 },
  '/orang-tua': { group: 'beranda', label: 'Orang Tua', order: 3 },
  '/belajar': { group: 'belajar', label: 'Peta petualangan', order: 1 },
  ...LEVEL_PAGES,
  // The CI profile owns no stickers, so this sweeps Buku Stiker's realistic
  // empty state — every slot a silhouette. The partly-collected state (some
  // unlocked, some still flagged "BARU") is its own scenario spec instead,
  // since PAGE_META only carries one state per route.
  '/stiker': { group: 'belajar', label: 'Buku Stiker', order: 13 },
  '/cocokkan': { group: 'game', label: 'Cocokkan', order: 1 },
  '/mesin': { group: 'game', label: 'Mesin Kata', order: 2 },
  '/ucapkan': { group: 'game', label: 'Ucapkan', order: 3 },
  '/menulis': { group: 'menulis', label: 'Pilih mode', order: 1 },
  '/menulis/tiru': { group: 'menulis', label: 'Tiru', order: 2 },
  '/menulis/susun': { group: 'menulis', label: 'Susun', order: 3 },
  '/menulis/ketik': { group: 'menulis', label: 'Ketik', order: 4 },
  '/preview': { group: 'dev', label: 'Preview', order: 1 },
  '/coba-suara': { group: 'dev', label: 'Coba Suara', order: 2 }
};

/** Product routes — always swept on main, and on any shared-code PR. */
export const ALL = Object.keys(PAGE_META).filter((p) => PAGE_META[p].group !== 'dev');

/** Dev scratchpads — only shot when their own folder changed. */
export const DEV = Object.keys(PAGE_META).filter((p) => PAGE_META[p].group === 'dev');

/** Every URL whose first path segment matches `seg` (so a /belajar change picks
 *  up its dynamic children too). @param {string} seg */
export const urlsForSegment = (seg) =>
  Object.keys(PAGE_META).filter((p) => p === `/${seg}` || p.startsWith(`/${seg}/`));
