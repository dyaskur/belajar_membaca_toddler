/**
 * "Cari Kata" — word search on a grid of SYLLABLES (see #99).
 *
 * This module owns the game's rules and copy; the words themselves come from the shared
 * `kata-catalog.js`. Everything here is pure so a board can be generated and asserted in a
 * unit test — the running game only supplies an RNG and a "words this child already has".
 */
import {
  SYLLABLES,
  WORD_CATALOG,
  albumWordsBySyllableCount,
  catalogEntry,
  isRealWord,
  isUnsafeWord
} from './kata-catalog.js';

/**
 * Board tiers. `syllables` is the range a target word may span; the grid is square.
 * @typedef {'mudah'|'sedang'|'sulit'} Difficulty
 * @type {{ key: Difficulty, title: string, size: number, syllables: number[], icon: string }[]}
 */
export const DIFFICULTIES = [
  { key: 'mudah', title: 'Mudah', size: 4, syllables: [2], icon: '🐣' },
  { key: 'sedang', title: 'Sedang', size: 5, syllables: [2, 3], icon: '🦊' },
  { key: 'sulit', title: 'Sulit', size: 6, syllables: [3, 4], icon: '🦁' }
];

/** How many picture words a child hunts on one board. */
export const TARGETS_PER_BOARD = 3;

/** @param {string} key */
export function difficulty(key) {
  return DIFFICULTIES.find((tier) => tier.key === key) ?? DIFFICULTIES[0];
}

/**
 * Directions a selection may run: left→right and top→bottom only. No diagonals and no
 * reversals — a 3-year-old reading "lu-ka" backwards as "ka-lu" is a lesson in the wrong
 * direction, and the swipe is hard enough already.
 */
export const DIRECTIONS = [
  { dr: 0, dc: 1 }, // mendatar
  { dr: 1, dc: 0 } // menurun
];

// ── Spoken copy ──────────────────────────────────────────────────────────────────────
// Kept short and few: every line here becomes 8 clips (4 voices × 2 variants).

export const CARI_INTRO = 'Ayo cari kata di papan';
/** Said when a hunted word is found. */
export const CARI_FOUND = ['Ketemu!', 'Hebat, ketemu!', 'Pintar sekali!', 'Wah, dapat!'];
/** Said for a real word that is not one of the three targets. */
export const CARI_BONUS = ['Wah, itu kata juga!', 'Kamu menemukan kata lain!', 'Bagus, kata baru!'];
/** Said for a combination that is not a word. Never a buzz, never a sad robot. */
export const CARI_FUNNY = ['Hihihi, lucu ya!', 'Kata apa itu?', 'Bunyinya aneh!', 'Coba cari lagi!'];
/** Said when all three targets are found. */
export const CARI_DONE = 'Semua ketemu! Hebat sekali!';
/** Said when a blocked combination is selected — neutral, no explanation. */
export const CARI_SKIP = 'Coba cari kata lain';

/** Every string the `cari-kata` audio bucket has to contain. */
export function cariKataTexts() {
  return [CARI_INTRO, ...CARI_FOUND, ...CARI_BONUS, ...CARI_FUNNY, CARI_DONE, CARI_SKIP];
}

// ── Reading a selection ──────────────────────────────────────────────────────────────

/**
 * What the game should do with the syllables a child just swiped.
 *
 * `speak` is what the caller must voice: a whole word when we have (or could have) a clip
 * for it, otherwise the syllables to chain. Everything is spoken — that is the whole point
 * of the mode — so there is no "silent" outcome except a blocked word.
 *
 * @param {string[]} syllables
 * @param {string[]} targets Words hunted on this board.
 * @returns {{ word: string, kind: 'target'|'bonus'|'nonsense'|'blocked', entry?: import('./kata-catalog.js').CatalogWord }}
 */
export function readSelection(syllables, targets = []) {
  const word = syllables.join('');
  if (isUnsafeWord(word)) return { word, kind: 'blocked' };
  if (targets.includes(word)) return { word, kind: 'target', entry: catalogEntry(word) };
  if (isRealWord(word)) return { word, kind: 'bonus', entry: catalogEntry(word) };
  return { word, kind: 'nonsense' };
}

// ── Board generation ─────────────────────────────────────────────────────────────────

/** @typedef {{ word: string, syl: string[], row: number, col: number, dr: number, dc: number }} Placement */
/**
 * @typedef {Object} Board
 * @property {Difficulty} difficulty
 * @property {number} size
 * @property {string[][]} cells
 * @property {Placement[]} targets
 */

