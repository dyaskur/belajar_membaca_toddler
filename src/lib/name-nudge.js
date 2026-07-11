import { tick } from 'svelte';

export const NAME_NUDGE = 'Silakan tulis namamu dulu.';

/**
 * @typedef {(show: boolean, shake: boolean) => void} SetNameNudge
 */

/** @param {SetNameNudge} setNameNudge */
export function clearNameNudgeState(setNameNudge) {
  setNameNudge(false, false);
}

/**
 * @param {{
 *   setNameNudge: SetNameNudge,
 *   focusInput?: () => void,
 *   speak: (text: string) => Promise<unknown>
 * }} options
 */
export async function nudgeNameInput({ setNameNudge, focusInput, speak }) {
  setNameNudge(true, false);
  await tick();
  setNameNudge(true, true);
  focusInput?.();
  await speak(NAME_NUDGE);
}
