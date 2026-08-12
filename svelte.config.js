import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html' // SPA fallback: app is client-rendered, offline-first
    }),
    // GitHub Pages serves under /<repo>/. CI sets BASE_PATH; dev/local stays at root.
    paths: {
      base: process.env.BASE_PATH ?? ''
    },
    serviceWorker: {
      // The Android shell already serves the app from local storage and downloads audio
      // itself, so it needs no service worker. Registering one there would also break:
      // its precache manifest lists every static file, including the audio the Android
      // build strips out, so install would fail on the missing clips.
      register: process.env.NATIVE !== '1',
      files: (filename) =>
        !/\.DS_Store/.test(filename) && !(process.env.NATIVE === '1' && filename.startsWith('audio/'))
    }
  }
};

export default config;
