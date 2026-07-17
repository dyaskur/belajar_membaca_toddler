import { browser } from '$app/environment';

/** Is browser speech recognition available? (Chrome/Edge/Safari; needs HTTPS + internet.) */
export function sttSupported() {
  const w = /** @type {any} */ (window);
  return browser && !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Listen once and return what was heard.
 * @param {{ lang?: string, max?: number }} [opts]
 * @returns {Promise<{ alternatives: {transcript:string, confidence:number}[], error?: string }>}
 */
export function recognizeOnce({ lang = 'id-ID', max = 5 } = {}) {
  return new Promise((resolve) => {
    const w = /** @type {any} */ (window);
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return resolve({ alternatives: [], error: 'unsupported' });
    const r = new SR();
    r.lang = lang;
    r.maxAlternatives = max;
    r.interimResults = false;
    r.continuous = false;
    let done = false;
    const finish = (/** @type {any} */ v) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    r.onresult = (/** @type {any} */ e) => {
      const res = e.results[0];
      const alternatives = [];
      for (let i = 0; i < res.length; i++)
        alternatives.push({ transcript: (res[i].transcript ?? '').trim(), confidence: res[i].confidence ?? 0 });
      finish({ alternatives });
    };
    r.onerror = (/** @type {any} */ e) => finish({ alternatives: [], error: e.error });
    r.onend = () => finish({ alternatives: [] });
    try {
      r.start();
    } catch {
      finish({ alternatives: [], error: 'start-failed' });
    }
  });
}

/** @param {string} a @param {string} b */
function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, x) => [x, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let x = 1; x <= m; x++)
    for (let y = 1; y <= n; y++)
      d[x][y] = Math.min(d[x - 1][y] + 1, d[x][y - 1] + 1, d[x - 1][y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
  return d[m][n];
}

/**
 * Lenient match: accepts exact, 1-char near-miss, or the target appearing as a token.
 * @param {string} target
 * @param {{transcript:string}[]} alternatives
 */
export function matchesWord(target, alternatives) {
  const norm = (/** @type {string} */ s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const t = norm(target);
  if (!t) return false;
  for (const a of alternatives) {
    if (norm(a.transcript) === t) return true;
    const tokens = a.transcript.toLowerCase().split(/\s+/).map(norm);
    if (tokens.some((tok) => tok === t || lev(tok, t) <= 1)) return true;
  }
  return false;
}
