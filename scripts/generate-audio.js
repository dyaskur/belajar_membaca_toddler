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
import { teachTextsForLevel } from '../src/lib/content/teach.js';
import {
  spokenFor,
  syllableIPA,
  LETTER_OVERRIDES,
  LETTER_NAMES
} from '../src/lib/content/pronunciation.js';
import { PICTURE_WORDS } from '../src/lib/content/words.js';
import { susunLeadIn, susunSyllables, susunSyllableList } from '../src/lib/content/menulis.js';
import { ABJAD } from '../src/lib/content/abjad.js';
import { SPEAK_TRY } from '../src/lib/content/feedback.js';
import { variantStem } from '../src/lib/audio/slug.js';
import { googleEngine } from './engines/google.js';
import { elevenLabsEngine } from './engines/elevenlabs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'static', 'audio');

/** Registry of engines. Add new engines here. */
const ENGINES = /** @type {Record<string, TtsEngine>} */ ({
  [googleEngine.id]: googleEngine,
  [elevenLabsEngine.id]: elevenLabsEngine
});

// Extra always-included phrases (voice-preview greeting, empty-name nudge).
const EXTRA_TEXTS = ['Halo, ayo belajar membaca!', 'Silakan tulis namamu dulu.'];

// Target items get multiple renderings so a child can hear a clearer take on replay.
// Index maps to the runtime `variant` number. Feedback/intros use only variant 0.
const TARGET_VARIANTS = [
  { speakingRate: 0.9 }, // 0: normal
  { speakingRate: 0.6 } // 1: slow & clear
];

