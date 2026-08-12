/**
 * On-demand audio pack downloader for the Android build.
 *
 * The APK ships with no clips at all (see `scripts/build-android.js`), so every pack —
 * one voice's clips for one level/bucket — is fetched from `AUDIO_CDN` the first time it
 * is needed and stored in the app's private data directory. Downloads resume: a pack is
 * only marked complete once every clip landed, and already-present clips are skipped.
 *
 * On the web this module is inert; the PWA keeps serving audio from its own origin.
 */
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { FileTransfer } from '@capacitor/file-transfer';
import { AUDIO_CDN, AUDIO_V } from './config.js';
import { isNative } from '$lib/native/platform.js';

/** Parallel clip downloads. Clips are small (~10 KB), so the win is in hiding latency. */
const CONCURRENCY = 6;
/** Per-clip network timeouts (ms) — a stalled clip must not wedge the whole pack. */
const TIMEOUT = 20000;
/** Marker file holding the manifest + AUDIO_V a pack was completed at. */
const MARKER = '.pack.json';

/**
 * @typedef {'idle'|'downloading'|'ready'|'error'} PackStatus
 * @typedef {Object} PackState
 * @property {PackStatus} status
 * @property {number} done   Clips present locally.
 * @property {number} total  Clips the pack contains (0 until the manifest is known).
 * @property {boolean} partial  Ready, but some clips failed — retried on next open.
 */

/** @param {string} voiceId @param {number|string} level */
export function packKey(voiceId, level) {
  return `${voiceId}/${level}`;
}

/** @returns {PackState} */
function freshState() {
  return { status: 'idle', done: 0, total: 0, partial: false };
}

class AudioDownloader {
  /** packKey -> reactive progress, read by the download UI. */
  #packs = $state(/** @type {Record<string, PackState>} */ ({}));
  /** packKey -> in-flight ensurePack promise, so concurrent callers share one download. */
  #inflight = new Map();
  /** packKey -> clip stems the pack contains. */
  #manifests = new Map();
  /** packKey -> WebView-readable base URL for the pack's directory. */
  #bases = new Map();

  /**
   * Reactive progress for a pack. Always returns an object so templates can read it
   * before the download starts.
   * @param {string} voiceId @param {number|string} level
   * @returns {PackState}
   */
  state(voiceId, level) {
    const key = packKey(voiceId, level);
    return this.#packs[key] ?? freshState();
  }

  /** @param {string} voiceId @param {number|string} level */
  isReady(voiceId, level) {
    return this.#packs[packKey(voiceId, level)]?.status === 'ready';
  }

  /**
   * Aggregate progress across several packs — drives the first-launch screen.
   * @param {string} voiceId @param {(number|string)[]} levels
   */
  progressFor(voiceId, levels) {
    let done = 0;
    let total = 0;
    let downloading = false;
    let error = false;
    for (const level of levels) {
      const st = this.state(voiceId, level);
      done += st.done;
      total += st.total;
      if (st.status === 'downloading' || st.status === 'idle') downloading = true;
      if (st.status === 'error') error = true;
    }
    return { done, total, downloading, error, ratio: total ? done / total : 0 };
  }

  /**
   * Clip stems a downloaded pack contains, or null when it has not been read yet.
   * @param {string} voiceId @param {number|string} level
   * @returns {Set<string>|null}
   */
  manifest(voiceId, level) {
    return this.#manifests.get(packKey(voiceId, level)) ?? null;
  }

  /**
   * Local (WebView-readable) URL for a downloaded clip, or null when the pack has not
   * been downloaded. The caller falls back to the network or speech synthesis.
   * @param {string} voiceId @param {number|string} level @param {string} stem
   */
  srcFor(voiceId, level, stem) {
    const base = this.#bases.get(packKey(voiceId, level));
    return base ? `${base}/${stem}.mp3` : null;
  }

  /**
   * Remote URL for a clip — the fallback when a pack is not downloaded yet. Null when no
   * CDN is configured, so callers degrade to speech synthesis rather than requesting a
   * relative path the WebView would answer with its own 404 page.
   * @param {string} voiceId @param {number|string} level @param {string} stem
   * @returns {string|null}
   */
  remoteSrc(voiceId, level, stem) {
    if (!AUDIO_CDN) return null;
    return `${AUDIO_CDN}/audio/${voiceId}/${level}/${stem}.mp3?${AUDIO_V}`;
  }

