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
  6: {
    complete: [
      'Kamu sudah bisa membaca kalimat! Hebat!',
      'Luar biasa! Kamu juara membaca!',
      'Wah, kamu pintar membaca!'
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
  return [...new Set([...f.correct, ...f.wrong, ...f.complete, SAY_INI, SAY_FIND])];
}
