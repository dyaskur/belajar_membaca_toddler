import { describe, expect, it } from 'vitest';
import {
  SYLLABLES,
  THEMES,
  UNSAFE_WORDS,
  WORD_CATALOG,
  PHOTO_WORDS,
  albumThemes,
  albumWords,
  albumWordsBySyllableCount,
  albumWordsForTheme,
  catalogEntry,
  hasPicture,
  isKnownSyllable,
  isRealWord,
  isUnsafeWord,
  syllableLabel,
  wordsBySyllableCount
} from './kata-catalog.js';

describe('syllable inventory', () => {
  it('is exactly the 95 open syllables that have level-2 clips', () => {
    expect(SYLLABLES).toHaveLength(95);
    expect(new Set(SYLLABLES).size).toBe(95);
    expect(SYLLABLES.every((s) => /^[bcdfghjklmnpqrstvwxyz][aeiou]$/.test(s))).toBe(true);
    // q and x have no clips, so they must not be in the inventory.
    expect(SYLLABLES.some((s) => s.startsWith('q') || s.startsWith('x'))).toBe(false);
    expect(isKnownSyllable('ba')).toBe(true);
    expect(isKnownSyllable('bun')).toBe(false);
    expect(isKnownSyllable('nga')).toBe(false);
  });
});

describe('catalog integrity', () => {
  it('splits every word into syllables that can actually be spoken', () => {
    const bad = WORD_CATALOG.filter((entry) => entry.syl.some((s) => !isKnownSyllable(s)));
    expect(bad.map((entry) => `${entry.w} (${entry.syl.join('-')})`)).toEqual([]);
  });

  it('keeps each breakdown consistent with its word', () => {
    for (const entry of WORD_CATALOG) {
      expect(entry.syl.join('')).toBe(entry.w);
      expect(entry.syl.length).toBeGreaterThanOrEqual(2);
      expect(entry.syl.length).toBeLessThanOrEqual(4);
    }
  });

  it('has no duplicate spellings', () => {
    const seen = new Map();
    const dupes = [];
    for (const entry of WORD_CATALOG) {
      if (seen.has(entry.w)) dupes.push(`${entry.w} (${seen.get(entry.w)} + ${entry.theme})`);
      seen.set(entry.w, entry.theme);
    }
    expect(dupes).toEqual([]);
  });

  it('never collects a blocked word', () => {
    expect(WORD_CATALOG.filter((entry) => isUnsafeWord(entry.w))).toEqual([]);
    expect(new Set(UNSAFE_WORDS).size).toBe(UNSAFE_WORDS.length);
  });

  it('assigns every word to a declared theme', () => {
    const keys = new Set(THEMES.map((theme) => theme.key));
    expect(WORD_CATALOG.filter((entry) => !keys.has(entry.theme))).toEqual([]);
  });

  it('is big enough to keep boards varied', () => {
    // Guards against a future refactor silently gutting the list. The open-syllable-only
    // rule is what caps this — widen the syllable inventory before expecting much more.
    expect(WORD_CATALOG.length).toBeGreaterThanOrEqual(200);
    expect(wordsBySyllableCount(2).length).toBeGreaterThanOrEqual(120);
    expect(wordsBySyllableCount(3).length).toBeGreaterThanOrEqual(25);
  });
});

describe('album membership', () => {
  it('collects only words that can show a picture', () => {
    expect(albumWords().every(hasPicture)).toBe(true);
    expect(albumWords().every((entry) => entry.photo || typeof entry.e === 'string')).toBe(true);
  });

  it('leaves picture-less words out of the album but still real', () => {
    const bonus = WORD_CATALOG.filter((entry) => !hasPicture(entry));
    expect(bonus.length).toBeGreaterThan(0);
    expect(bonus.every((entry) => isRealWord(entry.w))).toBe(true);
    expect(albumWords().map((entry) => entry.w)).not.toContain('kenapa');
  });

  it('never puts a "lainnya" word on a shelf', () => {
    expect(albumWordsForTheme('lainnya')).toEqual([]);
    expect(albumThemes().map((theme) => theme.key)).not.toContain('lainnya');
  });

  it('offers enough targets per difficulty tier', () => {
    // Mudah needs 2-syllable targets, Sedang 2–3, Sulit 3–4 — each board takes 3 at once.
    expect(albumWordsBySyllableCount(2).length).toBeGreaterThanOrEqual(20);
    expect(albumWordsBySyllableCount(3).length).toBeGreaterThanOrEqual(8);
  });

  it('starts with no curated photos, so no tile can 404', () => {
    // The curation pass flips these on as the art lands (see the companion content issue).
    expect(PHOTO_WORDS.size).toBe(0);
    expect(WORD_CATALOG.every((entry) => entry.photo === PHOTO_WORDS.has(entry.w))).toBe(true);
  });
});

describe('lookup helpers', () => {
  it('recognizes catalog words and rejects nonsense', () => {
    expect(isRealWord('kuda')).toBe(true);
    expect(isRealWord('kalupi')).toBe(false);
    expect(catalogEntry('kelapa')?.syl).toEqual(['ke', 'la', 'pa']);
    expect(catalogEntry('kalupi')).toBeUndefined();
  });

  it('renders the album breakdown label', () => {
    const kuda = catalogEntry('kuda');
    expect(kuda && syllableLabel(kuda)).toBe('ku · da');
  });

  it('blocks unsafe words without listing them as real', () => {
    for (const word of UNSAFE_WORDS) {
      expect(isUnsafeWord(word)).toBe(true);
      expect(isRealWord(word)).toBe(false);
    }
  });
});
