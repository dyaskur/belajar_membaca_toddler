/**
 * @typedef {'<=4'|'5'|'6'} AgeBand
 * @typedef {{ id: AgeBand, label: string, description: string, quizTileCount: 3|4|6, unlockedLevel: 1|2 }} AgeBandOption
 */

/** @type {AgeBand} */
export const DEFAULT_AGE_BAND = '<=4';

/** @type {AgeBandOption[]} */
export const AGE_BANDS = [
  { id: '<=4', label: '≤4 tahun', description: 'Paling ringan', quizTileCount: 3, unlockedLevel: 1 },
  { id: '5', label: '5 tahun', description: 'Seimbang', quizTileCount: 4, unlockedLevel: 1 },
  { id: '6', label: '6+ tahun', description: 'Lebih menantang', quizTileCount: 6, unlockedLevel: 2 }
];

/** @param {unknown} ageBand @returns {AgeBand} */
export function normalizeAgeBand(ageBand) {
  return AGE_BANDS.some((option) => option.id === ageBand) ? /** @type {AgeBand} */ (ageBand) : DEFAULT_AGE_BAND;
}

/** @param {unknown} ageBand @returns {3|4|6} */
export function quizTileCountForAge(ageBand) {
  return AGE_BANDS.find((option) => option.id === normalizeAgeBand(ageBand))?.quizTileCount ?? 3;
}

/** @param {unknown} ageBand @returns {1|2} */
export function unlockedLevelForAge(ageBand) {
  return AGE_BANDS.find((option) => option.id === normalizeAgeBand(ageBand))?.unlockedLevel ?? 1;
}

/** @param {unknown} ageBand */
export function profileOptionsForAge(ageBand) {
  const normalized = normalizeAgeBand(ageBand);
  return {
    ageBand: normalized,
    quizTileCount: quizTileCountForAge(normalized),
    unlockedLevel: unlockedLevelForAge(normalized)
  };
}
