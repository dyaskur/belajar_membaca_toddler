/**
 * Voice manifest. Each voice maps to a TTS engine + an engine-specific voice id.
 * Adding a speaker = add an entry here, then run `npm run generate:audio`.
 *
 * @typedef {Object} Voice
 * @property {string} id        Internal id, used in audio paths: static/audio/{id}/...
 * @property {string} label     Shown to the parent when choosing a speaker.
 * @property {string} engine    TTS engine key (see src/lib/tts/engines).
 * @property {string} engineVoice Engine-specific voice name.
 * @property {'female'|'male'} gender
 */

/** @type {Voice[]} */
export const VOICES = [
  {
    id: 'ibu-dewi',
    label: 'Ibu Dewi',
    engine: 'google',
    engineVoice: 'id-ID-Chirp3-HD-Aoede',
    gender: 'female'
  },
  {
    id: 'pak-budi',
    label: 'Pak Budi',
    engine: 'google',
    engineVoice: 'id-ID-Chirp3-HD-Charon',
    gender: 'male'
  },
  {
    id: 'kakak-sari',
    label: 'Kakak Sari',
    engine: 'google',
    engineVoice: 'id-ID-Chirp3-HD-Leda',
    gender: 'female'
  }
];

/** The voice bundled with the app so the first launch works offline instantly. */
export const DEFAULT_VOICE_ID = 'ibu-dewi';

/** @param {string} id */
export function getVoice(id) {
  return VOICES.find((v) => v.id === id) ?? VOICES[0];
}
