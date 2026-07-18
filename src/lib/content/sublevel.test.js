import { describe, it, expect } from 'vitest';
import { NODES, getNode, packMode, susunHasDistractors, getLevel } from './levels.js';
import { syllablesOf, WORD_SYLLABLES, decompose } from './blend.js';
import { syllableIPA } from './pronunciation.js';

describe('sub-level nodes', () => {
  it('covers the 8 nodes with the designed pack mapping', () => {
    expect(NODES.map((n) => n.pack)).toEqual([1, 2, 4, 5, 7, 3, 8, 9]);
    expect(getNode(6)).toBeUndefined(); // Kalimat removed
  });

  it('encodes the branching unlock graph', () => {
    expect(getNode(2)?.prereqs).toEqual([1]); // 2a after Huruf
    for (const pack of [4, 5, 7, 3]) expect(getNode(pack)?.prereqs).toEqual([2]); // 2b/2c/2d/3a after 2a
    expect(getNode(8)?.prereqs).toEqual([3, 4, 5, 7]); // 3b needs 3a + every advanced pattern
    expect(getNode(9)?.prereqs).toEqual([8]); // 3c after 3b
  });

  it('marks only Level 3 packs as susun', () => {
    for (const pack of [3, 8, 9]) expect(packMode(pack)).toBe('susun');
    for (const pack of [1, 2, 4, 5, 7]) expect(packMode(pack)).toBe('recognition');
    expect(susunHasDistractors(3)).toBe(false); // 3a is order-only
    expect(susunHasDistractors(8)).toBe(true);
    expect(susunHasDistractors(9)).toBe(true);
  });
});

describe('cluster content (pack 7 / 2d)', () => {
  it('generates 6 onsets × 5 vowels = 30 syllables', () => {
    const items = getLevel(7)?.items() ?? [];
    expect(items).toHaveLength(30);
    expect(items.map((i) => i.text)).toContain('gra');
    expect(items.map((i) => i.text)).toContain('klu');
  });

  it('composes IPA for cluster onsets (r/l as the second consonant)', () => {
    expect(syllableIPA('gra')).toBe('gra');
    expect(syllableIPA('pla')).toBe('pla');
    expect(syllableIPA('kri')).toBe('kri');
    // closed syllables still work (final ng = velar nasal)
    expect(syllableIPA('tang')).toBe('taŋ');
    // plain CV unaffected
    expect(syllableIPA('ba')).toBe('ba');
  });
});

describe('susun word breakdowns', () => {
  it('has a syllable map for every Level 3 word', () => {
    for (const pack of [3, 8, 9]) {
      for (const item of getLevel(pack)?.items() ?? []) {
        expect(WORD_SYLLABLES[item.text], `missing syllables for ${item.text}`).toBeDefined();
        // the syllables must reassemble the whole word
        expect(syllablesOf(item.text).join('')).toBe(item.text);
      }
    }
  });

  it('decomposes advanced words into multiple syllables', () => {
    expect(decompose(8, 'gratis').syllables.map((s) => s.text)).toEqual(['gra', 'tis']);
    expect(decompose(9, 'keranjang').multi).toBe(true);
  });
});
