import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VOICES } from './voices.js';
import { variantStem } from '../audio/slug.js';
import {
  BONUS_POOL,
  LESSON_STICKER,
  STICKERS,
  STICKER_PAGES,
  STICKER_TOTAL,
  TROPHIES,
  getSticker,
  stickerAudioBucket
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

  it('gives every non-trophy sticker spoken audio', () => {
    expect(STICKERS.filter((sticker) => !sticker.rare && !sticker.talks)).toEqual([]);
  });

  it('ships a normal-speed clip for every talking sticker in every voice', () => {
    const packs = new Map();
    for (const voice of VOICES) {
      for (const sticker of STICKERS.filter((item) => item.talks)) {
        const bucket = stickerAudioBucket(sticker);
        const packPath = join('static', 'audio', voice.id, String(bucket), 'pack.json');
        let files = packs.get(packPath);
        if (!files) {
          files = new Set(JSON.parse(readFileSync(packPath, 'utf8')).files);
          packs.set(packPath, files);
        }
        const stem = variantStem(sticker.id, 0);
        expect(files.has(stem), `${voice.id}/${bucket}/${sticker.id} missing from pack`).toBe(true);
        expect(
          existsSync(join('static', 'audio', voice.id, String(bucket), `${stem}.mp3`)),
          `${voice.id}/${bucket}/${sticker.id} clip missing`
        ).toBe(true);
      }
    }
  });
});
