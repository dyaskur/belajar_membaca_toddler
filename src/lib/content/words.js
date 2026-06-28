/**
 * Picture-words for the "Ucapkan!" (read aloud) and "Belajar Menulis" (writing)
 * activities: simple, picturable Indonesian words. The first letter ties to phonics
 * (say "bola" → B).
 *
 * FACELESS RULE (aniconism): every emoji here must be an OBJECT or a faceless picture —
 * no faces of living beings. That rules out animal emoji (🐱🐄🐘🐟🐔🐍🦆🐴 …) and face
 * parts (👁️). Keep new entries to objects/food/plants, and check the same when the
 * optional `img` illustration field is added later.
 *
 * @typedef {'celestial'|'food'|'nature'|'object'|'plant'|'vehicle'} PictureKind
 * @typedef {{ w: string, e: string, kind: PictureKind, faceSafe: true, notes?: string }} PictureWord
 */

/** @type {PictureWord[]} */
export const PICTURE_WORDS = [
  { w: 'bola', e: '⚽', kind: 'object', faceSafe: true },
  { w: 'buku', e: '📖', kind: 'object', faceSafe: true },
  { w: 'topi', e: '👒', kind: 'object', faceSafe: true },
  { w: 'pisang', e: '🍌', kind: 'food', faceSafe: true },
  { w: 'apel', e: '🍎', kind: 'food', faceSafe: true },
  { w: 'nasi', e: '🍚', kind: 'food', faceSafe: true },
  { w: 'jeruk', e: '🍊', kind: 'food', faceSafe: true },
  { w: 'daun', e: '🍃', kind: 'plant', faceSafe: true },
  { w: 'gigi', e: '🦷', kind: 'object', faceSafe: true },
  { w: 'susu', e: '🥛', kind: 'food', faceSafe: true },
  { w: 'roti', e: '🍞', kind: 'food', faceSafe: true },
  { w: 'bunga', e: '🌸', kind: 'plant', faceSafe: true },
  { w: 'mobil', e: '🚗', kind: 'vehicle', faceSafe: true },
  { w: 'rumah', e: '🏠', kind: 'object', faceSafe: true },
  { w: 'bintang', e: '⭐', kind: 'celestial', faceSafe: true },
  { w: 'sepatu', e: '👟', kind: 'object', faceSafe: true },
  { w: 'payung', e: '☂️', kind: 'object', faceSafe: true },
  { w: 'bulan', e: '🌙', kind: 'celestial', faceSafe: true },
  { w: 'awan', e: '☁️', kind: 'nature', faceSafe: true },
  { w: 'kunci', e: '🔑', kind: 'object', faceSafe: true },
  { w: 'jam', e: '🕐', kind: 'object', faceSafe: true, notes: 'Clock face is an object face, not a living face.' },
  { w: 'gelas', e: '🥤', kind: 'object', faceSafe: true },
  { w: 'sendok', e: '🥄', kind: 'object', faceSafe: true },
  { w: 'kursi', e: '🪑', kind: 'object', faceSafe: true },
  { w: 'tas', e: '🎒', kind: 'object', faceSafe: true },
  { w: 'pintu', e: '🚪', kind: 'object', faceSafe: true },
  { w: 'lampu', e: '💡', kind: 'object', faceSafe: true },
  { w: 'pensil', e: '✏️', kind: 'object', faceSafe: true },
  { w: 'pena', e: '🖊️', kind: 'object', faceSafe: true },
  { w: 'sepeda', e: '🚲', kind: 'vehicle', faceSafe: true },
  { w: 'kapal', e: '🚢', kind: 'vehicle', faceSafe: true },
  { w: 'pesawat', e: '✈️', kind: 'vehicle', faceSafe: true },
  { w: 'balon', e: '🎈', kind: 'object', faceSafe: true },
  { w: 'hadiah', e: '🎁', kind: 'object', faceSafe: true },
  { w: 'baju', e: '👕', kind: 'object', faceSafe: true },
  { w: 'celana', e: '👖', kind: 'object', faceSafe: true },
  { w: 'wortel', e: '🥕', kind: 'food', faceSafe: true },
  { w: 'cabai', e: '🌶️', kind: 'food', faceSafe: true },
  { w: 'nanas', e: '🍍', kind: 'food', faceSafe: true },
  { w: 'telur', e: '🥚', kind: 'food', faceSafe: true }
];

/** Explicit allowlist for the Cocokkan picture game. */
export const COCOKKAN_WORDS = PICTURE_WORDS.filter((word) => word.faceSafe);
