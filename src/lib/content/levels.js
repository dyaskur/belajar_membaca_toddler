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

const LEVEL7_CLUSTERS = ['pr', 'tr', 'kr', 'gr', 'bl', 'kl'].flatMap((cluster) =>
  VOWELS.map((vowel) => `${cluster}${vowel}`)
);

const LEVEL8_WORDS = [
  'parah', 'bakso', 'sabun', 'robot', 'pintu', 'gratis', 'nyamuk', 'syukur',
  'krayon', 'klinik', 'global', 'kantor', 'bantal', 'kertas', 'gambar', 'sampah'
];

const LEVEL9_WORDS = [
  'pelangi', 'sekolah', 'jendela', 'bermain', 'membaca', 'bersama', 'keluarga',
  'matahari', 'olahraga', 'komputer', 'sederhana', 'perpustakaan'
];

/** @param {string} prefix @param {string[]} words @returns {Item[]} */
function wordItems(prefix, words) {
  return words.map((w, i) => ({ id: `${prefix}_${i}_${w.replace(/[^a-z]/gi, '')}`, text: w, display: w }));
}

/**
 * @typedef {Object} Level
 * @property {number} id
 * @property {1|2|3} stage
 * @property {string} label
 * @property {string} title
 * @property {string} subtitle  Adult-facing, Bahasa Indonesia.
 * @property {'recognition'|'susun'} mechanic
 * @property {number[]} prerequisites Pack ids whose final exams must be passed.
 * @property {() => Item[]} items
 */

/** @type {Level[]} */
export const LEVELS = [
  { id: 1, stage: 1, label: '1', title: 'Huruf', subtitle: 'Mengenal A–Z', mechanic: 'recognition', prerequisites: [], items: level1Letters },
  { id: 2, stage: 2, label: '2a', title: 'Suku Kata Terbuka', subtitle: 'ba, bi, bu, be, bo', mechanic: 'recognition', prerequisites: [1], items: level2Syllables },
  { id: 4, stage: 2, label: '2b', title: 'Suku Kata Tertutup', subtitle: 'an, bak, tas', mechanic: 'recognition', prerequisites: [2], items: () => wordItems('l4', LEVEL4_CLOSED) },
  { id: 5, stage: 2, label: '2c', title: 'Gabungan Huruf', subtitle: 'ng, ny, kh, sy', mechanic: 'recognition', prerequisites: [2], items: () => wordItems('l5', LEVEL5_DIGRAPHS) },
  { id: 7, stage: 2, label: '2d', title: 'Gugus Konsonan', subtitle: 'pra, tri, kru, gre, blo', mechanic: 'recognition', prerequisites: [2], items: () => wordItems('l7', LEVEL7_CLUSTERS) },
  { id: 3, stage: 3, label: '3a', title: 'Susun Kata', subtitle: 'Kata dengan suku kata terbuka', mechanic: 'susun', prerequisites: [2], items: () => wordItems('l3', LEVEL3_WORDS) },
  { id: 8, stage: 3, label: '3b', title: 'Susun Kata Lanjut', subtitle: 'Pola gabungan dan suku tertutup', mechanic: 'susun', prerequisites: [3, 4, 5, 7], items: () => wordItems('l8', LEVEL8_WORDS) },
  { id: 9, stage: 3, label: '3c', title: 'Susun Kata Panjang', subtitle: 'Kata panjang 7–12 huruf', mechanic: 'susun', prerequisites: [8], items: () => wordItems('l9', LEVEL9_WORDS) }
];

/** @param {number} id */
export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}

/** @param {number} id */
export function levelLabel(id) {
  return getLevel(id)?.label ?? String(id);
}

/** Pack ids required before `id` can open through the course graph. @param {number} id */
export function prerequisitesForLevel(id) {
  return getLevel(id)?.prerequisites ?? [];
}

/**
 * Course-graph unlock rule. The legacy `unlockedLevel` value is a fixed starting
 * baseline; progress after profile creation is derived from passed final exams.
 * @param {number} id
 * @param {number} baseline
 * @param {(packId: number) => boolean} isComplete
 * @param {boolean} [unlockAll]
 */
