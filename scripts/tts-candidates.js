/**
 * Render several pronunciation candidates per syllable into static/preview/, plus a
 * manifest the /preview page reads. Writes ONLY to static/preview/ — the real audio in
 * static/audio/** is never touched (delete static/preview/ anytime).
 *
 * Needs Google creds (same as generate:audio). Usage:
 *   node --env-file-if-exists=.env scripts/tts-candidates.js            # defaults: to tang
 *   node --env-file-if-exists=.env scripts/tts-candidates.js to tang nga je
 *   node --env-file-if-exists=.env scripts/tts-candidates.js to --voice=pak-budi
 * Then open /preview in the running app to listen and pick.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOICES } from '../src/lib/content/voices.js';
import { syllableIPA } from '../src/lib/content/pronunciation.js';
import { googleEngine } from './engines/google.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'static', 'preview');

const args = process.argv.slice(2);
const voiceId = (args.find((a) => a.startsWith('--voice=')) ?? '--voice=ibu-dewi').split('=')[1];
const syls = args.filter((a) => !a.startsWith('--'));
if (!syls.length) syls.push('to', 'tang');

const voice = VOICES.find((v) => v.id === voiceId);
if (!voice || voice.engine !== 'google') {
  console.error(`Need a Google voice; "${voiceId}" not found or not Google.`);
  process.exit(1);
}

const SLOW = 0.6;
const NORMAL = 0.9;
const openVowels = (ipa) => ipa.replace(/o/g, 'ɔ').replace(/e/g, 'ɛ'); // o,e more open
const backA = (ipa) => ipa.replace(/a/g, 'ɑ'); // a further back

/** @param {string} syl */
function candidatesFor(syl) {
  const base = syllableIPA(syl) ?? syl;
  /** @type {[string, string, { ipa?: string, text?: string, rate: number }][]} */
  const list = [
    ['A', 'IPA, slow (current render)', { ipa: base, rate: SLOW }],
    ['B', 'IPA, normal speed (is the slow rate the problem?)', { ipa: base, rate: NORMAL }],
    ['C', 'open vowels o→ɔ, e→ɛ, slow', { ipa: openVowels(base), rate: SLOW }],
    ['D', 'back "a" a→ɑ, slow', { ipa: backA(base), rate: SLOW }],
    ['E', 'plain text, slow', { text: syl, rate: SLOW }],
    ['F', 'plain text, normal speed', { text: syl, rate: NORMAL }]
  ];
  const seen = new Set();
  return list.filter(([, , c]) => {
    const k = (c.ipa ? 'i:' + c.ipa : 't:' + c.text) + '@' + c.rate;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

await mkdir(OUT, { recursive: true });
const manifest = { voice: voiceId, syllables: /** @type {any[]} */ ([]) };

for (const syl of syls) {
  const out = [];
  for (const [label, desc, c] of candidatesFor(syl)) {
    const ssml = c.ipa ? `<speak><phoneme alphabet="ipa" ph="${c.ipa}">${syl}</phoneme></speak>` : null;
    const input = c.text ?? syl;
    const file = `cand-${syl}-${label}.mp3`;
    try {
      const buf = await googleEngine.synthesize(input, voice.engineVoice, { speakingRate: c.rate, ssml });
      await writeFile(join(OUT, file), buf);
      out.push({ label, desc, file, ipa: c.ipa ?? null, text: c.ipa ? null : input, rate: c.rate });
      console.log(`+ ${syl} ${label}  ${c.ipa ? 'ipa=' + c.ipa : '"' + input + '"'} rate=${c.rate}`);
    } catch (err) {
      console.error(`x ${syl} ${label}:`, err?.message ?? err);
    }
  }
  manifest.syllables.push({ syl, candidates: out });
}

await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nWrote ${manifest.syllables.length} syllables -> static/preview/manifest.json. Open /preview in the app.`);