  /**
   * Download a pack if it is not already on disk. Safe to call repeatedly and from
   * several places at once — concurrent callers await the same download.
   * @param {string} voiceId @param {number|string} level
   * @returns {Promise<boolean>} true when the pack is usable (even if partially).
   */
  ensurePack(voiceId, level) {
    if (!isNative) return Promise.resolve(true);
    const key = packKey(voiceId, level);
    if (this.#packs[key]?.status === 'ready' && !this.#packs[key].partial) {
      return Promise.resolve(true);
    }
    const running = this.#inflight.get(key);
    if (running) return running;

    const task = this.#download(voiceId, level, key).finally(() => {
      this.#inflight.delete(key);
    });
    this.#inflight.set(key, task);
    return task;
  }

  /**
   * @param {string} voiceId @param {number|string} level @param {string} key
   * @returns {Promise<boolean>}
   */
  async #download(voiceId, level, key) {
    const dir = `audio/${voiceId}/${level}`;
    this.#packs[key] ??= freshState();
    const st = this.#packs[key];
    st.status = 'downloading';

    try {
      // Already complete at this AUDIO_V? Then there is nothing to fetch.
      const marker = await this.#readMarker(dir);
      if (marker) {
        await this.#adopt(key, dir, marker.files);
        st.done = st.total = marker.files.length;
        st.partial = false;
        st.status = 'ready';
        return true;
      }

      const files = await this.#fetchManifest(voiceId, level);
      if (files === null) {
        // No such pack for this voice — remember that so we stop asking, and let the
        // player fall back to the device's speech synthesis.
        this.#manifests.set(key, new Set());
        st.done = st.total = 0;
        st.status = 'ready';
        return true;
      }

      await Filesystem.mkdir({ directory: Directory.Data, path: dir, recursive: true }).catch(
        () => {} // already exists
      );
      const { uri } = await Filesystem.getUri({ directory: Directory.Data, path: dir });
      const dirUri = uri.replace(/\/+$/, '');

      const have = await this.#existingClips(dir);
      const queue = files.filter((stem) => !have.has(`${stem}.mp3`));
      st.total = files.length;
      st.done = files.length - queue.length;

      const failed = await this.#runQueue(queue, dirUri, voiceId, level, st);

      // Nothing at all arrived: treat as a failure so the UI can offer a retry.
      if (queue.length > 0 && failed === queue.length) {
        st.status = 'error';
        return false;
      }

      await this.#adopt(key, dir, files);
      st.partial = failed > 0;
      st.status = 'ready';
      // Only claim completeness when every clip landed, so a partial pack is topped up
      // the next time this level is opened.
      if (failed === 0) await this.#writeMarker(dir, files);
      return true;
    } catch {
      st.status = 'error';
      return false;
    }
  }

  /**
   * Download `queue` into `dirUri` with a small worker pool.
   * @param {string[]} queue @param {string} dirUri @param {string} voiceId
   * @param {number|string} level @param {PackState} st
   * @returns {Promise<number>} how many clips failed
   */
  async #runQueue(queue, dirUri, voiceId, level, st) {
    let cursor = 0;
    let failed = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const stem = queue[cursor++];
        const url = this.remoteSrc(voiceId, level, stem);
        if (!url) {
          failed++;
          continue; // no CDN configured; #fetchManifest already rejects this case
        }
        try {
          await FileTransfer.downloadFile({
            url,
            path: `${dirUri}/${stem}.mp3`,
            connectTimeout: TIMEOUT,
            readTimeout: TIMEOUT
          });
        } catch {
          failed++;
          continue; // `done` counts clips actually on disk, so the bar can't read 100%
        }                                                     // while clips are missing
        st.done++;
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    return failed;
  }

  /**
   * Record a pack's manifest and resolve the WebView URL its clips are served from.
   * @param {string} key @param {string} dir @param {string[]} files
   */
  async #adopt(key, dir, files) {
    this.#manifests.set(key, new Set(files));
    if (this.#bases.has(key)) return;
    const { uri } = await Filesystem.getUri({ directory: Directory.Data, path: dir });
    this.#bases.set(key, Capacitor.convertFileSrc(uri.replace(/\/+$/, '')));
  }

  /**
   * The pack's completion marker, or null when absent/stale. A stale marker (clips
   * regenerated, AUDIO_V bumped) wipes the directory so the pack is refetched.
   * @param {string} dir
   * @returns {Promise<{ files: string[] }|null>}
   */
  async #readMarker(dir) {
    try {
      const res = await Filesystem.readFile({
        directory: Directory.Data,
        path: `${dir}/${MARKER}`,
        encoding: Encoding.UTF8
      });
      const data = JSON.parse(String(res.data));
      if (data?.version === AUDIO_V && Array.isArray(data.files)) return { files: data.files };
      await Filesystem.rmdir({ directory: Directory.Data, path: dir, recursive: true }).catch(
        () => {}
      );
      return null;
    } catch {
      return null; // never downloaded, or unreadable — fetch it
    }
  }

  /** @param {string} dir @param {string[]} files */
  async #writeMarker(dir, files) {
    await Filesystem.writeFile({
      directory: Directory.Data,
      path: `${dir}/${MARKER}`,
      data: JSON.stringify({ version: AUDIO_V, files }),
      encoding: Encoding.UTF8,
      recursive: true
    }).catch(() => {}); // a lost marker only costs a re-check next launch
  }

  /**
   * Clip filenames already on disk, so an interrupted download resumes.
   * @param {string} dir
   * @returns {Promise<Set<string>>}
   */
  async #existingClips(dir) {
    try {
      const res = await Filesystem.readdir({ directory: Directory.Data, path: dir });
      return new Set(res.files.filter((f) => f.name.endsWith('.mp3')).map((f) => f.name));
    } catch {
      return new Set();
    }
  }

  /**
   * The pack's clip list from the CDN. Returns null when the pack does not exist (404).
   * @param {string} voiceId @param {number|string} level
   * @returns {Promise<string[]|null>}
   */
  async #fetchManifest(voiceId, level) {
    // Without a CDN the URL would be relative, the WebView would 404 it, and every pack
    // would look "empty but fine" — silently degrading the whole app to synthesised
    // speech. Fail loudly instead so the gate shows its retry state.
    if (!AUDIO_CDN) throw new Error('VITE_AUDIO_CDN is not configured for the native build');
    const res = await fetch(`${AUDIO_CDN}/audio/${voiceId}/${level}/pack.json?${AUDIO_V}`, {
      // Clip downloads have their own timeouts; without one here a CDN that accepts the
      // connection but never answers would pin the gate on "Menghubungkan…" forever.
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`pack.json ${res.status}`);
    const data = await res.json();
    return data?.files ?? [];
  }
}

export const downloader = new AudioDownloader();
