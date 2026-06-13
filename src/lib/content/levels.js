/**
 * Level definitions and item generation. Content is voice-agnostic: an "item" is just
 * a piece of text the child must recognize. Audio for each item is generated per voice.
 *
 * @typedef {Object} Item
 * @property {string} id     Stable id, also used as the audio filename stem.
 * @property {string} text   The target text spoken & shown.
 * @property {string} display Optional larger display string (defaults to text).
 */

const VOWELS = ['a', 'i', 'u', 'e', 'o'];
// Consonants commonly taught first (excludes digraph letters handled in level 5).
const CONSONANTS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
  'n', 'p', 'r', 's', 't', 'v', 'w', 'y', 'z'
];
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** @returns {Item[]} */
function level1Letters() {
  return ALPHABET.map((c) => ({ id: `l1_${c}`, text: c, display: c.toUpperCase() + c }));
}

/** @returns {Item[]} */
function level2Syllables() {
  /** @type {Item[]} */
  const out = [];
  for (const c of CONSONANTS) {
    for (const v of VOWELS) {
      const s = c + v;
      out.push({ id: `l2_${s}`, text: s, display: s });
    }
  }
  return out;
}

const LEVEL3_WORDS = [
  'bola', 'sapi', 'buku', 'meja', 'roti', 'susu', 'topi', 'kaki',
  'mata', 'gigi', 'baju', 'pena', 'kuda', 'rusa', 'lemari', 'sepatu'
];

const LEVEL4_CLOSED = [
  'an', 'in', 'un', 'bak', 'tas', 'pot', 'kan', 'bel',
  'sik', 'kun', 'pal', 'sup', 'top', 'jam', 'gas', 'lap'
];

const LEVEL5_DIGRAPHS = [
  'nga', 'ngi', 'ngu', 'nge', 'ngo',
  'nya', 'nyi', 'nyu', 'nye', 'nyo',
  'kha', 'syu'
];

const LEVEL6_SENTENCES = [
  'Ini bola.', 'Itu sapi.', 'Saya suka roti.', 'Ibu minum susu.',
  'Adik baca buku.', 'Kakak pakai topi.', 'Kuda itu lari.', 'Bapak makan nasi.'
];

/** @param {string} prefix @param {string[]} words @returns {Item[]} */
function wordItems(prefix, words) {
  return words.map((w, i) => ({ id: `${prefix}_${i}_${w.replace(/[^a-z]/gi, '')}`, text: w, display: w }));
}

/**
 * @typedef {Object} Level
 * @property {number} id
 * @property {string} title
 * @property {string} subtitle  Adult-facing, Bahasa Indonesia.
 * @property {() => Item[]} items
 */

/** @type {Level[]} */
export const LEVELS = [
  { id: 1, title: 'Huruf', subtitle: 'Mengenal huruf', items: level1Letters },
  { id: 2, title: 'Suku Kata', subtitle: 'ba, bi, bu, be, bo', items: level2Syllables },
  { id: 3, title: 'Kata', subtitle: 'Kata sederhana', items: () => wordItems('l3', LEVEL3_WORDS) },
  { id: 4, title: 'Suku Tertutup', subtitle: 'an, bak, tas', items: () => wordItems('l4', LEVEL4_CLOSED) },
  { id: 5, title: 'Gabungan Huruf', subtitle: 'ng, ny, kh, sy', items: () => wordItems('l5', LEVEL5_DIGRAPHS) },
  { id: 6, title: 'Kalimat', subtitle: 'Kalimat pendek', items: () => wordItems('l6', LEVEL6_SENTENCES) }
];

/** @param {number} id */
export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}

/** Questions per round (flat per-level mode). */
export const ROUND_SIZE = 10;
/** Mastery threshold (fraction) to pass a lesson / unlock the next. */
export const MASTERY = 0.8;
/** Number of answer tiles (1 correct + N-1 distractors). */
export const TILE_COUNT = 3;

// --- Course structure: lessons within levels -------------------------------

/** New items introduced per lesson. */
export const LESSON_SIZE = 5;
/** Questions in a lesson's practice round. */
export const LESSON_ROUND_SIZE = 8;
/** Max questions in the final exam (Level 1 = all 26 letters). */
export const EXAM_SIZE = 26;

/**
 * @typedef {Object} Lesson
 * @property {number} index    0-based position within the level.
 * @property {string} title    Derived from its items, e.g. "ba bi bu be bo".
 * @property {Item[]} items    The new items this lesson introduces (all items for the exam).
 * @property {boolean} [exam]  True for the final exam lesson (tests the whole level).
 */

/**
 * Explicit lesson sizes per level. Level 1 = groups of 4, ending u-v-w / x-y-z so the
 * first lesson is A B C D and there's no lone "Z". Levels without an entry fall back to
 * chunks of LESSON_SIZE (with any trailing single item merged into the previous lesson).
 * @type {Record<number, number[]>}
 */
const LESSON_PLAN = {
  1: [4, 4, 4, 4, 4, 3, 3] // a-d, e-h, i-l, m-p, q-t, u-w, x-z  (sums to 26)
};

/**
 * Slice a level into bite-sized lessons. Level 2 stays at 5 = one consonant row.
 * @param {number} levelId
 * @returns {Lesson[]}
 */
export function lessonsForLevel(levelId) {
  const level = getLevel(levelId);
  if (!level) return [];
  const items = level.items();

  /** @type {Item[][]} */
  const groups = [];
  const plan = LESSON_PLAN[levelId];
  if (plan) {
    let i = 0;
    for (const size of plan) {
      if (i >= items.length) break;
      groups.push(items.slice(i, i + size));
      i += size;
    }
    if (i < items.length) groups.push(items.slice(i)); // safety: any leftover
  } else {
    for (let i = 0; i < items.length; i += LESSON_SIZE) groups.push(items.slice(i, i + LESSON_SIZE));
    // Avoid a lone trailing item: fold it into the previous lesson.
    if (groups.length > 1 && groups[groups.length - 1].length === 1) {
      groups[groups.length - 2].push(...groups.pop());
    }
  }

  /** @type {Lesson[]} */
  const lessons = groups.map((group, index) => ({
    index,
    title: group.map((it) => it.display ?? it.text).join('  '),
    items: group
  }));
  // Final exam: tests the whole level (unlocked after all lessons are passed).
  lessons.push({ index: lessons.length, title: 'Ujian Akhir', items, exam: true });
  return lessons;
}

/** @param {number} levelId @param {number} index */
export function getLesson(levelId, index) {
  return lessonsForLevel(levelId)[index];
}

/** @param {number} levelId */
export function lessonCount(levelId) {
  return lessonsForLevel(levelId).length;
}
