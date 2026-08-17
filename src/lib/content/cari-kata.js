/**
 * Board generator for Cari Kata (word search).
 *
 * Boards are grids of level-2 open syllables (CV). Every cell is one syllable,
 * so a "word" is a straight run of consecutive tiles. To keep the puzzle
 * findable by a toddler, words only run right (→) or down (↓) — never
 * backwards, diagonally, or across a turn.
 *
 * A board is generated with three guarantees (all unit-tested):
 *  1. Every cell is a valid level-2 open syllable it can actually place.
 *  2. Every target word from the catalog's album is placed, reachable by a
 *     single straight sweep.
 *  3. No run on the board spells a word from UNSAFE_WORDS (the safety pass).
 */
import { albumWords, catalogEntry, CATALOG_SYLLABLES, UNSAFE_WORDS } from './kata-catalog.js';
import { LEVELS } from './levels.js';

/** The 95 open (CV) syllables a board may place. */
export const KV_SYLLABLES = LEVELS[1].items().map((it) => it.text);

/**
 * Board spec per difficulty. `size` is the square grid edge; `counts` is the
 * set of syllable counts targets may have. Every board places exactly 3 target
 * words (Mudah 4×4 two-syllable, Sedang 5×5 two/three, Sulit 6×6 three/four).
 */
export const CARI_KATA_LEVELS = /** @type {Record<'mudah'|'sedang'|'sulit', { size: number, counts: number[], targets: number }>} */ ({
  mudah: { size: 4, counts: [2], targets: 3 },
  sedang: { size: 5, counts: [2, 3], targets: 3 },
  sulit: { size: 6, counts: [3, 4], targets: 3 }
});

/**
 * Deterministic PRNG (LCG). Same seed => same board, so a board can be restored.
 * @param {number} seed
 * @returns {() => number} uniform in [0, 1)
 */
export function seededRng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const idx = (/** @type {number} */ r, /** @type {number} */ c, /** @type {number} */ size) => r * size + c;

/**
 * Inclusive straight run between two cell indices — only forward runs are
 * legal (same row moving right, or same column moving down). Returns [] when
 * the pair is not a valid forward straight line.
 * @param {number} start cell index
 * @param {number} end cell index
 * @param {number} size grid edge
 * @returns {number[]}
 */
export function pathBetween(start, end, size) {
  const sr = Math.floor(start / size);
  const sc = start % size;
  const er = Math.floor(end / size);
  const ec = end % size;
  const out = [];
  if (sr === er && ec >= sc) {
    for (let c = sc; c <= ec; c++) out.push(idx(sr, c, size));
  } else if (sc === ec && er >= sr) {
    for (let r = sr; r <= er; r++) out.push(idx(r, sc, size));
  }
  return out;
}

/**
 * Every straight run of 2..size tiles, left-to-right and top-to-bottom only.
 * @param {((string|null)[])} grid
 * @param {number} size
 * @returns {number[][]}
 */
export function enumerateRuns(grid, size) {
  /** @type {number[][]} */
  const runs = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (let len = 2; c + len <= size; len++) {
        runs.push(Array.from({ length: len }, (_, i) => idx(r, c + i, size)));
      }
      for (let len = 2; r + len <= size; len++) {
        runs.push(Array.from({ length: len }, (_, i) => idx(r + i, c, size)));
      }
    }
  }
  return runs;
}

/** @returns {Set<string>} */
function blockedSet() {
  const blocked = new Set();
  for (const w of UNSAFE_WORDS) blocked.add(w);
  return blocked;
}

/**
 * All runs whose concatenated syllables spell a blocked word.
 * @param {(string|null)[]} grid
 * @param {number} size
 * @returns {string[]} the blocked words found
 */
export function blockedRuns(grid, size) {
  const blocked = blockedSet();
  return enumerateRuns(grid, size)
    .map((run) => run.map((i) => grid[i]).join(''))
    .filter((w) => blocked.has(w));
}

/** @param {number} size */
function emptyGrid(size) {
  return /** @type {(string|null)[]} */ (Array(size * size).fill(null));
}

/**
 * Try to slot `entry` into `grid` at a random start, running right or down.
 * Returns a new grid + path on success, or null (no backtracking on failure).
 * @param {(string|null)[]} grid
 * @param {import('./kata-catalog.js').CatalogWord} entry
 * @param {number} size
 * @param {() => number} rng
 */
function tryPlace(grid, entry, size, rng) {
  const cells = grid.slice();
  const horizontal = rng() < 0.5;
  const startR = Math.floor(rng() * size);
  const startC = Math.floor(rng() * size);

  // Must fit inside the grid edge (a too-wide slot would alias into the next row).
  if (horizontal && startC + entry.syl.length > size) return null;
  if (!horizontal && startR + entry.syl.length > size) return null;

  const fits = entry.syl.every((s, i) => {
    const cell = horizontal ? idx(startR, startC + i, size) : idx(startR + i, startC, size);
    return cells[cell] === null || cells[cell] === s;
  });
  if (!fits) return null;

  entry.syl.forEach((s, i) => {
    const cell = horizontal ? idx(startR, startC + i, size) : idx(startR + i, startC, size);
    cells[cell] = s;
  });
  const last = horizontal
    ? idx(startR, startC + entry.syl.length - 1, size)
    : idx(startR + entry.syl.length - 1, startC, size);
  return { cells, path: [idx(startR, startC, size), last] };
}