/** Mulberry32 — a tiny seeded RNG so a board can be reproduced in a test. @param {number} seed */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {T[]} list @param {() => number} rng @returns {T[]} @template T */
function shuffled(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick the words to hide. Prefers words the child has not collected yet, so a board keeps
 * handing out new album cards for as long as the catalog can.
 * @param {number[]} sizes Allowed syllable counts.
 * @param {Set<string>} owned
 * @param {() => number} rng
 */
function pickTargets(sizes, owned, rng) {
  const pool = sizes.flatMap((n) => albumWordsBySyllableCount(n));
  const fresh = pool.filter((entry) => !owned.has(entry.w));
  const ordered = [...shuffled(fresh, rng), ...shuffled(pool.filter((entry) => owned.has(entry.w)), rng)];
  /** @type {import('./kata-catalog.js').CatalogWord[]} */
  const picked = [];
  for (const entry of ordered) {
    if (picked.length === TARGETS_PER_BOARD) break;
    if (picked.some((chosen) => chosen.w === entry.w)) continue;
    picked.push(entry);
  }
  return picked;
}

/**
 * Try to lay a word into the grid. Words may cross where they share a syllable; a cell that
 * already holds a different syllable blocks the placement.
 * @param {(string|null)[][]} cells @param {string[]} syl @param {() => number} rng
 * @returns {Placement|null}
 */
function place(cells, syl, rng) {
  const size = cells.length;
  /** @type {Placement[]} */
  const spots = [];
  for (const { dr, dc } of DIRECTIONS) {
    const maxRow = dr ? size - syl.length : size - 1;
    const maxCol = dc ? size - syl.length : size - 1;
    for (let row = 0; row <= maxRow; row++) {
      for (let col = 0; col <= maxCol; col++) {
        let fits = true;
        for (let i = 0; i < syl.length && fits; i++) {
          const existing = cells[row + dr * i][col + dc * i];
          if (existing !== null && existing !== syl[i]) fits = false;
        }
        if (fits) spots.push({ word: syl.join(''), syl, row, col, dr, dc });
      }
    }
  }
  if (!spots.length) return null;
  const spot = shuffled(spots, rng)[0];
  for (let i = 0; i < syl.length; i++) cells[spot.row + spot.dr * i][spot.col + spot.dc * i] = syl[i];
  return spot;
}

/**
 * Every straight run of 2–4 cells, in both allowed directions — the exact set of words a
 * child can produce on this board.
 * @param {string[][]} cells
 */
export function allRuns(cells) {
  const size = cells.length;
  /** @type {string[][]} */
  const runs = [];
  for (const { dr, dc } of DIRECTIONS) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        /** @type {string[]} */
        const run = [];
        for (let i = 0; i < 4; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r >= size || c >= size) break;
          run.push(cells[r][c]);
          if (run.length >= 2) runs.push([...run]);
        }
      }
    }
  }
  return runs;
}

/** Does this grid spell anything a child must not be shown or read? @param {string[][]} cells */
export function hasUnsafeRun(cells) {
  return allRuns(cells).some((run) => isUnsafeWord(run.join('')));
}

/**
 * Build a playable board.
 *
 * Filler syllables are drawn from the syllables the catalog actually uses, so idle swiping
 * stumbles onto real words more often than pure random fill would allow.
 *
 * @param {Difficulty} key
 * @param {{ owned?: Set<string>, rng?: () => number, attempts?: number }} [opts]
 * @returns {Board}
 */
export function makeBoard(key, opts = {}) {
  const tier = difficulty(key);
  const rng = opts.rng ?? Math.random;
  const owned = opts.owned ?? new Set();
  const attempts = opts.attempts ?? 40;

  for (let attempt = 0; attempt < attempts; attempt++) {
    /** @type {(string|null)[][]} */
    const cells = Array.from({ length: tier.size }, () => Array(tier.size).fill(null));
    /** @type {Placement[]} */
    const placed = [];
    for (const entry of pickTargets(tier.syllables, owned, rng)) {
      const spot = place(cells, entry.syl, rng);
      if (spot) placed.push(spot);
    }
    if (placed.length < TARGETS_PER_BOARD) continue;

    const filled = cells.map((row) =>
      row.map((cell) => cell ?? FILLER_POOL[Math.floor(rng() * FILLER_POOL.length)])
    );
    if (hasUnsafeRun(filled)) continue;
    return { difficulty: tier.key, size: tier.size, cells: filled, targets: placed };
  }

  // Unreachable in practice (40 attempts × a 200-word catalog), but a board is not optional:
  // fall back to the easiest tier's plain fill rather than handing the UI a null.
  const cells = Array.from({ length: tier.size }, (_, r) =>
    Array.from({ length: tier.size }, (_, c) => SYLLABLES[(r * tier.size + c) % SYLLABLES.length])
  );
  return { difficulty: tier.key, size: tier.size, cells, targets: [] };
}

/**
 * Weighted draw pool for empty cells: a syllable appears once per catalog word that uses
 * it, so common syllables (`ka`, `ta`, `ba`) land more often and the board looks like
 * Indonesian rather than alphabet soup — which also means idle swiping stumbles onto real
 * bonus words instead of noise. Every syllable is appended once more so none is impossible.
 * @type {string[]}
 */
export const FILLER_POOL = [
  ...WORD_CATALOG.flatMap((entry) => entry.syl),
  ...SYLLABLES
];
