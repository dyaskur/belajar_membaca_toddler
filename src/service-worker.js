/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `klm-cache-${version}`;
const APP_SHELL = [...build, ...files];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Audio packs & clips: cache-first (they're immutable once generated).
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return new Response('', { status: 504 });
        }
      })
    );
    return;
  }

  // App shell: cache-first with network fallback; SPA fallback to index.html.
  event.respondWith(
    caches.match(request).then((hit) =>
      hit ||
      fetch(request).catch(() => caches.match('/index.html').then((r) => r ?? Response.error()))
    )
  );
});