export function isPackUnlocked(id, baseline, isComplete, unlockAll = false) {
  return unlockAll || id <= baseline || prerequisitesForLevel(id).every(isComplete);
}

/** Questions per round (flat per-level mode). */
export const ROUND_SIZE = 10;
/** Mastery threshold (fraction) to pass a lesson / unlock the next. */
export const MASTERY = 0.8;
/** Number of answer tiles (1 correct + N-1 distractors). */
export const TILE_COUNT = 3;
/** Supported parent-selected answer tile counts. */
export const TILE_COUNT_OPTIONS = [3, 4, 5, 6];
/** Minimum supported answer tile count. */
export const MIN_TILE_COUNT = TILE_COUNT_OPTIONS[0];
/** Maximum supported answer tile count. */
export const MAX_TILE_COUNT = TILE_COUNT_OPTIONS[TILE_COUNT_OPTIONS.length - 1];
/** @param {unknown} count @param {number} [fallback] */
export function normalizeTileCount(count, fallback = TILE_COUNT) {
  const n = Number(count);
  if (!Number.isFinite(n)) return fallback;
  if (n < MIN_TILE_COUNT) return MIN_TILE_COUNT;
  if (n > MAX_TILE_COUNT) return MAX_TILE_COUNT;
  return TILE_COUNT_OPTIONS.includes(n) ? n : fallback;
}

// --- Course structure: lessons within levels -------------------------------

/** New items introduced per lesson. */
export const LESSON_SIZE = 5;
/** Questions in a lesson's practice round. */
export const LESSON_ROUND_SIZE = 8;
/** Max questions in a test (placement / final exam). Level 1 = all 26 letters. */
export const EXAM_SIZE = 26;
/** Final exam is harder: more answer tiles than lessons/placement. */
export const EXAM_TILE_COUNT = 4;

/**
 * @typedef {Object} Lesson
 * @property {number} index    0-based position within the level.
 * @property {string} title    Derived from its items, e.g. "ba bi bu be bo".
 * @property {Item[]} items    The new items this lesson introduces (all items for tests).
 * @property {boolean} [exam]  True for the final exam (harder; needs all lessons passed).
 * @property {boolean} [placement] True for the placement test (open from the start).
 */

/**
 * Explicit lesson sizes per level. Level 1 = groups of 4, ending u-v-w / x-y-z so the
 * first lesson is A B C D and there's no lone "Z". Levels without an entry fall back to
 * chunks of LESSON_SIZE (with any trailing single item merged into the previous lesson).
 * @type {Record<number, number[]>}
 */
const LESSON_PLAN = {
  1: [4, 4, 4, 4, 4, 3, 3], // a-d, e-h, i-l, m-p, q-t, u-w, x-z  (sums to 26)
  // Keep pack 3 at three lessons so legacy lesson/exam indexes remain valid.
  3: [5, 5, 6],
  7: [5, 5, 5, 5, 5, 5],
  8: [4, 4, 4, 4],
  9: [3, 3, 3, 3]
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
      const tail = groups.pop();
      if (tail) groups[groups.length - 1].push(...tail);
    }
  }

  /** @type {Lesson[]} */
  const lessons = groups.map((group, index) => ({
    index,
    title: group.map((it) => it.display ?? it.text).join('  '),
    items: group
  }));
  // Final exam (unlocked after all lessons pass) + placement test (open from the
  // start). The final exam drives dependent nodes in the course graph.
  lessons.push({ index: lessons.length, title: 'Ujian Akhir', items, exam: true });
  lessons.push({ index: lessons.length, title: 'Tes Penempatan', items, placement: true });
  return lessons;
}

/** Regular (teachable) lessons only — excludes the placement test and final exam. @param {number} levelId */
export function regularLessons(levelId) {
  return lessonsForLevel(levelId).filter((l) => !l.exam && !l.placement);
}

/** @param {number} levelId @param {number} index */
export function getLesson(levelId, index) {
  return lessonsForLevel(levelId)[index];
}

/** @param {number} levelId */
export function lessonCount(levelId) {
  return lessonsForLevel(levelId).length;
}
