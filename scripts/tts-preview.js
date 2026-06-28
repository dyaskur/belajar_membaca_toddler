/**
 * Listen to a single syllable's IPA render WITHOUT touching any committed audio.
 * Writes only to /tmp, so static/audio/** is never modified — safe to run anytime.
 *
 * Renders exactly like the Susun syllable clip: Chirp3-HD + <phoneme> IPA at the slow
 * variant rate (0.6), so what you hear is what generate:audio would produce.
 *
 * Usage (needs your Google creds, same as generate:audio):
 *   node --env-file-if-exists=.env scripts/tts-preview.js to
 *   node --env-file-if-exists=.env scripts/tts-preview.js to pi tang nga       # several
 *   node --env-file-if-exists=.env scripts/tts-preview.js to --voice=pak-budi  # other voice
 * Then open the printed /tmp/preview-*.mp3 files.
 */
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VOICES } from '../src/lib/content/voices.js';
import { syllableIPA } from '../src/lib/content/pronunciation.js';
import { googleEngine } from './engines/google.js';

const args = process.argv.slice(2);
const voiceId = (args.find((a) => a.startsWith('--voice=')) ?? '--voice=ibu-dewi').split('=')[1];
const syls = args.filter((a) => !a.startsWith('--'));
if (!syls.length) syls.push('to');

const voice = VOICES.find((v) => v.id === voiceId);
if (!voice || voice.engine !== 'google') {
  console.error(`Need a Google voice; "${voiceId}" not found or not Google.`);
  process.exit(1);
}

for (const s of syls) {
  const ipa = syllableIPA(s);
  const ssml = ipa ? `<speak><phoneme alphabet="ipa" ph="${ipa}">${s}</phoneme></speak>` : null;
  try {
    const buf = await googleEngine.synthesize(s, voice.engineVoice, { speakingRate: 0.6, ssml });
    const out = join(tmpdir(), `preview-${voiceId}-${s}.mp3`);
    await writeFile(out, buf);
    console.log(`${s.padEnd(6)} ipa=${ipa ?? '(plain)'}   ->  ${out}`);
  } catch (err) {
    console.error(`x "${s}":`, err?.message ?? err);
  }
}
