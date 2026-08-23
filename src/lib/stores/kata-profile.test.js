import { describe, expect, it } from 'vitest';
import {
  addKataWordToProfile,
  incrementKataBonus,
  markKataWordSeenOnProfile,
  normalizeKataProfile,
  setKataLevel
} from './kata-profile.js';

describe('Cari Kata profile state', () => {
  it('silently migrates legacy profiles', () => {
    expect(normalizeKataProfile({ id: 'lama' })).toMatchObject({
      kataWords: [], kataWordsSeen: [], kataBonusCount: 0, cariKataLevel: 'mudah'
    });
  });

  it('mutates only the selected profile object and keeps discoveries unique', () => {
    const first = normalizeKataProfile({ id: 'satu' });
    const second = normalizeKataProfile({ id: 'dua' });
    expect(addKataWordToProfile(first, 'kuda')).toBe(true);
    expect(addKataWordToProfile(first, 'kuda')).toBe(false);
    expect(markKataWordSeenOnProfile(first, 'kuda')).toBe(true);
    incrementKataBonus(first);
    expect(setKataLevel(first, 'sulit')).toBe(true);

    expect(second).toMatchObject({ kataWords: [], kataWordsSeen: [], kataBonusCount: 0, cariKataLevel: 'mudah' });
    expect(first).toMatchObject({ kataWords: ['kuda'], kataWordsSeen: ['kuda'], kataBonusCount: 1, cariKataLevel: 'sulit' });
  });
});
