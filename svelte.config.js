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
      register: true
    }
  }
};

export default config;