/**
 * Pick `n` album targets with a syllable count in `counts`, biasing toward
 * words the player has not collected yet.
 * @param {string[]} collected words already found
 * @param {number[]} counts allowed syllable counts
 * @param {() => number} rng
 * @param {number} n how many targets
 */
export function pickTargets(collected, counts, rng, n) {
  const owned = new Set(collected || []);
  const pool = albumWords().filter((e) => counts.includes(e.syl.length));
  const fresh = pool.filter((e) => !owned.has(e.w));
  const shuffled = shuffle(fresh.length ? fresh : pool, rng);
  return shuffled.slice(0, n);
}

/**
 * Fisher-Yates shuffle (deterministic when `rng` is).
 * @template T
 * @param {T[]} items
 * @param {() => number} rng
 * @returns {T[]}
 */
function shuffle(items, rng) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pool for filler cells: catalog syllables twice, so bonus finds are likely. */
const FILL_POOL = () => [...CATALOG_SYLLABLES, ...KV_SYLLABLES];

/**
 * Attempt a single board build. Returns the completed grid or null (blocked).
 * @param {number} size
 * @param {import('./kata-catalog.js').CatalogWord[]} targets
 * @param {() => number} rng
 */
function tryBuild(size, targets, rng) {
  let grid = emptyGrid(size);
  const placed = [];
  for (const entry of targets) {
    const res = tryPlace(grid, entry, size, rng);
    if (!res) return null;
    grid = res.cells;
    placed.push({ entry, path: res.path });
  }
  const pool = FILL_POOL();
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === null) grid[i] = pool[Math.floor(rng() * pool.length)];
  }
  if (blockedRuns(grid, size).length > 0) return null;
  return { grid: /** @type {string[]} */ (grid), placed };
}

/**
 * A fully-filled, deterministic, safe board.
 *
 * `level` is `'mudah' | 'sedang' | 'sulit'`. `options.seed` makes the board
 * reproducible; `options.collected` are words already found (targets prefer
 * new words). Falls back to a hand-built safe layout only after many attempts.
 *
 * @param {keyof typeof CARI_KATA_LEVELS} level
 * @param {{ seed?: number, collected?: string[], maxAttempts?: number }} [options]
 * @returns {{ size: number, seed: number, grid: string[], targets: { w: string, syl: string[], e?: string, photo?: boolean, path: number[] }[] }}
 */
export function generateBoard(level, { seed = Math.floor(Math.random() * 0xffffffff), collected = [], maxAttempts = 80 } = {}) {
  const spec = CARI_KATA_LEVELS[level];
  if (!spec) throw new Error(`Unknown Cari Kata level: ${level}`);

  const rng = seededRng(seed);
  const targets = pickTargets(collected, spec.counts, rng, spec.targets);
  if (targets.length < spec.targets) {
    throw new Error(`Not enough album targets for ${level} (need ${spec.targets})`);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const built = tryBuild(spec.size, targets, rng);
    if (built) {
      return {
        size: spec.size,
        seed,
        grid: built.grid,
        targets: built.placed.map(({ entry, path }) => ({
          w: entry.w,
          syl: entry.syl,
          e: entry.e,
          photo: entry.photo,
          path
        }))
      };
    }
  }

  return fallbackBoard(spec, targets, seed);
}

/**
 * Deterministic safe layout: each target on its own row, filler = bounded by a
 * fill that never repeats (each filler cell is placed so no blocked word can
 * form between adjacent rows/cols — verified, and rare in practice).
 */
/**
 * Deterministic safe layout: each target on its own row, filler cells all 'zo'
 * (never part of a catalog word, so no blocked run can form).
 * @param {{ size: number, counts: number[], targets: number }} spec
 * @param {import('./kata-catalog.js').CatalogWord[]} targets
 * @param {number} seed
 */
function fallbackBoard(spec, targets, seed) {
  const size = spec.size;
  const grid = /** @type {string[]} */ (Array(size * size).fill('zo'));
  /** @type {{ entry: import('./kata-catalog.js').CatalogWord, path: number[] }[]} */
  const placed = [];

  // Place targets on distinct rows, left-aligned, in order.
  const perRow = targets.slice(0, Math.min(targets.length, size));
  perRow.forEach((entry, r) => {
    entry.syl.forEach((s, i) => {
      grid[idx(r, i, size)] = s;
    });
    placed.push({ entry, path: [idx(r, 0, size), idx(r, entry.syl.length - 1, size)] });
  });

  const blocked = blockedRuns(grid, size);
  if (blocked.length > 0) {
    throw new Error(`Could not find a safe Cari Kata board for ${spec} (blocked: ${blocked.join(', ')})`);
  }

  return {
    size,
    seed,
    grid,
    targets: placed.map(({ entry, path }) => ({
      w: entry.w,
      syl: entry.syl,
      e: entry.e,
      photo: entry.photo,
      path
    }))
  };
}

/**
 * The word a selection path spells, plus its catalog entry (if any).
 * @param {string[]} grid
 * @param {number[]} path
 * @returns {{ w: string, entry: import('./kata-catalog.js').CatalogWord|undefined }}
 */
export function wordAtPath(grid, path) {
  const w = path.map((i) => grid[i]).join('');
  return { w, entry: catalogEntry(w) };
}