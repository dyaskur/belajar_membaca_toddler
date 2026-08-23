import { player } from './player.svelte.js';

/**
 * Speak a Cari Kata catalog word, preferring its whole-word recording and
 * falling back to the level-2 syllable clips. The validity check runs after
 * preload so callers can cancel speech while manifests are still loading.
 *
 * @param {string} voiceId
 * @param {import('$lib/content/kata-catalog.js').CatalogWord} entry
 * @param {() => boolean} [isCurrent]
 */
export async function speakCatalogWord(voiceId, entry, isCurrent = () => true) {
  await Promise.all([
    player.ensureLevel(voiceId, 2),
    player.ensureLevel(voiceId, 'cari-kata')
  ]);
  if (!isCurrent()) return;
  if (player.variantCount(voiceId, 'cari-kata', entry.w) > 0) {
    return player.speak(voiceId, 'cari-kata', entry.w);
  }
  return player.speakChain(voiceId, 2, entry.syl, 70);
}
