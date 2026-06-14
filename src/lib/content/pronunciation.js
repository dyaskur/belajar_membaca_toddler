/**
 * Pronunciation control for the TTS generator.
 *
 * Two mechanisms, both render-time only (filenames & on-screen tiles never change):
 *
 * 1) LETTERS (Level 1) — handled in the generator via Wavenet + SSML spell-out.
 * 2) SYLLABLES (Level 2, digraphs in Level 5) — rendered on Chirp3-HD via SSML
 *    <phoneme> using composed IPA, so e.g. "be" is /be/ (not the English word "be" = /bi/)
 *    and "ce"/"je" use the correct Indonesian consonants.
 *
 * 3) SPOKEN_OVERRIDES — generic verbatim text overrides for any other one-off fixes.
 */

/** @type {Record<string, string>} */
export const SPOKEN_OVERRIDES = {};

/**
 * Per-letter overrides rendered on the MAIN (Chirp3-HD) voice instead of the Wavenet
 * spell-out, where spell-out is unclear. Value is either:
 *   - a string  -> plain text to speak (e.g. "ka")
 *   - { ipa }   -> SSML <phoneme> with that IPA (e.g. "ər" for R)
 * @type {Record<string, string | { ipa: string }>}
 */
export const LETTER_OVERRIDES = { k: 'ka', p: 'pe', r: { ipa: 'ər' } };

/** @param {string} text @returns {string} */
export function spokenFor(text) {
  return SPOKEN_OVERRIDES[text] ?? text;
}

// --- IPA composition for syllables -----------------------------------------

/** Indonesian consonant -> IPA. (g uses plain "g"; c/j/y are the Indonesian sounds.) */
const C_IPA = {
  b: 'b', c: 'tʃ', d: 'd', f: 'f', g: 'g', h: 'h', j: 'dʒ', k: 'k', l: 'l',
  m: 'm', n: 'n', p: 'p', r: 'r', s: 's', t: 't', v: 'v', w: 'w', y: 'j', z: 'z'
};
/** Vowel -> IPA. "e" = /e/ (é), the early-reading sound. */
const V_IPA = { a: 'a', i: 'i', u: 'u', e: 'e', o: 'o' };
/** Two-letter onsets (digraphs) -> IPA. */
const DIGRAPH_IPA = { ng: 'ŋ', ny: 'ɲ', kh: 'x', sy: 'ʃ' };

/**
 * Compose IPA for a CV syllable ("ba", "ce") or a digraph syllable ("nga", "nyi").
 * Returns null if the text isn't a recognised syllable shape.
 * @param {string} text
 * @returns {string|null}
 */
export function syllableIPA(text) {
  const t = text.toLowerCase();
  const di = t.slice(0, 2);
  if (t.length === 3 && DIGRAPH_IPA[di] && V_IPA[t[2]]) {
    return DIGRAPH_IPA[di] + V_IPA[t[2]];
  }
  if (t.length === 2 && C_IPA[t[0]] && V_IPA[t[1]]) {
    return C_IPA[t[0]] + V_IPA[t[1]];
  }
  return null;
}
