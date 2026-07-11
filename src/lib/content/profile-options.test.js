import { describe, expect, it } from 'vitest';
import { profileOptionsForAge } from './profile-options.js';

describe('profileOptionsForAge', () => {
  it('starts 6+ profiles at level 2', () => {
    expect(profileOptionsForAge('6')).toMatchObject({
      ageBand: '6',
      quizTileCount: 6,
      unlockedLevel: 2
    });
  });

  it('keeps younger profiles at level 1', () => {
    expect(profileOptionsForAge('<=4')).toMatchObject({ unlockedLevel: 1 });
    expect(profileOptionsForAge('5')).toMatchObject({ unlockedLevel: 1 });
  });
});
