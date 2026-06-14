/**
 * Voice manifest. Each voice maps to a TTS engine + an engine-specific voice id.
 * Adding a speaker = add an entry here, then run `npm run generate:audio`.
 *
 * @typedef {Object} Voice
 * @property {string} id        Internal id, used in audio paths: static/audio/{id}/...
 * @property {string} label     Shown to the parent when choosing a speaker.
 * @property {string} engine    TTS engine key (see src/lib/tts/engines).
 * @property {string} engineVoice Engine-specific voice name / id.
 * @property {string} [letterVoice] (Google only) gender-matched Wavenet voice for Level-1
 *                                letters via SSML spell-out. Not used by non-Google engines.
 * @property {'female'|'male'} gender
 */

/** @type {Voice[]} */
export const VOICES = [
  {
    id: 'ibu-dewi',
    label: 'Ibu Dewi',
    engine: 'google',
    engineVoice: 'id-ID-Chirp3-HD-Aoede',
    letterVoice: 'id-ID-Wavenet-A',
    gender: 'female'
  },
  {
    id: 'pak-budi',
    label: 'Pak Budi',
    engine: 'google',
    engineVoice: 'id-ID-Chirp3-HD-Charon',
    letterVoice: 'id-ID-Wavenet-B',
    gender: 'male'
  },
  {
    id: 'kakak-sari',
    label: 'Kakak Sari',
    engine: 'google',
    engineVoice: 'id-ID-Chirp3-HD-Leda',
    letterVoice: 'id-ID-Wavenet-D',
    gender: 'female'
  },
  {
    // ElevenLabs young-male voice (English accent on Indonesian — free-plan limitation).
    id: 'kak-charlie',
    label: 'Kak Charlie',
    engine: 'elevenlabs',
    engineVoice: 'IKne3meq5aSn9XLyUdCD',
    gender: 'male'
  }
];

/** The voice bundled with the app so the first launch works offline instantly. */
export const DEFAULT_VOICE_ID = 'ibu-dewi';

/** @param {string} id */
export function getVoice(id) {
  return VOICES.find((v) => v.id === id) ?? VOICES[0];
}
