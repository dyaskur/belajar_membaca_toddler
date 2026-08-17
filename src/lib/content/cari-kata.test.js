import { describe, expect, it } from 'vitest';
import {
  DIFFICULTIES,
  DIRECTIONS,
  FILLER_POOL,
  TARGETS_PER_BOARD,
  allRuns,
  cariKataTexts,
  difficulty,
  hasUnsafeRun,
  makeBoard,
  makeRng,
  readSelection
} from './cari-kata.js';
import { UNSAFE_WORDS, albumWordsBySyllableCount, isKnownSyllable } from './kata-catalog.js';

/**
 * Read the syllables a placement covers straight off the grid.
 * @param {import('./cari-kata.js').Board} board
 * @param {import('./cari-kata.js').Placement} placement
 */
function readPlacement(board, placement) {
  return placement.syl.map(
    (_, i) => board.cells[placement.row + placement.dr * i][placement.col + placement.dc * i]
  );
}

describe('difficulty tiers', () => {
  it('grows the board and the word length together', () => {
    expect(DIFFICULTIES.map((tier) => tier.size)).toEqual([4, 5, 6]);
    expect(difficulty('sulit').syllables).toEqual([3, 4]);
    expect(difficulty('tidak-ada').key).toBe('mudah');
  });

  it('has enough targetable words for every tier', () => {
    for (const tier of DIFFICULTIES) {
      const pool = tier.syllables.flatMap((n) => albumWordsBySyllableCount(n));
      expect(pool.length).toBeGreaterThanOrEqual(TARGETS_PER_BOARD);
    }
  });

  it('never lets a word be longer than the grid', () => {
    for (const tier of DIFFICULTIES) {
      expect(Math.max(...tier.syllables)).toBeLessThanOrEqual(tier.size);
    }
  });
});

describe('selection rules', () => {
  it('only runs left-to-right and top-to-bottom', () => {
    expect(DIRECTIONS).toEqual([{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }]);
  });

  it('classifies what the child swiped', () => {
    expect(readSelection(['ku', 'da'], ['kuda']).kind).toBe('target');
    expect(readSelection(['ku', 'da'], ['bola']).kind).toBe('bonus');
    expect(readSelection(['ka', 'lu', 'pi']).kind).toBe('nonsense');
    expect(readSelection(['ba', 'bi']).kind).toBe('blocked');
  });

  it('hands back the catalog entry for real words so a card can be shown', () => {
    expect(readSelection(['ke', 'la', 'pa'], ['kelapa']).entry?.syl).toEqual(['ke', 'la', 'pa']);
    expect(readSelection(['ka', 'lu', 'pi']).entry).toBeUndefined();
  });
});

describe('board generation', () => {
  const tiers = DIFFICULTIES.map((tier) => tier.key);

  it('is reproducible from a seed', () => {
    expect(makeBoard('sedang', { rng: makeRng(7) })).toEqual(makeBoard('sedang', { rng: makeRng(7) }));
  });

  it('always hides three findable targets', () => {
    for (const tier of tiers) {
      for (let seed = 0; seed < 30; seed++) {
        const board = makeBoard(tier, { rng: makeRng(seed) });
        expect(board.targets).toHaveLength(TARGETS_PER_BOARD);
        for (const placement of board.targets) {
          // The word must actually be readable off the grid at the recorded position.
          expect(readPlacement(board, placement).join('')).toBe(placement.word);
          const { dr, dc } = placement;
          expect(DIRECTIONS).toContainEqual({ dr, dc });
        }
      }
    }
  });

  it('fills every cell with a speakable syllable', () => {
    for (const tier of tiers) {
      const board = makeBoard(tier, { rng: makeRng(3) });
      expect(board.cells).toHaveLength(board.size);
      for (const row of board.cells) {
        expect(row).toHaveLength(board.size);
        for (const cell of row) expect(isKnownSyllable(cell)).toBe(true);
      }
    }
  });

  it('never spells a blocked word in any direction', () => {
    for (const tier of tiers) {
      for (let seed = 0; seed < 60; seed++) {
        expect(hasUnsafeRun(makeBoard(tier, { rng: makeRng(seed) }).cells)).toBe(false);
      }
    }
  });

  it('prefers words the child has not collected yet', () => {
    const owned = new Set(albumWordsBySyllableCount(2).slice(0, 10).map((entry) => entry.w));
    const seen = new Set();
    for (let seed = 0; seed < 20; seed++) {
      for (const placement of makeBoard('mudah', { owned, rng: makeRng(seed) }).targets) {
        seen.add(placement.word);
      }
    }
    // With plenty of uncollected words left, the collected ones should not be drawn at all.
    expect([...seen].filter((word) => owned.has(word))).toEqual([]);
  });

  it('picks three distinct targets', () => {
    for (let seed = 0; seed < 20; seed++) {
      const words = makeBoard('sedang', { rng: makeRng(seed) }).targets.map((t) => t.word);
      expect(new Set(words).size).toBe(words.length);
    }
  });
});

describe('run enumeration', () => {
  it('collects every straight 2–4 cell run in both directions', () => {
    const cells = [
      ['ku', 'da'],
      ['ta', 'ri']
    ];
    const runs = allRuns(cells).map((run) => run.join(''));
    expect(runs).toContain('kuda');
    expect(runs).toContain('tari');
    expect(runs).toContain('kuta'); // vertical
    expect(runs).toContain('dari'); // vertical
    expect(runs).not.toContain('adu'); // no reversals
    expect(runs.every((run) => run.length >= 4)).toBe(true); // 2 syllables = 4 chars minimum
  });

  it('catches a blocked word planted in a grid', () => {
    expect(hasUnsafeRun([['ba', 'bi'], ['ta', 'ri']])).toBe(true);
    expect(hasUnsafeRun([['ku', 'da'], ['ta', 'ri']])).toBe(false);
  });
});

describe('filler pool', () => {
  it('weights syllables the catalog actually uses, without excluding any', () => {
    const counts = new Map();
    for (const syl of FILLER_POOL) counts.set(syl, (counts.get(syl) ?? 0) + 1);
    expect(FILLER_POOL.every(isKnownSyllable)).toBe(true);
    expect(counts.size).toBe(95);
    expect(counts.get('ka')).toBeGreaterThan(counts.get('zo'));
  });
});

describe('spoken copy', () => {
  it('exports every line the audio bucket must contain, with no blanks or duplicates', () => {
    const texts = cariKataTexts();
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts.every((text) => text.trim().length > 0)).toBe(true);
    expect(texts.some((text) => UNSAFE_WORDS.includes(text.toLowerCase()))).toBe(false);
  });
});
