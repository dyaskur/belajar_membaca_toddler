/**
 * Runtime platform detection.
 *
 * The same bundle runs as the web PWA and inside the Android (Capacitor) shell. The
 * only behavioural difference is where audio comes from: the web build serves it from
 * its own origin, the Android build ships without audio and downloads packs on demand.
 */
import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';

/** True only inside the Capacitor native shell (Android). False for the web PWA. */
export const isNative = browser && Capacitor.isNativePlatform();

/** Native platform name — 'android', 'ios' or 'web'. */
export const platform = browser ? Capacitor.getPlatform() : 'web';
