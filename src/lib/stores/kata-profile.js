/** Pure Cari Kata profile mutations, kept separate so migration and per-profile
 * isolation can be verified without a browser or Svelte rune runtime. */

/** @param {Record<string, any>} profile */
export function normalizeKataProfile(profile) {
  profile.kataWords ??= [];
  profile.kataWordsSeen ??= [];
  profile.kataBonusCount = Number.isFinite(profile.kataBonusCount) ? profile.kataBonusCount : 0;
  if (!['mudah', 'sedang', 'sulit'].includes(profile.cariKataLevel)) profile.cariKataLevel = 'mudah';
  return profile;
}

/** @param {Record<string, any>} profile @param {string} word */
export function addKataWordToProfile(profile, word) {
  normalizeKataProfile(profile);
  if (profile.kataWords.includes(word)) return false;
  profile.kataWords.push(word);
  return true;
}

/** @param {Record<string, any>} profile @param {string} word */
export function markKataWordSeenOnProfile(profile, word) {
  normalizeKataProfile(profile);
  if (!profile.kataWords.includes(word) || profile.kataWordsSeen.includes(word)) return false;
  profile.kataWordsSeen.push(word);
  return true;
}

/** @param {Record<string, any>} profile */
export function incrementKataBonus(profile) {
  normalizeKataProfile(profile);
  profile.kataBonusCount++;
}

/** @param {Record<string, any>} profile @param {string} level */
export function setKataLevel(profile, level) {
  normalizeKataProfile(profile);
  if (!['mudah', 'sedang', 'sulit'].includes(level)) return false;
  profile.cariKataLevel = level;
  return true;
}
