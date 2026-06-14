/**
 * ElevenLabs Text-to-Speech engine adapter.
 *
 * Auth: set ELEVENLABS_API_KEY. The `engineVoice` is an ElevenLabs voice_id.
 * Uses the multilingual model (supports Indonesian). No SSML — plain text only, so the
 * generator must hand this engine already-spellable text (no say-as / phoneme).
 */
const MODEL = 'eleven_multilingual_v2';

/** @type {import('../generate-audio.js').TtsEngine} */
export const elevenLabsEngine = {
  id: 'elevenlabs',
  /**
   * @param {string} text
   * @param {string} engineVoice  ElevenLabs voice_id
   * @param {{ speakingRate?: number }} [opts]
   * @returns {Promise<Buffer>}
   */
  async synthesize(text, engineVoice, opts = {}) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error('ELEVENLABS_API_KEY not set');
    // ElevenLabs "speed" supports ~0.7–1.2; map our speakingRate (0.6 slow .. 0.9 normal).
    const speed = Math.min(1.2, Math.max(0.7, opts.speakingRate ?? 1.0));
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${engineVoice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.8, speed }
      })
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
};

/** List the account's voices (id + name + labels) — used to pick a child voice. */
export async function listVoices() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY not set');
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': key }
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name, labels: v.labels }));
}
