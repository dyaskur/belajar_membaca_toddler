import { describe, expect, it } from 'vitest';
import { getLevel, isPackUnlocked, lessonsForLevel, LEVELS } from './levels.js';
import { decompose, distractorsForWord, syllablesForWord } from './blend.js';
import { syllableIPA } from './pronunciation.js';
import { promptsForLevel } from './prompts.js';

describe('sub-level course model', () => {
  it('preserves legacy packs, removes sentences, and adds packs 7–9', () => {
    expect(LEVELS.map((level) => level.id)).toEqual([1, 2, 4, 5, 7, 3, 8, 9]);
    expect(LEVELS.map((level) => level.label)).toEqual(['1', '2a', '2b', '2c', '2d', '3a', '3b', '3c']);
    expect(getLevel(6)).toBeUndefined();
    expect(getLevel(7)?.items()).toHaveLength(30);
  });

  it('uses susun for every Level 3 pack', () => {
    expect([3, 8, 9].map((id) => getLevel(id)?.mechanic)).toEqual(['susun', 'susun', 'susun']);
    expect([3, 8, 9].map(promptsForLevel)).toEqual([
      ['Ayo susun kata', 'Susun suku katanya', 'Buat kata'],
      ['Ayo susun kata', 'Susun suku katanya', 'Buat kata'],
      ['Ayo susun kata', 'Susun suku katanya', 'Buat kata']
    ]);
    expect(getLevel(8)?.items().every((item) => item.text.length <= 6)).toBe(true);
    expect(getLevel(9)?.items().every((item) => item.text.length >= 7 && item.text.length <= 12)).toBe(true);
  });

  it('keeps the legacy pack 3 final-exam index stable', () => {
    expect(lessonsForLevel(3).find((lesson) => lesson.exam)?.index).toBe(3);
  });
});

describe('branching unlock graph', () => {
  /** @param {number} id @param {number[]} [completed] @param {number} [baseline] */
  const unlocked = (id, completed = [], baseline = 1) =>
    isPackUnlocked(id, baseline, (pack) => completed.includes(pack));

  it('opens all four branches plus 3a after 2a', () => {
    expect([4, 5, 7, 3].map((id) => unlocked(id, [2]))).toEqual([true, true, true, true]);
  });

  it('requires every advanced prerequisite for 3b, then 3b for 3c', () => {
    expect(unlocked(8, [3, 4, 5])).toBe(false);
    expect(unlocked(8, [3, 4, 5, 7])).toBe(true);
    expect(unlocked(9, [3, 4, 5, 7])).toBe(false);
    expect(unlocked(9, [8])).toBe(true);
  });

  it('keeps the legacy baseline as an expansion-only head start', () => {
    expect(unlocked(5, [], 6)).toBe(true);
    expect(unlocked(7, [], 6)).toBe(false);
    expect(unlocked(9, [], 6)).toBe(false);
  });
});

describe('syllable assembly content', () => {
  it('breaks advanced words into syllable tiles', () => {
    expect(syllablesForWord('gratis')).toEqual(['gra', 'tis']);
    expect(decompose(9, 'perpustakaan').syllables.map((part) => part.text)).toEqual([
      'per', 'pus', 'ta', 'ka', 'an'
    ]);
  });

  it('adds no distractors in 3a and graded distractors in 3b/3c', () => {
    expect(distractorsForWord(3, 'bola')).toEqual([]);
    expect(distractorsForWord(8, 'gratis')).toHaveLength(1);
    expect(distractorsForWord(9, 'perpustakaan')).toHaveLength(2);
  });

  it('composes IPA for r/l onset clusters', () => {
    expect(syllableIPA('gra')).toBe('gra');
    expect(syllableIPA('pra')).toBe('pra');
    expect(syllableIPA('kli')).toBe('kli');
    expect(syllableIPA('blo')).toBe('blo');
  });
});
