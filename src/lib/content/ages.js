/**
 * Age bands offered at profile creation. Age only picks a sensible starting
 * point — quiz difficulty (`quizTileCount`) and, for the oldest band, skipping
 * straight to level 2. Parents can change the tile count later in Orang Tua.
 *
 * @typedef {Object} AgeBand
 * @property {string} id     Stored on the profile as `ageBand`.
 * @property {string} label  Shown on the picker button.
 * @property {number} tiles  Starting quiz tile count for this band.
 * @property {number} unlockedLevel  Starting unlocked level for this band.
 */

/** @type {AgeBand[]} */
export const AGE_BANDS = [
  { id: '<=4', label: '≤4 tahun', tiles: 3, unlockedLevel: 1 },
  { id: '5', label: '5 tahun', tiles: 4, unlockedLevel: 1 },
  { id: '>6', label: '>6 tahun', tiles: 6, unlockedLevel: 2 }
];

/** Gentlest start, pre-selected everywhere an age is asked. */
export const DEFAULT_AGE_BAND = AGE_BANDS[0].id;

/**
 * Profile-creation options derived from an age band, in the shape
 * `profiles.add(...)` expects as its `opts` argument.
 * @param {string} ageBand
 */
export function profileOptsForAgeBand(ageBand) {
  const band = AGE_BANDS.find((b) => b.id === ageBand) ?? AGE_BANDS[0];
  return { ageBand: band.id, quizTileCount: band.tiles, unlockedLevel: band.unlockedLevel };
}
