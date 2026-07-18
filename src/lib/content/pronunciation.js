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

/**
 * Verbatim text overrides for the PLAIN render path (engines without SSML, e.g.
 * ElevenLabs; Google syllables use IPA and bypass this). Indonesian ⟨v⟩ = [f], so
 * spell the v-syllables with f for a natural read.
 * @type {Record<string, string>}
 */
export const SPOKEN_OVERRIDES = {
  va: 'fa', vi: 'fi', vu: 'fu', ve: 'fe', vo: 'fo',
  // Abjad page: plain TTS reads "quran" oddly; spaced form reads as two clear syllables.
  quran: 'kur an',
  // Abjad page: "yoyo" gets spelled out (Y-O-Y-O); spaced form reads as the toy.
  yoyo: 'yo yo'
};

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

/**
 * Indonesian consonant -> IPA. (g uses plain "g"; c/j/y are the Indonesian sounds.)
 * v -> /f/: Indonesian ⟨v⟩ is pronounced [f] ("ve" = "fe"); a true /v/ renders
 * unnaturally ("alien") on Chirp3-HD.
 */
const C_IPA = {
  b: 'b', c: 'tʃ', d: 'd', f: 'f', g: 'g', h: 'h', j: 'dʒ', k: 'k', l: 'l',
  m: 'm', n: 'n', p: 'p', r: 'r', s: 's', t: 't', v: 'f', w: 'w', y: 'j', z: 'z'
};
/** Vowel -> IPA. "e" = /e/ (é), the early-reading sound. */
const V_IPA = { a: 'a', i: 'i', u: 'u', e: 'e', o: 'o' };
/** Two-letter onsets (digraphs) -> IPA. */
const DIGRAPH_IPA = { ng: 'ŋ', ny: 'ɲ', kh: 'x', sy: 'ʃ' };

/**
 * Compose IPA for an Indonesian syllable: an optional onset (single consonant or a
 * digraph), a required vowel, then an optional coda (consonants/digraphs). Covers open
 * CV ("ba", "ce"), digraph onsets ("nga", "nyi") AND closed syllables ("bin", "tang",
 * "ruk", "un") — the latter so a final "ng" is the velar nasal /ŋ/, not English "-nk".
 * Returns null if the text isn't a recognised syllable shape.
 * @param {string} text
 * @returns {string|null}
 */
export function syllableIPA(text) {
  const t = text.toLowerCase();
  if (!t) return null;
  let i = 0;
  let out = '';
  // optional onset — cluster (consonant + r/l, e.g. "gra", "pla") first, then digraph,
  // then a single consonant. Clusters keep both consonants: "gr" -> /gr/, "kl" -> /kl/.
  if (C_IPA[t[0]] && (t[1] === 'r' || t[1] === 'l') && V_IPA[t[2]]) {
    out += C_IPA[t[0]] + C_IPA[t[1]];
    i = 2;
  } else if (DIGRAPH_IPA[t.slice(0, 2)]) {
    out += DIGRAPH_IPA[t.slice(0, 2)];
    i = 2;
  } else if (C_IPA[t[0]]) {
    out += C_IPA[t[0]];
    i = 1;
  }
  // required vowel
  if (!V_IPA[t[i]]) return null;
  out += V_IPA[t[i]];
  i += 1;
  // optional coda — a run of consonants/digraphs
  while (i < t.length) {
    if (DIGRAPH_IPA[t.slice(i, i + 2)]) {
      out += DIGRAPH_IPA[t.slice(i, i + 2)];
      i += 2;
    } else if (C_IPA[t[i]]) {
      out += C_IPA[t[i]];
      i += 1;
    } else {
      return null;
    }
  }
  return out;
}
