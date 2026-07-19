import { describe, expect, it } from 'vitest';
import { lessonsForLevel } from './levels.js';
import { profileLevelComplete } from './progress.js';

describe('profileLevelComplete', () => {
  it('uses the final-exam score for course-mode profiles', () => {
    const exam = lessonsForLevel(3).find((lesson) => lesson.exam);
    if (!exam) throw new Error('expected pack 3 exam');
    const profile = {
      bestScore: { 3: 1 },
      lessonScore: { 3: { 0: 1, [exam.index]: 0.8 } }
    };
    expect(profileLevelComplete(profile, 3)).toBe(true);
  });

  it('does not mistake a passed regular lesson for level completion', () => {
    const profile = { bestScore: { 3: 1 }, lessonScore: { 3: { 0: 1 } } };
    expect(profileLevelComplete(profile, 3)).toBe(false);
  });

  it('preserves completion for legacy flat-level profiles', () => {
    expect(profileLevelComplete({ bestScore: { 2: 0.9 } }, 2)).toBe(true);
  });
});
