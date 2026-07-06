import { describe, expect, it } from 'vitest';
import {
  makeQuestion,
  buildRound,
  buildLessonRound,
  buildExamRound,
  buildPlacementRound
} from './quiz.js';
import { getLevel, regularLessons, TILE_COUNT } from '$lib/content/levels.js';

/** @param {import('$lib/game/quiz.js').Question} q */
function sameLetterDistractors(q) {
  return q.tiles.filter((t) => t.id !== q.target.id && t.text[0] === q.target.text[0]);
}

describe('makeQuestion', () => {
  const syllables = getLevel(2).items();

  it('always includes a same-first-letter distractor when the pool has one', () => {
    // Randomized selection: run every syllable target multiple times.
    for (let run = 0; run < 20; run++) {
      for (const target of syllables) {
        const q = makeQuestion(target, syllables);
        expect(sameLetterDistractors(q).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('returns the right number of unique tiles including the target', () => {
    const target = syllables.find((i) => i.text === 'ba');
    for (const tiles of [3, 4, 5, 6]) {
      const q = makeQuestion(target, syllables, tiles);
      expect(q.tiles).toHaveLength(tiles);
      expect(q.tiles.filter((t) => t.id === target.id)).toHaveLength(1);
      expect(new Set(q.tiles.map((t) => t.id)).size).toBe(tiles);
    }
  });

  it('falls back gracefully when no same-letter sibling exists', () => {
    const pool = [
      { id: 'a', text: 'ba', display: 'ba' },
      { id: 'b', text: 'ci', display: 'ci' },
      { id: 'c', text: 'du', display: 'du' },
      { id: 'd', text: 'ko', display: 'ko' }
    ];
    for (let run = 0; run < 20; run++) {
      const q = makeQuestion(pool[0], pool);
      expect(q.tiles).toHaveLength(TILE_COUNT);
      expect(q.tiles.filter((t) => t.id === 'a')).toHaveLength(1);
    }
  });
});

describe('round builders (level 2 syllables)', () => {
  it('buildRound questions each offer a same-letter distractor', () => {
    for (const q of buildRound(2)) {
      expect(sameLetterDistractors(q).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('buildLessonRound questions each offer a same-letter distractor', () => {
    for (let lesson = 0; lesson < regularLessons(2).length; lesson++) {
      for (const q of buildLessonRound(2, lesson)) {
        expect(sameLetterDistractors(q).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('buildExamRound and buildPlacementRound questions each offer a same-letter distractor', () => {
    for (const q of [...buildExamRound(2), ...buildPlacementRound(2)]) {
      expect(sameLetterDistractors(q).length).toBeGreaterThanOrEqual(1);
    }
  });
});
