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
 *   - { ipa, text?, rate? } -> SSML <phoneme> with that IPA. `text` is the fallback
 *     content, `rate` overrides the normal-variant speaking rate.
 * @type {Record<string, string | { ipa: string, text?: string, rate?: number }>}
 */
export const LETTER_OVERRIDES = {
  k: 'ka',
  p: 'pe',
  g: 'ghe',
  // Chirp3-HD is generative (varies each render). The clear "ər" render is ~3936 bytes
  // (short ones = "o", long ones = a different vowel). Sample and keep the one closest to
  // that length. NOTE: the committed r.mp3 files are the human-approved renders and are
  // not regenerated unless deleted (skip-if-exists); this is the fallback.
  r: { ipa: 'ər', text: 'R', rate: 0.85, tries: 16, targetLen: 3936 }
};

/** @param {string} text @returns {string} */
export function spokenFor(text) {
  return SPOKEN_OVERRIDES[text] ?? text;
}

/**
 * Indonesian letter NAMES as plain text — for engines without SSML spell-out (e.g.
 * ElevenLabs). é written with the acute to push toward /e/.
 * @type {Record<string, string>}
 */
export const LETTER_NAMES = {
  a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'é', f: 'éf', g: 'gé', h: 'ha', i: 'i',
  j: 'jé', k: 'ka', l: 'él', m: 'ém', n: 'én', o: 'o', p: 'pé', q: 'ki', r: 'ér',
  s: 'és', t: 'té', u: 'u', v: 'vé', w: 'wé', x: 'éks', y: 'yé', z: 'zét'
};

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
