/**
 * Deterministic filename stem for a piece of text. Shared between the runtime audio
 * layer and the build-time generator so they agree on paths.
 * @param {string} text
 */
export function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'x';
}

/**
 * Filename stem for a target + variant index. Variant 0 keeps the bare slug (so it
 * stays backwards-compatible); later variants get a `__2`, `__3` suffix.
 * @param {string} text
 * @param {number} n
 */
export function variantStem(text, n) {
  const base = slug(text);
  return n > 0 ? `${base}__${n + 1}` : base;
}

/**
 * @param {string} voiceId
 * @param {number} level
 * @param {string} stem
 */
export function audioPathStem(voiceId, level, stem) {
  return `/audio/${voiceId}/${level}/${stem}.mp3`;
}
