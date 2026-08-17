import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels.js';
import { CARI_KATA_LEVELS, generateBoard, seededRng, blockedRuns, enumerateRuns, wordAtPath } from './cari-kata.js';
import { UNSAFE_WORDS } from './kata-catalog.js';

/** The 95 open (CV) syllables a board may place. */
const OPEN = new Set(LEVELS[1].items().map((it) => it.text));
const SIZES = { mudah: 4, sedang: 5, sulit: 6 };
const LEVEL_IDS = /** @type {('mudah'|'sedang'|'sulit')[]} */ (Object.keys(CARI_KATA_LEVELS));

describe('cari-kata board generator', () => {
  it('defines a level for every difficulty', () => {
    expect(LEVEL_IDS).toEqual(['mudah', 'sedang', 'sulit']);
    for (const level of LEVEL_IDS) {
      const spec = CARI_KATA_LEVELS[level];
      expect(spec.size).toBe(SIZES[level]);
      expect(spec.targets).toBeGreaterThan(0);
      expect(spec.size * spec.size).toBeGreaterThan(spec.targets);
    }
  });

  it('generates boards from valid level-2 open syllables only', () => {
    for (const level of LEVEL_IDS) {
      const { grid } = generateBoard(level, { seed: 7 });
      expect(grid).toHaveLength(CARI_KATA_LEVELS[level].size ** 2);
      for (const cell of grid) {
        expect(OPEN.has(cell), `board has non-placeable cell "${cell}"`).toBe(true);
      }
    }
  });

  it('places every target as a straight right/down run that spells the word', () => {
    for (const level of LEVEL_IDS) {
      const { grid, targets, size } = generateBoard(level, { seed: 42 });
      for (const t of targets) {
        const [s, e] = t.path;
        const run = pathCells(s, e, size);
        expect(run).toHaveLength(t.syl.length);
        expect(run.map((i) => grid[i]).join('')).toBe(t.w);
        expect(t.syl.join('')).toBe(t.w);
      }
    }
  });

  it('never lets a run spell a blocked word', () => {
    const seeds = [...Array(120).keys()];
    for (const level of LEVEL_IDS) {
      for (const seed of seeds) {
        const { grid, size } = generateBoard(level, { seed });
        const blocked = blockedRuns(grid, size);
        for (const w of blocked) {
          expect(UNSAFE_WORDS, `${w} spelled on a ${level} board (seed ${seed})`).not.toContain(w);
        }
      }
    }
  });

  it('is deterministic for a given seed', () => {
    for (const level of LEVEL_IDS) {
      const a = generateBoard(level, { seed: 99 });
      const b = generateBoard(level, { seed: 99 });
      expect(b.grid).toEqual(a.grid);
      expect(b.targets.map((t) => t.w)).toEqual(a.targets.map((t) => t.w));
    }
  });

  it('prefers word targets the player has not collected yet', () => {
    const { targets } = generateBoard('mudah', { seed: 5, collected: ['buku', 'batu'] });
    for (const t of targets) {
      expect(['buku', 'batu']).not.toContain(t.w);
    }
  });

  it('judges selections through wordAtPath', () => {
    const { grid, targets, size } = generateBoard('mudah', { seed: 11 });
    const t = targets[0];
    const { w, entry } = wordAtPath(grid, t.path);
    expect(w).toBe(t.w);
    expect(entry?.w).toBe(t.w);
  });

  it('enumerates all right/down runs of length 2+', () => {
    const runs = enumerateRuns(Array(16).fill('ba'), 4);
    const horizontal = 4 * (3 + 2 + 1); // 4 rows x 6 length-2+ runs
    const vertical = (3 + 2 + 1) * 4; // 4 cols x 6 runs -- symmetrical on square
    expect(runs.length).toBe(horizontal + vertical);
    for (const run of runs) {
      expect(run).toHaveLength(run.length >= 2 ? run.length : 0);
    }
  });

  it('seededRng is deterministic and bounded', () => {
    const a = seededRng(1234);
    const b = seededRng(1234);
    const valsA = [a(), a(), a()];
    const valsB = [b(), b(), b()];
    expect(valsA).toEqual(valsB);
    for (const v of valsA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

/** Inclusive straight path between two cell indices (right or down only). */
function pathCells(/** @type {number} */ start, /** @type {number} */ end, /** @type {number} */ size) {
  const sr = Math.floor(start / size);
  const sc = start % size;
  const er = Math.floor(end / size);
  const ec = end % size;
  const out = [];
  if (sr === er) {
    for (let c = sc; c <= ec; c++) out.push(sr * size + c);
  } else if (sc === ec) {
    for (let r = sr; r <= er; r++) out.push(r * size + sc);
  }
  return out;
}