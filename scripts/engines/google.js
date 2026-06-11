/**
 * Google Cloud Text-to-Speech engine adapter.
 *
 * Auth: set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON key path,
 * or run `gcloud auth application-default login`. Requires the optional dependency
 * `@google-cloud/text-to-speech` (already in package.json optionalDependencies).
 */
let client = null;

async function getClient() {
  if (client) return client;
  const mod = await import('@google-cloud/text-to-speech');
  const TextToSpeechClient = mod.default?.TextToSpeechClient ?? mod.TextToSpeechClient;
  client = new TextToSpeechClient();
  return client;
}

/** @type {import('../generate-audio.js').TtsEngine} */
export const googleEngine = {
  id: 'google',
  /**
   * @param {string} text
   * @param {string} engineVoice e.g. "id-ID-Standard-A"
   * @param {{ speakingRate?: number, pitch?: number, ssml?: string|null }} [opts]
   * @returns {Promise<Buffer>}
   */
  async synthesize(text, engineVoice, opts = {}) {
    const c = await getClient();
    const [resp] = await c.synthesizeSpeech({
      input: opts.ssml ? { ssml: opts.ssml } : { text },
      voice: { languageCode: 'id-ID', name: engineVoice },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: opts.speakingRate ?? 0.9,
        pitch: opts.pitch ?? 0
      }
    });
    return Buffer.from(resp.audioContent);
  }
};
