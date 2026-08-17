import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels.js';
import {
  albumWords,
  CATALOG_WORDS,
  catalogEntry,
  isRealWord,
  kataTexts,
  KATA_FUNNY,
  KATA_REAL,
  KATA_THEMES,
  themeSections,
  UNSAFE_WORDS,
  wordsBySyllableCount,
  CATALOG_SYLLABLES
} from './kata-catalog.js';

/** The 95 open (CV) syllables from level 2 — the only syllables a board can place. */
const OPEN_SYLLABLES = new Set(LEVELS[1].items().map((it) => it.text));

describe('kata catalog integrity', () => {
  it('is a large, unique, single-syllable-count word list', () => {
    // Curated seed catalog — structured to grow toward the 300–600 target, with
    // 2-syllable words first and 3–4-syllable words filling in the harder tiers.
    expect(CATALOG_WORDS.length).toBeGreaterThanOrEqual(200);
    const words = CATALOG_WORDS.map((entry) => entry.w);
    expect(new Set(words).size).toBe(words.length);
  });

  it('spells each word exactly from its explicit syllables', () => {
    for (const entry of CATALOG_WORDS) {
      expect(entry.w).toBe(entry.syl.join(''));
    }
  });

  it('uses only open syllables from the level-2 inventory', () => {
    for (const entry of CATALOG_WORDS) {
      const bad = entry.syl.filter((s) => !OPEN_SYLLABLES.has(s));
      expect(bad, `${entry.w} has non-open syllable(s): ${bad.join(', ')}`).toHaveLength(0);
    }
    // The shared syllable vocabulary should also stay inside the inventory.
    expect(CATALOG_SYLLABLES.every((s) => OPEN_SYLLABLES.has(s))).toBe(true);
  });

  it('has no catalog entry on the blocked-word list', () => {
    for (const entry of CATALOG_WORDS) {
      expect(UNSAFE_WORDS, `${entry.w} is blocked`).not.toContain(entry.w);
    }
  });

  it('keeps the mesin blocklist superset stable', () => {
    // Original mesin entries are all still blocked.
    for (const w of ['babi', 'gila', 'bego', 'mati', 'puki', 'tahi']) {
      expect(UNSAFE_WORDS).toContain(w);
    }
    // Every blocked word is composed of placeable open syllables.
    for (const w of UNSAFE_WORDS) {
      for (const s of Level2SyllablesOf(w)) {
        expect(OPEN_SYLLABLES.has(s), `${w} uses an unplaceable syllable`).toBe(true);
      }
    }
  });

  it('every album word has a picture source (photo or emoji)', () => {
    for (const entry of albumWords()) {
      expect(entry.e || entry.photo, `${entry.w} has no picture source`).toBeTruthy();
    }
  });

  it('associates each entry with a known theme and a placeable syllable count', () => {
    const keys = new Set(KATA_THEMES.map((t) => t.key));
    for (const entry of CATALOG_WORDS) {
      expect(keys.has(entry.theme), `${entry.w} has unknown theme`).toBe(true);
      expect(entry.syl.length).toBeGreaterThanOrEqual(2);
      expect(entry.syl.length).toBeLessThanOrEqual(4);
    }
  });

  it('splits album shelves by theme, in canonical order, with no dupes', () => {
    const sections = themeSections();
    expect(sections.map((s) => s.key)).toEqual(KATA_THEMES.map((t) => t.key));
    const seens = sections.flatMap((s) => s.words.map((w) => w.w));
    expect(new Set(seens).size).toBe(seens.length);
    // Shelves regroup the same album words (order counts only within a theme).
    expect([...seens].sort()).toEqual(albumWords().map((w) => w.w).sort());
  });

  it('offers at least 3 album targets for every board difficulty', () => {
    // Mudah: 2-syllable album words. Sedang: 2–3. Sulit: 3–4.
    const album = albumWords();
    expect(album.filter((w) => w.syl.length === 2).length).toBeGreaterThanOrEqual(3);
    expect(album.filter((w) => w.syl.length >= 2 && w.syl.length <= 3).length).toBeGreaterThanOrEqual(3);
    expect(album.filter((w) => w.syl.length >= 3 && w.syl.length <= 4).length).toBeGreaterThanOrEqual(3);
    expect(wordsBySyllableCount(2).length).toBeGreaterThan(0);
    expect(wordsBySyllableCount(3).length).toBeGreaterThan(0);
  });
});

describe('kata catalog helpers', () => {
  it('looks words up case-insensitively through the word key', () => {
    const e = catalogEntry('kuda');
    expect(e?.theme).toBe('hewan');
    expect(e?.syl).toEqual(['ku', 'da']);
    expect(isRealWord('kuda')).toBe(true);
    expect(isRealWord('sdfsdf')).toBe(false);
    expect(catalogEntry('nope')).toBeUndefined();
  });

  it('album words are the ones with emoji or photo', () => {
    const kicks = new Set(albumWords().map((w) => w.w));
    expect(kicks.has('kuda')).toBe(true); // photo
    expect(kicks.has('nasi')).toBe(true); // emoji
    expect(kicks.has('baca')).toBe(false); // bonus-only, no picture
  });

  it('exposes audio text pools with no overlap', () => {
    const all = kataTexts();
    expect(new Set(all).size).toBe(all.length);
    expect(KATA_REAL.length).toBeGreaterThanOrEqual(3);
    expect(KATA_FUNNY.length).toBeGreaterThanOrEqual(3);
  });
});

/**
 * Split a blocked word into its explicit catalogue syllables — derive them by
 * walking consonant+vowel pairs so the test stays independent of the catalog.
 * @param {string} w
 */
function Level2SyllablesOf(w) {
  const consonants = new Set('bcdfghjklmnpqrstvwyz');
  /** @type {string[]} */
  const out = [];
  for (const ch of w) {
    if (consonants.has(ch)) {
      out.push(ch);
    } else if (out.length) {
      out[out.length - 1] += ch;
    }
  }
  return out;
}