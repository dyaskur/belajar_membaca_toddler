/**
 * Shared answer-tile palette for the games ("UI juice", issue #34).
 *
 * Each tile gets a soft candy background with a darker same-hue border and dark,
 * high-contrast text — reading legibility is priority #1. Colors are assigned
 * strictly BY POSITION (see {@link tileVars}), never by correctness, so a child
 * must pick the answer by its letter/word, not by its color.
 *
 * The values are exposed as CSS custom properties and consumed by the shared
 * `.tile` classes in `src/app.css`, so every game (belajar, cocokkan, menulis,
 * abjad, …) can reuse the exact same look.
 *
 * NOTE: deliberately NO green here — green is reserved for the "correct" tile
 * feedback (`.tile-won`), so a resting tile can never be mistaken for the right
 * answer. The cool slot is teal instead of mint.
 */
export const TILE_PALETTE = [
  { bg: '#fde68a', border: '#f59e0b', text: '#78350f' }, // sunny yellow
  { bg: '#fbcfe8', border: '#ec4899', text: '#9d174d' }, // bubblegum pink
  { bg: '#bae6fd', border: '#0ea5e9', text: '#075985' }, // sky blue
  { bg: '#99f6e4', border: '#14b8a6', text: '#115e59' }, // cool teal
  { bg: '#ddd6fe', border: '#8b5cf6', text: '#5b21b6' }, // soft lilac
  { bg: '#fed7aa', border: '#fb923c', text: '#9a3412' } // warm peach
];

/**
 * CSS custom properties for the tile at position `i` (wraps around the palette).
 * Spread onto a tile's inline `style` so the shared `.tile` classes can read them:
 * `style={tileVars(i) + \`--tile-delay:${i * 55}ms\`}`.
 * @param {number} i
 * @returns {string}
 */
export function tileVars(i) {
  const n = TILE_PALETTE.length;
  const c = TILE_PALETTE[((i % n) + n) % n];
  return `--tile-bg:${c.bg};--tile-border:${c.border};--tile-text:${c.text};`;
}
