/**
 * Spoken feedback phrases. Each level has its own pools so celebrations vary by level.
 * At runtime one phrase is chosen at random from the relevant pool, spoken in the
 * profile's chosen voice. Edit / expand freely (keep 3–5 per pool).
 *
 * Wrong answers are spoken CONTEXTUALLY by composing clips:
 *   <wrong lead> + "Ini" + <tapped item> + "Kamu harus cari" + <target>
 *   e.g. "Maaf, kamu salah. Ini D. Kamu harus cari A."
 * so the child hears what they tapped AND what to look for, then retries.
 */

/** @typedef {{ correct: string[], wrong: string[], complete: string[] }} FeedbackSet */

/** Connectors for composed wrong feedback (generated per voice/level like other clips). */
export const SAY_INI = 'Ini';
export const SAY_FIND = 'Kamu harus cari';

/**
 * Speaking activity (Ucapkan) encouragement. The child is READING, so feedback must
 * NOT reveal how to read the word — just nudge them to try again themselves.
 */
export const SPEAK_TRY = ['Ayo, coba baca lagi!', 'Coba sekali lagi, ya!', 'Ayo, kamu pasti bisa!'];

/** Spoken when a regular lesson is NOT passed (don't celebrate). */
export const LESSON_FAIL = 'Yah, kamu belum berhasil. Ayo coba lagi, ya!';

/** Spoken (once, generic) when a child taps a still-locked node on the path. */
export const LOCKED_PREREQ = 'Selesaikan pelajaran sebelumnya dulu, ya!';

/** Final-exam result lines (spoken). */
// Perfect score — every answer correct. One picked at random.
export const EXAM_PERFECT = [
  'Sempurna! Kamu benar semuanya!',
  'Hebat sekali! Semua jawabanmu benar!',
  'Luar biasa! Tidak ada yang salah!'
];
// Passed but with a few mistakes — praise, allow continuing, but nudge a repeat.
// Keyed by number of wrong answers; falls back to EXAM_PASS_SOME for 3+.
export const EXAM_PASS_NEAR = {
  1: 'Hebat! Kamu cuma salah satu. Kamu bisa lanjut ke level berikutnya, tapi kalau diulang lebih baik, ya!',
  2: 'Hebat! Kamu cuma salah dua. Kamu bisa lanjut ke level berikutnya, tapi kalau diulang lebih baik, ya!'
};
export const EXAM_PASS_SOME =
  'Hebat! Kamu lulus. Kamu bisa lanjut ke level berikutnya, tapi kalau diulang lebih baik, ya!';
export const EXAM_FAIL = 'Sayang sekali, kamu belum bisa lanjut. Ayo coba lagi!';

/** Spoken exam result for a pass, by number of wrong answers (0 = perfect). */
export function examPassText(wrong, pickFn) {
  if (wrong <= 0) return pickFn(EXAM_PERFECT);
  return EXAM_PASS_NEAR[wrong] ?? EXAM_PASS_SOME;
}

/** Shared fallback pools, used for any level not overridden below. */
const BASE = {
  correct: ['Hebat!', 'Pintar!', 'Betul sekali!', 'Bagus!', 'Keren!'],
  // Wrong "leads" — gentle, never claim "almost". Followed by the contextual part.
  wrong: ['Maaf, kamu salah.', 'Aduh, bukan itu.', 'Hmm, belum tepat.', 'Yah, salah ya.'],
  complete: ['Kamu hebat! Selesai!', 'Luar biasa! Satu bintang untukmu!', 'Wah, pintar sekali!']
};

/**
 * Per-level overrides (optional). Falls back to BASE for missing levels.
 * @type {Record<number, Partial<FeedbackSet>>}
 */
const OVERRIDES = {
  1: { correct: ['Hebat!', 'Pintar!', 'Betul!', 'Bagus!'] },
  9: {
    complete: [
      'Kamu sudah bisa membaca kata panjang! Hebat!',
      'Luar biasa! Kamu juara membaca!',
      'Wah, kamu pintar sekali!'
    ]
  }
};

/**
 * @param {number} level
 * @returns {FeedbackSet}
 */
export function feedbackForLevel(level) {
  const o = OVERRIDES[level] ?? {};
  return {
    correct: o.correct ?? BASE.correct,
    wrong: o.wrong ?? BASE.wrong,
    complete: o.complete ?? BASE.complete
  };
}

/** All unique feedback strings for a level — used by the audio generator. */
export function feedbackTextsForLevel(level) {
  const f = feedbackForLevel(level);
  return [
    ...new Set([
      ...f.correct,
      ...f.wrong,
      ...f.complete,
      SAY_INI,
      SAY_FIND,
      LESSON_FAIL,
      ...EXAM_PERFECT,
      ...Object.values(EXAM_PASS_NEAR),
      EXAM_PASS_SOME,
      EXAM_FAIL
    ])
  ];
}
