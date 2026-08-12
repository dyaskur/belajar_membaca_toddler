/**
 * Pronunciation control for the TTS generator.
 *
 * Two mechanisms, both render-time only (filenames & on-screen tiles never change):
 *
 * 1) LETTERS (Level 1) — handled in the generator via Wavenet + SSML spell-out.
 * 2) SYLLABLES (packs 2/5/7 and Level 3 word breakdowns) — rendered on Chirp3-HD via SSML
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
 * Per-syllable overrides for the composed-IPA render path (levels 2/4/5/7), where the
 * default IPA still comes out unclear on Chirp3-HD. Chosen by ear via scripts/tts-preview.js
 * against several candidates.
 *   - { text }        -> skip the forced <phoneme>; Chirp3-HD's own reading of this plain
 *                        (possibly respelled) text is clearer than the IPA render.
 *   - { ipa, text? }  -> use this IPA instead of the composed one; `text` is the SSML
 *                        fallback content (defaults to the original syllable).
 *   - { copyFrom }    -> reuse an already-generated, human-verified clip byte-for-byte
 *                        instead of synthesizing anything new (see `copyFrom` shape below).
 * `copyFrom` is handled directly in generate-audio.js's per-clip loop, before the
 * engine branches, so it applies to every engine including ElevenLabs. spokenFor()
 * itself has no file-copy path, so it ignores `copyFrom` and only ever reads `text`.
 * @type {Record<string, { ipa?: string, text?: string, copyFrom?: { level: number|string, text: string } }>}
 */
export const SYLLABLE_OVERRIDES = {
  // "em" should sound like the letter name "M" (Indonesian "ém"), same as Level 1's
  // letter tile. Re-synthesizing that plain text on Chirp3-HD is generative and once
  // came back near-silent for a voice — reuse the already-verified Level 1 "m" clip
  // byte-for-byte instead.
  em: { text: 'ém', copyFrom: { level: 1, text: 'm' } },
  // "top": composed IPA "top" drops the final /p/ release, sounding like "to". Doubling
  // the coda in the IPA forces an audible release.
  top: { ipa: 'topp', text: 'topp' },
  // "bung": composed IPA "buŋ" comes out mumbled — the coda /ŋ/ (velar nasal) alone
  // isn't distinct enough. Appending a /g/ release makes the "ng" audible without
  // changing the vowel or onset.
  bung: { ipa: 'buŋg', text: 'buŋg' }
};

/**
 * Per-letter overrides rendered on the MAIN (Chirp3-HD) voice instead of the Wavenet
 * spell-out, where spell-out is unclear. Value is either:
 *   - a string  -> plain text to speak (e.g. "ka")
 *   - { ipa, text?, rate? } -> SSML <phoneme> with that IPA. `text` is the fallback
 *     content, `rate` overrides the normal-variant speaking rate.
 * @type {Record<string, string | { ipa: string, text?: string, rate?: number, tries?: number, targetLen?: number }>}
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
  return SPOKEN_OVERRIDES[text] ?? SYLLABLE_OVERRIDES[text]?.text ?? text;
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
const C_IPA = /** @type {Record<string, string>} */ ({
  b: 'b', c: 'tʃ', d: 'd', f: 'f', g: 'g', h: 'h', j: 'dʒ', k: 'k', l: 'l',
  m: 'm', n: 'n', p: 'p', r: 'r', s: 's', t: 't', v: 'f', w: 'w', y: 'j', z: 'z'
});
/** Vowel -> IPA. "e" = /e/ (é), the early-reading sound. */
const V_IPA = /** @type {Record<string, string>} */ ({ a: 'a', i: 'i', u: 'u', e: 'e', o: 'o' });
/**
 * Diphthongs (pack 5 "diftong" + susun tiles like "lau", "ngai") -> IPA. The off-glide
 * carries the non-syllabic mark so the pair is one glide, not two vowels: plain TTS reads
 * "au"/"ei" as split vowels, which is wrong.
 */
const DIPHTHONG_IPA = /** @type {Record<string, string>} */ ({ ai: 'ai̯', au: 'au̯', ei: 'ei̯', oi: 'oi̯' });
/** Two-letter onsets (digraphs) -> IPA. */
const DIGRAPH_IPA = /** @type {Record<string, string>} */ ({ ng: 'ŋ', ny: 'ɲ', kh: 'x', sy: 'ʃ' });

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
  // optional onset — digraph first, else a single consonant. A second r/l is an
  // onset cluster (pra, tri, kru, gre, blo, kli), not a coda before the vowel.
  if (DIGRAPH_IPA[t.slice(0, 2)]) {
    out += DIGRAPH_IPA[t.slice(0, 2)];
    i = 2;
  } else if (C_IPA[t[0]]) {
    out += C_IPA[t[0]];
    i = 1;
    if ((t[i] === 'r' || t[i] === 'l') && C_IPA[t[i]]) {
      out += C_IPA[t[i]];
      i += 1;
    }
  }
  // required vowel — may be a diphthong (ai/au/ei/oi), kept as one glide
  const pair = t.slice(i, i + 2);
  if (DIPHTHONG_IPA[pair]) {
    out += DIPHTHONG_IPA[pair];
    i += 2;
  } else if (V_IPA[t[i]]) {
    out += V_IPA[t[i]];
    i += 1;
  } else {
    return null;
  }
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
