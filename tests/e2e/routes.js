// Single source of truth for which routes get screenshotted, how they're grouped
// in the PR comment, and what they're labelled. Both workflows read this (via
// `node -p`) instead of keeping their own copies — the previous hardcoded list in
// preview.yml had to be edited in lockstep with the spec, and drift showed up as
// silently missing screenshots rather than a failure.

/**
 * `unlockAll` opts a route into the progress override: at the baseline profile
 * only pack 1 is reachable, so /belajar/3 would silently redirect back to
 * /belajar and screenshot the wrong page. /belajar itself deliberately stays
 * locked so the prerequisite-graph rendering is under test.
 * @type {Record<string, { group: string, label: string, order: number, unlockAll?: boolean }>}
 */
export const PAGE_META = {
  '/': { group: 'beranda', label: 'Beranda', order: 1 },
  '/abjad': { group: 'beranda', label: 'Abjad A–Z', order: 2 },
  '/orang-tua': { group: 'beranda', label: 'Orang Tua', order: 3 },
  '/belajar': { group: 'belajar', label: 'Peta petualangan', order: 1 },
  '/belajar/1': { group: 'belajar', label: 'Level 1 · daftar pelajaran', order: 2 },
  '/belajar/3': { group: 'belajar', label: 'Level 3a · daftar pelajaran', order: 3, unlockAll: true },
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
