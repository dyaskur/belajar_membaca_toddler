/**
 * Question intros, spoken before the target so the child hears a real question:
 *   [random intro]  +  [target]   ->   "Yang mana huruf" + "ce"
 *
 * Intros are standalone clips (generated per voice/level by the audio pipeline) and the
 * target clip is reused — so the "Dengar lagi" button can replay the target alone.
 * One intro is chosen at random each time a question is asked. Edit / expand freely.
 */

/** @type {Record<number, string[]>} */
const INTROS = {
  1: ['Yang mana huruf', 'Mana huruf', 'Tunjukkan huruf', 'Coba cari huruf'],
  2: ['Yang mana suku kata', 'Mana bunyi', 'Tunjukkan suku kata', 'Coba cari bunyi'],
  3: ['Yang mana kata', 'Mana tulisan', 'Tunjukkan kata', 'Coba cari kata'],
  4: ['Yang mana suku kata', 'Mana suku kata', 'Tunjukkan suku kata', 'Coba cari'],
  5: ['Yang mana bunyi', 'Mana bunyi', 'Tunjukkan bunyi', 'Coba cari bunyi'],
  6: ['Yang mana kalimat', 'Mana kalimat', 'Tunjukkan kalimat']
};

const FALLBACK = ['Yang mana', 'Mana', 'Tunjukkan', 'Coba cari'];

/**
 * @param {number} level
 * @returns {string[]}
 */
export function promptsForLevel(level) {
  return INTROS[level] ?? FALLBACK;
}