// Levels whose item targets are syllables → rendered on Chirp3-HD via SSML <phoneme> IPA.
// L2 = CV syllables, L5 = digraph syllables (nga, nyi, kha, syu).
const SYLLABLE_LEVELS = new Set([2, 5]);

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
      const aux = new Set([
        ...feedbackTextsForLevel(level.id),
        ...promptsForLevel(level.id),
        ...teachTextsForLevel(level.id)
      ]);
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
          if (voice.engine !== 'google') {
            // Engines without SSML (ElevenLabs): plain text only. Letters use their
            // Indonesian name; syllables/words/feedback go through as-is.
            const say = mode === 'letter' ? LETTER_NAMES[text] ?? text : spokenFor(text);
            buf = await engine.synthesize(say, voice.engineVoice, opts);
          } else if (mode === 'letter' && LETTER_OVERRIDES[text]) {
            // Clearer override on the main Chirp3-HD voice: plain text ("k"->"ka") or
            // an IPA phoneme ("r" -> ph="ər").
            const ov = LETTER_OVERRIDES[text];
            if (typeof ov === 'string') {
              buf = await engine.synthesize(ov, voice.engineVoice, opts);
            } else {
              const content = ov.text ?? text;
              const ssml = `<speak><phoneme alphabet="ipa" ph="${ov.ipa}">${content}</phoneme></speak>`;
              // `rate` overrides only the normal variant (slow variant keeps its rate).
              const speakingRate = variant === 0 && ov.rate ? ov.rate : opts.speakingRate;
              const o = { ...opts, speakingRate, ssml };
              if (ov.tries && ov.targetLen) {
                // Generative voice varies; keep the render closest to the approved length.
                for (let t = 0; t < ov.tries; t++) {
                  const cand = await engine.synthesize(text, voice.engineVoice, o);
                  if (!buf || Math.abs(cand.length - ov.targetLen) < Math.abs(buf.length - ov.targetLen))
                    buf = cand;
                }
                console.log(`  (${text}: picked ${buf.length} bytes)`);
              } else {
                buf = await engine.synthesize(text, voice.engineVoice, o);
              }
            }
          } else if (mode === 'letter') {
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

    // "Ucapkan" speaking words — their own bucket (not a level), plain Chirp3-HD,
    // both variants so the app can model the word (normal + slow) when a child misses.
    if (!onlyLevel) {
      const dir = join(OUT, voice.id, 'words');
      await mkdir(dir, { recursive: true });
      /** @type {Set<string>} */
      const stems = new Set();
      // word audio (normal + slow) — used elsewhere if needed
      for (const pw of PICTURE_WORDS) {
        for (let v = 0; v < TARGET_VARIANTS.length; v++) {
          const stem = variantStem(pw.w, v);
          stems.add(stem);
          const file = join(dir, `${stem}.mp3`);
          if (existsSync(file)) {
            skipped++;
            continue;
          }
          try {
            const buf = await engine.synthesize(pw.w, voice.engineVoice, TARGET_VARIANTS[v]);
            await writeFile(file, buf);
            made++;
            console.log(`+ ${voice.id}/words/${stem}.mp3  "${pw.w}"`);
          } catch (err) {
            console.error(`x failed ${voice.id}/words "${pw.w}":`, err?.message ?? err);
          }
        }
      }
      // Susun-mode instruction (words bucket): lead-in at normal speed, then the
      // syllables at the slow variant (rate 0.6) so "mo, bil" is slower with a gap.
      // On Google the syllables use per-syllable IPA <phoneme> + a <break>, so closed
      // syllables read as Indonesian (e.g. "tang" = /taŋ/, not English "tank").
      for (const pw of PICTURE_WORDS) {
        const lead = susunLeadIn(pw.w);
        const syl = susunSyllables(pw.w);
        /** @type {{ text: string, v: number, ssml?: string }[]} */
        const parts = [{ text: lead, v: 0 }];
        if (voice.engine === 'google') {
          const inner = susunSyllableList(pw.w)
            .map((s) => {
              const ipa = syllableIPA(s);
              return ipa ? `<phoneme alphabet="ipa" ph="${ipa}">${s}</phoneme>` : s;
            })
            .join(' <break time="75ms"/> ');
          parts.push({ text: syl, v: 1, ssml: `<speak>${inner}</speak>` });
        } else {
          parts.push({ text: syl, v: 1 }); // ElevenLabs: no SSML, plain "mo, bil"
        }
        for (const { text, v, ssml } of parts) {
          const stem = variantStem(text, v);
          stems.add(stem);
          const file = join(dir, `${stem}.mp3`);
          if (existsSync(file)) {
            skipped++;
            continue;
          }
          try {
            const opts = ssml ? { ...TARGET_VARIANTS[v], ssml } : TARGET_VARIANTS[v];
            const buf = await engine.synthesize(spokenFor(text), voice.engineVoice, opts);
            await writeFile(file, buf);
            made++;
            console.log(`+ ${voice.id}/words/${stem}.mp3  "${text}"${ssml ? ' [ipa]' : ''}`);
          } catch (err) {
            console.error(`x failed ${voice.id}/words "${text}":`, err?.message ?? err);
          }
        }
      }

      // speaking-activity encouragement (does NOT reveal the word)
      for (const phrase of SPEAK_TRY) {
        const stem = variantStem(phrase, 0);
        stems.add(stem);
        const file = join(dir, `${stem}.mp3`);
        if (existsSync(file)) {
          skipped++;
          continue;
        }
        try {
          const buf = await engine.synthesize(phrase, voice.engineVoice, TARGET_VARIANTS[0]);
          await writeFile(file, buf);
          made++;
          console.log(`+ ${voice.id}/words/${stem}.mp3  "${phrase}"`);
        } catch (err) {
          console.error(`x failed ${voice.id}/words "${phrase}":`, err?.message ?? err);
        }
      }
      const present = [...stems].filter((s) => existsSync(join(dir, `${s}.mp3`)));
      if (present.length) {
        await writeFile(
          join(dir, 'pack.json'),
          JSON.stringify({ voice: voice.id, level: 'words', files: present }, null, 2)
        );
      }
    }

    // "Abjad A–Z" object words — their own bucket (not a level), plain Chirp3-HD, both
    // variants. Letters reuse the Level-1 letter-name clips. `spokenFor` applies the
    // quran→"Qur'an" override.
    if (!onlyLevel) {
      const dir = join(OUT, voice.id, 'abjad');
      await mkdir(dir, { recursive: true });
      /** @type {Set<string>} */
      const stems = new Set();
      for (const { word } of ABJAD) {
        for (let v = 0; v < TARGET_VARIANTS.length; v++) {
          const stem = variantStem(word, v);
          stems.add(stem);
          const file = join(dir, `${stem}.mp3`);
          if (existsSync(file)) {
            skipped++;
            continue;
          }
          try {
            const buf = await engine.synthesize(spokenFor(word), voice.engineVoice, TARGET_VARIANTS[v]);
            await writeFile(file, buf);
            made++;
            console.log(`+ ${voice.id}/abjad/${stem}.mp3  "${word}"`);
          } catch (err) {
            console.error(`x failed ${voice.id}/abjad "${word}":`, err?.message ?? err);
          }
        }
      }
      const present = [...stems].filter((s) => existsSync(join(dir, `${s}.mp3`)));
      if (present.length) {
        await writeFile(
          join(dir, 'pack.json'),
          JSON.stringify({ voice: voice.id, level: 'abjad', files: present }, null, 2)
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
