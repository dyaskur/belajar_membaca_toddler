import { describe, expect, it } from 'vitest';
import { getLevel, isPackUnlocked, lessonsForLevel, regularLessons, LEVELS } from './levels.js';
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

  it('slices 2b/2c/3b into the intended per-pattern lessons', () => {
    /** @param {number} levelId @param {number} index */
    const texts = (levelId, index) => regularLessons(levelId)[index].items.map((it) => it.text);
    // 2b (pack 4): per-coda VC rows first, onset CVC syllables after.
    expect(regularLessons(4)).toHaveLength(6);
    expect(texts(4, 0)).toEqual(['an', 'in', 'un', 'en', 'on']);
    expect(texts(4, 2)).toEqual(['as', 'is', 'us', 'es', 'os']);
    // 2c (pack 5): kh/sy dropped; -ng coda + diftong added; diftong lessons land last.
    expect(regularLessons(5)).toHaveLength(7);
    expect(getLevel(5)?.items().some((it) => it.text === 'kha' || it.text === 'syu')).toBe(false);
    expect(texts(5, 5)).toEqual(['ai', 'au', 'ei', 'oi']);
    expect(texts(5, 6)).toEqual(['bai', 'bau', 'mau', 'boi', 'vei']);
    // 3b (pack 8): diftong words grouped au / ai / oi-ei after the legacy words.
    expect(texts(8, 5)).toEqual(['pantai', 'sungai', 'lantai', 'santai', 'badai']);
    expect(texts(8, 6)).toEqual(['koboi', 'konvoi', 'survei']);
  });

  it('has no duplicate item text within any level', () => {
    for (const level of LEVELS) {
      const texts = level.items().map((it) => it.text);
      expect(new Set(texts).size).toBe(texts.length);
    }
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

  it('keeps diphthongs as one blend unit and inside one syllable tile', () => {
    // 2c recognition item "bai" blends as b + ai, and bare "ai" is a single glide.
    expect(decompose(5, 'bai').syllables[0].letters).toEqual(['b', 'ai']);
    expect(decompose(5, 'ai').syllables[0].letters).toEqual(['ai']);
    // 3b word: the diphthong never gets split across syllables.
    expect(syllablesForWord('pulau')).toEqual(['pu', 'lau']);
    expect(syllablesForWord('sungai')).toEqual(['su', 'ngai']);
    expect(decompose(8, 'pulau').syllables.map((p) => p.letters)).toEqual([
      ['p', 'u'],
      ['l', 'au']
    ]);
    // Hiatus (not a diphthong) is still split: bermain = ber-ma-in.
    expect(syllablesForWord('bermain')).toEqual(['ber', 'ma', 'in']);
  });

  it('composes IPA for r/l onset clusters', () => {
    expect(syllableIPA('gra')).toBe('gra');
    expect(syllableIPA('pra')).toBe('pra');
    expect(syllableIPA('kli')).toBe('kli');
    expect(syllableIPA('blo')).toBe('blo');
  });
});
