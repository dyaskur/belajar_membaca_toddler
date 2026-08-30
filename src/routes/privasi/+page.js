// The rest of the app is a client-rendered SPA served through a 404 fallback, which would
// make /privasi answer with HTTP 404. Google Play validates the privacy policy URL, so this
// one route is prerendered to a real index.html and served with a 200.
export const prerender = true;
export const ssr = true;
