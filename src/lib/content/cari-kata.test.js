import { describe, expect, it } from 'vitest';
import {
  CARI_KATA_LEVELS,
  blockedRuns,
  enumerateRuns,
  generateBoard,
  pathBetween,
  pickStickerReward,
  wordAtPath
} from './cari-kata.js';
import {
  KATA_CATALOG,
  KV_SYLLABLES,
  UNSAFE_WORDS,
  albumWords,
  catalogEntry,
  isRealWord,
  themeSections,
  wordsBySyllableCount
} from './kata-catalog.js';

describe('kata catalog', () => {
  it('has explicit, unique, level-2-compatible entries', () => {
    const syllables = new Set(KV_SYLLABLES);
    const words = KATA_CATALOG.map((entry) => entry.w);
    expect(new Set(words).size).toBe(words.length);
    expect(KATA_CATALOG.length).toBeGreaterThanOrEqual(300);
    for (const entry of KATA_CATALOG) {
      expect(entry.syl.join('')).toBe(entry.w);
      expect(entry.syl.every((syl) => syllables.has(syl))).toBe(true);
      expect(UNSAFE_WORDS).not.toContain(entry.w);
    }
  });

  it('keeps every album slot renderable and helpers consistent', () => {
    for (const entry of albumWords()) {
      expect(Boolean(entry.e || (entry.photo && entry.img && entry.sil))).toBe(true);
      if (entry.photo) {
        expect(entry.img).toMatch(/^\/kata\//);
        expect(entry.sil).toMatch(/^\/kata\/sil\//);
        expect(entry.img).not.toMatch(/^\/stickers\//);
      }
    }
    expect(catalogEntry('bola')).toMatchObject({ e: '⚽' });
    expect(catalogEntry('bola')?.photo).toBeUndefined();
    expect(isRealWord('kuda')).toBe(true);
    expect(catalogEntry('bukan-kata')).toBeNull();
    expect(wordsBySyllableCount(4).map((entry) => entry.w)).toContain('matahari');
    expect(themeSections().flatMap((section) => section.words)).toHaveLength(albumWords().length);
  });
});

describe('cari kata board generation', () => {
  for (const level of Object.keys(CARI_KATA_LEVELS)) {
    it(`builds safe, solvable ${level} boards`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const board = generateBoard(/** @type {keyof typeof CARI_KATA_LEVELS} */ (level), { seed });
        expect(board.cells).toHaveLength(board.size * board.size);
        expect(board.targets).toHaveLength(3);
        expect(blockedRuns(board.cells, board.size)).toEqual([]);
        for (const target of board.targets) {
          expect(wordAtPath(board.cells, target.path).w).toBe(target.entry.w);
          expect(target.path).toEqual(pathBetween(target.path[0], target.path[target.path.length - 1], board.size));
        }
      }
    });
  }

  it('prefers uncollected targets without making collected-only profiles fail', () => {
    const eligible = albumWords().filter((entry) => entry.syl.length === 2);
    const board = generateBoard('mudah', { seed: 9, collected: eligible.slice(0, -3).map((entry) => entry.w) });
    expect(board.targets.every((target) => !eligible.slice(0, -3).includes(target.entry))).toBe(true);
    expect(generateBoard('mudah', { seed: 9, collected: eligible.map((entry) => entry.w) }).targets).toHaveLength(3);
  });

  it('awards one random sticker and avoids a duplicate when a fresh target exists', () => {
    const entries = albumWords().slice(0, 3);
    expect(pickStickerReward(entries, [entries[0].w, entries[1].w], () => 0)).toBe(entries[2]);
    expect(pickStickerReward(entries, entries.map((entry) => entry.w), () => 0.99)).toBe(entries[2]);
    expect(pickStickerReward([], [], () => 0)).toBeNull();
  });

  it('accepts only straight forward paths and enumerates safety runs', () => {
    expect(pathBetween(1, 3, 4)).toEqual([1, 2, 3]);
    expect(pathBetween(1, 9, 4)).toEqual([1, 5, 9]);
    expect(pathBetween(3, 1, 4)).toEqual([]);
    expect(pathBetween(1, 6, 4)).toEqual([]);
    expect(enumerateRuns(Array(16).fill('ba'), 4)).toHaveLength(48);
  });
});
