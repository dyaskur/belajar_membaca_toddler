import {
  KV_SYLLABLES,
  UNSAFE_WORDS,
  albumWords,
  catalogEntry
} from './kata-catalog.js';

/** @typedef {'mudah'|'sedang'|'sulit'} CariKataLevel */

export const CARI_KATA_LEVELS = /** @type {Record<CariKataLevel, { key: CariKataLevel, label: string, hint: string, icon: string, size: number, counts: number[], color: string }>} */ ({
  mudah: { key: 'mudah', label: 'Mudah', hint: 'Santai', icon: '🌱', size: 4, counts: [2], color: '#10b981' },
  sedang: { key: 'sedang', label: 'Sedang', hint: 'Menantang', icon: '⚡', size: 5, counts: [2, 3], color: '#f59e0b' },
  sulit: { key: 'sulit', label: 'Sulit', hint: 'Hebat!', icon: '🔥', size: 6, counts: [3, 4], color: '#8b5cf6' }
});

/**
 * Pick one round reward, preferring a sticker the profile does not own yet.
 * @param {import('./kata-catalog.js').CatalogWord[]} entries
 * @param {string[]} collected
 * @param {() => number} [rng]
 */
export function pickStickerReward(entries, collected, rng = Math.random) {
  const owned = new Set(collected);
  const fresh = entries.filter((entry) => !owned.has(entry.w));
  const pool = fresh.length ? fresh : entries;
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

/** @param {number|string} seed */
export function seededRng(seed) {
  let state = typeof seed === 'number'
    ? seed >>> 0
    : [...String(seed)].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @template T @param {T[]} items @param {() => number} rng */
function shuffled(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A legal selection is straight and forward: left-to-right or top-to-bottom.
 * @param {number} start @param {number} end @param {number} size
 */
export function pathBetween(start, end, size) {
  if (start < 0 || end < 0 || start >= size * size || end >= size * size) return [];
  const sr = Math.floor(start / size);
  const sc = start % size;
  const er = Math.floor(end / size);
  const ec = end % size;
  if (sr === er && ec >= sc) return Array.from({ length: ec - sc + 1 }, (_, i) => start + i);
  if (sc === ec && er >= sr) return Array.from({ length: er - sr + 1 }, (_, i) => start + i * size);
  return [];
}

/** Enumerate every forward straight run of 2–4 cells. @param {string[]} cells @param {number} size */
export function enumerateRuns(cells, size) {
  const runs = [];
  for (let start = 0; start < cells.length; start++) {
    const row = Math.floor(start / size);
    const col = start % size;
    for (const step of [1, size]) {
      for (let length = 2; length <= 4; length++) {
        const end = start + step * (length - 1);
        if (end >= cells.length) continue;
        if (step === 1 && col + length > size) continue;
        if (step === size && row + length > size) continue;
        const path = Array.from({ length }, (_, i) => start + i * step);
        runs.push({ path, word: path.map((index) => cells[index]).join('') });
      }
    }
  }
  return runs;
}

/** @param {string[]} cells @param {number} size */
export function blockedRuns(cells, size) {
  const blocked = new Set(UNSAFE_WORDS);
  return enumerateRuns(cells, size).filter((run) => blocked.has(run.word));
}

/** @param {(string|null)[]} cells @param {string[]} syl @param {number[]} path */
function fits(cells, syl, path) {
  return path.every((index, i) => cells[index] === null || cells[index] === syl[i]);
}

/** @param {(string|null)[]} cells @param {import('./kata-catalog.js').CatalogWord} entry @param {number} size @param {() => number} rng */
function place(cells, entry, size, rng) {
  const choices = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (col + entry.syl.length <= size) {
        choices.push(Array.from({ length: entry.syl.length }, (_, i) => row * size + col + i));
      }
      if (row + entry.syl.length <= size) {
        choices.push(Array.from({ length: entry.syl.length }, (_, i) => (row + i) * size + col));
      }
    }
  }
  for (const path of shuffled(choices, rng)) {
    if (!fits(cells, entry.syl, path)) continue;
    path.forEach((index, i) => (cells[index] = entry.syl[i]));
    return path;
  }
  return null;
}

/** @param {string[]} collected @param {number[]} counts @param {() => number} rng */
function pickTargets(collected, counts, rng) {
  const owned = new Set(collected);
  const pool = albumWords().filter((entry) => counts.includes(entry.syl.length));
  const fresh = shuffled(pool.filter((entry) => !owned.has(entry.w)), rng);
  const fallback = shuffled(pool.filter((entry) => owned.has(entry.w)), rng);
  return [...fresh, ...fallback].slice(0, 3);
}

const COMMON_FILL = [
  ...new Set(
    /** @type {string[]} */ (
      albumWords().flatMap((entry) => entry.syl)
    )
  )
];

/**
 * @typedef {{ entry: import('./kata-catalog.js').CatalogWord, path: number[] }} BoardTarget
 * @typedef {{ level: keyof typeof CARI_KATA_LEVELS, size: number, cells: string[], targets: BoardTarget[], seed: number|string }} CariKataBoard
 */

/**
 * Generate a deterministic, solvable board. Unknown accidental catalog runs are
 * intentional bonus discoveries; unsafe runs are always rejected.
 * @param {keyof typeof CARI_KATA_LEVELS} level
 * @param {{ seed?: number|string, collected?: string[], maxAttempts?: number }} [options]
 * @returns {CariKataBoard}
 */
export function generateBoard(level, options = {}) {
  const config = CARI_KATA_LEVELS[level] ?? CARI_KATA_LEVELS.mudah;
  const seed = options.seed ?? Date.now();
  const rng = seededRng(seed);
  const targets = pickTargets(options.collected ?? [], config.counts, rng);
  if (targets.length < 3) throw new Error(`Not enough album words for ${config.key}`);

  for (let attempt = 0; attempt < (options.maxAttempts ?? 80); attempt++) {
    const cells = Array(config.size * config.size).fill(null);
    const placed = [];
    let failed = false;
    for (const entry of shuffled(targets, rng)) {
      const path = place(cells, entry, config.size, rng);
      if (!path) {
        failed = true;
        break;
      }
      placed.push({ entry, path });
    }
    if (failed) continue;
    const fill = [...COMMON_FILL, ...KV_SYLLABLES];
    for (let i = 0; i < cells.length; i++) cells[i] ??= fill[Math.floor(rng() * fill.length)];
    const ready = /** @type {string[]} */ (cells);
    if (blockedRuns(ready, config.size).length === 0) {
      return { level: config.key, size: config.size, cells: ready, targets: placed, seed };
    }
  }

  // Known-safe fallback: targets occupy separate rows and "zo" fills every
  // other cell. This remains solvable even if a future catalog change makes
  // randomized placement unusually constrained.
  const cells = Array(config.size * config.size).fill('zo');
  const placed = targets.map((entry, row) => {
    const path = Array.from({ length: entry.syl.length }, (_, i) => row * config.size + i);
    path.forEach((index, i) => (cells[index] = entry.syl[i]));
    return { entry, path };
  });
  if (blockedRuns(cells, config.size).length) throw new Error('Known-safe fallback formed a blocked word');
  return { level: config.key, size: config.size, cells, targets: placed, seed };
}

/** Return catalog metadata for a selected path, when it forms a real word. @param {string[]} cells @param {number[]} path */
export function wordAtPath(cells, path) {
  const w = path.map((index) => cells[index]).join('');
  return { w, entry: catalogEntry(w) };
}
