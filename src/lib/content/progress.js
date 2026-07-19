import { lessonsForLevel, MASTERY } from './levels.js';

/**
 * Completion from course-mode exam scores, with a fallback for profiles created by
 * the older flat-level game (which only stored `bestScore`).
 * @param {{ bestScore?: Record<number, number>, lessonScore?: Record<number, Record<number, number>> }|null|undefined} profile
 * @param {number} levelId
 */
export function profileLevelComplete(profile, levelId) {
  if (!profile) return false;
  const scores = profile.lessonScore?.[levelId];
  if (!scores || Object.keys(scores).length === 0) {
    return (profile.bestScore?.[levelId] ?? 0) >= MASTERY;
  }
  const exam = lessonsForLevel(levelId).find((lesson) => lesson.exam);
  return !!exam && (scores[exam.index] ?? 0) >= MASTERY;
}
