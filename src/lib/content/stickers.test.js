import { describe, expect, it } from 'vitest';
import {
  BONUS_POOL,
  LESSON_STICKER,
  STICKERS,
  STICKER_PAGES,
  STICKER_TOTAL,
  TROPHIES,
  getSticker
} from './stickers.js';

describe('sticker catalogue', () => {
  it('contains the complete 80-photo collection without duplicate ids', () => {
    expect(STICKER_TOTAL).toBe(80);
    expect(STICKERS).toHaveLength(80);
    expect(new Set(STICKERS.map((sticker) => sticker.id)).size).toBe(80);
    expect(STICKER_PAGES.flatMap((page) => page.stickers)).toHaveLength(59);
    expect(BONUS_POOL).toHaveLength(13);
    expect(TROPHIES).toHaveLength(8);
  });

  it('maps every regular lesson to a catalogue sticker with stable keys', () => {
    expect(Object.keys(LESSON_STICKER)).toHaveLength(59);
    for (const [key, id] of Object.entries(LESSON_STICKER)) {
      expect(key).toMatch(/^\d+-\d+$/);
      expect(getSticker(id)?.id).toBe(id);
    }
  });

  it('keeps every 2a reward tied to its lesson consonant', () => {
    const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'y', 'z'];
    consonants.forEach((consonant, index) => {
      expect(LESSON_STICKER[`2-${index}`].startsWith(consonant)).toBe(true);
    });
  });

  it('marks only trophies as rare and gives every sticker both asset paths', () => {
    for (const sticker of STICKERS) {
      expect(sticker.img).toBe(`/stickers/${sticker.id}.webp`);
      expect(sticker.sil).toBe(`/stickers/sil/${sticker.id}.webp`);
      expect(sticker.rare).toBe(sticker.id.startsWith('trofi-'));
    }
  });
});
