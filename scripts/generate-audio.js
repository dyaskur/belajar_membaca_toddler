/**
 * Build-time TTS generator. Generates audio ONCE per (voice, level, text) and writes:
 *   static/audio/{voiceId}/{level}/{slug}.mp3
 *   static/audio/{voiceId}/{level}/pack.json   ->  { files: string[] }   (slugs)
 *
 * Skip-if-exists: existing mp3s are not regenerated, so re-running is cheap and safe.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=key.json npm run generate:audio
 *   npm run generate:audio -- --voice=ibu-dewi --level=1   (filter)
 *
 * @typedef {Object} TtsEngine
 * @property {string} id
 * @property {(text: string, engineVoice: string) => Promise<Buffer>} synthesize
 */
import { mkdir, writeFile, access, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VOICES } from '../src/lib/content/voices.js';
import { LEVELS } from '../src/lib/content/levels.js';
import { feedbackTextsForLevel } from '../src/lib/content/feedback.js';
import { promptsForLevel } from '../src/lib/content/prompts.js';
import { spokenFor, syllableIPA } from '../src/lib/content/pronunciation.js';
import { variantStem } from '../src/lib/audio/slug.js';
import { googleEngine } from './engines/google.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'static', 'audio');

/** Registry of engines. Add new engines here. */
const ENGINES = /** @type {Record<string, TtsEngine>} */ ({
  [googleEngine.id]: googleEngine
});

// Extra always-included phrases (greeting used in the voice preview).
const EXTRA_TEXTS = ['Halo, ayo belajar membaca!'];

// Target items get multiple renderings so a child can hear a clearer take on replay.
// Index maps to the runtime `variant` number. Feedback/intros use only variant 0.
const TARGET_VARIANTS = [
  { speakingRate: 0.9 }, // 0: normal
  { speakingRate: 0.6 } // 1: slow & clear
];

// Levels whose item targets are syllables → rendered on Chirp3-HD via SSML <phoneme> IPA.
const SYLLABLE_LEVELS = new Set([2]);

/** @param {string} flag */
function arg(flag) {
  const f = process.argv.find((a) => a.startsWith(`--${flag}=`));
  return f ? f.split('=')[1] : null;
}

async function main() {
  const onlyVoice = arg('voice');
  const onlyLevel = arg('level') ? Number(arg('level')) : null;

  let made = 0;
  let skipped = 0;

  for (const voice of VOICES) {
    if (onlyVoice && voice.id !== onlyVoice) continue;
    const engine = ENGINES[voice.engine];
    if (!engine) {
      console.warn(`! No engine "${voice.engine}" for voice ${voice.id}, skipping`);
      continue;
    }

    for (const level of LEVELS) {
      if (onlyLevel && level.id !== onlyLevel) continue;

      const dir = join(OUT, voice.id, String(level.id));
      await mkdir(dir, { recursive: true });

      // Build the job list. Targets (items) get every variant; aux texts (feedback,
      // intros, extras) get only variant 0. Item targets carry a render `mode`:
      //   'letter'   (Level 1)  -> Wavenet + SSML spell-out (Chirp3-HD anglicizes letters)
      //   'syllable' (Level 2)  -> Chirp3-HD + SSML <phoneme> IPA (correct /e/, c, j, ...)
      //   'plain'    (other)    -> Chirp3-HD plain text
      const itemMode = level.id === 1 ? 'letter' : SYLLABLE_LEVELS.has(level.id) ? 'syllable' : 'plain';
      /** @type {{ text: string, variant: number, opts: object, mode: string }[]} */
      const jobs = [];
      for (const item of level.items()) {
        TARGET_VARIANTS.forEach((opts, v) =>
          jobs.push({ text: item.text, variant: v, opts, mode: itemMode })
        );
      }
      const aux = new Set([...feedbackTextsForLevel(level.id), ...promptsForLevel(level.id)]);
      if (level.id === 1) for (const t of EXTRA_TEXTS) aux.add(t);
      for (const text of aux) jobs.push({ text, variant: 0, opts: TARGET_VARIANTS[0], mode: 'plain' });

      /** @type {Set<string>} */
      const stems = new Set();
      for (const { text, variant, opts, mode } of jobs) {
        const stem = variantStem(text, variant);
        stems.add(stem);
        const file = join(dir, `${stem}.mp3`);
        if (existsSync(file)) {
          skipped++;
          continue;
        }
        try {
          let buf;
          const ipa = mode === 'syllable' ? syllableIPA(text) : null;
          if (mode === 'letter') {
            // Spell-out the letter as an Indonesian character name, via Wavenet.
            const ch = text.replace(/[<&>]/g, '');
            const ssml = `<speak><say-as interpret-as="characters">${ch}</say-as></speak>`;
            buf = await engine.synthesize(text, voice.letterVoice, { ...opts, ssml });
          } else if (ipa) {
            // Force the exact Indonesian syllable sound on Chirp3-HD.
            const ssml = `<speak><phoneme alphabet="ipa" ph="${ipa}">${text}</phoneme></speak>`;
            buf = await engine.synthesize(text, voice.engineVoice, { ...opts, ssml });
          } else {
            buf = await engine.synthesize(spokenFor(text), voice.engineVoice, opts);
          }
          await writeFile(file, buf);
          made++;
          const tag = mode === 'letter' ? ' [letter]' : ipa ? ` [ipa:${ipa}]` : '';
          console.log(`+ ${voice.id}/${level.id}/${stem}.mp3  "${text}"${tag}`);
        } catch (err) {
          console.error(`x failed ${voice.id}/${level.id} "${text}":`, err?.message ?? err);
        }
      }

      // Write the pack manifest listing ONLY clips that exist on disk, so the runtime
      // falls back to speech synthesis for anything not yet generated.
      const present = [...stems].filter((s) => existsSync(join(dir, `${s}.mp3`)));
      if (present.length) {
        await writeFile(
          join(dir, 'pack.json'),
          JSON.stringify({ voice: voice.id, level: level.id, files: present }, null, 2)
        );
      }
    }
  }

  console.log(`\nDone. Generated ${made}, skipped ${skipped} existing.`);
  if (made === 0 && skipped === 0) {
    console.log('Nothing generated — check credentials / @google-cloud/text-to-speech install.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
