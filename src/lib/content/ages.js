/**
 * Age bands offered at profile creation. Age only picks a sensible starting
 * quiz difficulty (`quizTileCount`); parents can change it later in Orang Tua.
 *
 * @typedef {Object} AgeBand
 * @property {string} id     Stored on the profile as `ageBand`.
 * @property {string} label  Shown on the picker button.
 * @property {number} tiles  Starting quiz tile count for this band.
 */

/** @type {AgeBand[]} */
export const AGE_BANDS = [
  { id: '<=4', label: '≤4 tahun', tiles: 3 },
  { id: '5', label: '5 tahun', tiles: 4 },
  { id: '6', label: '6 tahun', tiles: 6 }
];

/** Gentlest start, pre-selected everywhere an age is asked. */
export const DEFAULT_AGE_BAND = AGE_BANDS[0].id;

/** @param {string} ageBand */
export function tilesForAgeBand(ageBand) {
  return (AGE_BANDS.find((b) => b.id === ageBand) ?? AGE_BANDS[0]).tiles;
}
