/// <reference types="@sveltejs/kit" />
import { base, build, files, version } from '$service-worker';

const CACHE = `klm-cache-${version}`;
const ROOT = `${base}/`; // app shell entry (base-aware for GitHub Pages subpath)
const APP_SHELL = [...build, ...files, ROOT];

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

  if (url.pathname.startsWith(`${base}/audio/`)) {
    const isManifest = url.pathname.endsWith('.json');
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        if (isManifest) {
          // Manifest: NETWORK-FIRST so regenerated packs are picked up immediately
          // (cache-first would pin a stale list and hide new clips). Cache for offline.
          try {
            const res = await fetch(request);
            if (res.ok) cache.put(request, res.clone());
            return res;
          } catch {
            return (await cache.match(request)) ?? new Response('{"files":[]}', {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        // Clips: cache-first (immutable once generated).
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

  // App shell: cache-first with network fallback; SPA fallback to the app root.
  event.respondWith(
    caches.match(request).then((hit) =>
      hit || fetch(request).catch(() => caches.match(ROOT).then((r) => r ?? Response.error()))
    )
  );
});
