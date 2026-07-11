/**
 * Shared pastel "candy" palette for tappable answer tiles, reused across the
 * quiz-style games (belajar, and later cocokkan/menulis/abjad). Colors are
 * assigned by tile position, never by correctness — kids must read the
 * letter, not guess the color. Dark text on a light pastel bg keeps reading
 * legibility as the top priority.
 */
export const TILE_PALETTE = [
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-900' }, // pastel yellow
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-900' }, // pastel pink
  { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-900' }, // pastel sky
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900' }, // pastel mint
  { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-900' }, // pastel lilac
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-900' } // pastel peach
];

/** @param {number} i */
export function tileColor(i) {
  return TILE_PALETTE[i % TILE_PALETTE.length];
}
