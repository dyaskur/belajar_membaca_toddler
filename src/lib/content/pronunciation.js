/**
 * Pronunciation overrides for targets the TTS engine renders ambiguously.
 * Maps a target text -> IPA, used by the audio generator to force a clear sound via
 * SSML <phoneme>. The runtime is unaffected (same filenames) — this only changes how
 * the clip is synthesized.
 *
 * Indonesian "e" is ambiguous: é /e/ (meja) vs schwa ê /ə/ (nenek). For early reading
 * drills we want the clear é, so we pin those syllables to /e/.
 *
 * @type {Record<string, string>}
 */
export const IPA_OVERRIDES = {
  // ne: pending — IPA mangled the consonant; see candidate comparison.
};

/** @param {string} text @returns {string|null} */
export function ipaFor(text) {
  return IPA_OVERRIDES[text.toLowerCase()] ?? null;
}
