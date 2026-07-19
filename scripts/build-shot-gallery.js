// Builds shots/index.html — a browsable gallery of every screenshot, from the
// same shots/meta/*.json the PR comment is rendered from.
//
// The PR comment can only afford 2 viewports inline (GitHub caps comment bodies
// at 65,536 chars), so the other 3 are collapsed and nothing is shown full size.
// The shots deploy is a real static site, so it can show everything: this makes
// its root useful instead of a 404.
//
// Usage: node scripts/build-shot-gallery.js [shotDir]

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const shotDir = process.argv[2] ?? process.env.SHOT_DIR ?? 'shots';
const metaDir = join(shotDir, 'meta');

// The workflow runs this with `if: always()`, so it must survive the smoke test
// having crashed before writing anything — otherwise a test failure would also
// fail the gallery step and mask the real error.
mkdirSync(shotDir, { recursive: true });

/** @param {string} s */
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
  );

let metas = [];
try {
  metas = readdirSync(metaDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(metaDir, f), 'utf8')));
} catch (e) {
  console.error(`No screenshot metadata in ${metaDir}: ${e.message}`);
}

if (!metas.length) {
  writeFileSync(join(shotDir, 'index.html'), '<!doctype html><title>No screenshots</title><p>No screenshots were captured.');
  console.log('No metadata found — wrote placeholder index.html');
  process.exit(0);
}

// Viewports in config order (narrowest first), derived from the shots themselves.
const viewports = [...new Set(metas.map((m) => m.viewport))].sort((a, b) => {
  const w = (v) => Number(metas.find((m) => m.viewport === v)?.size?.split('×')[0] ?? 0);
  return w(a) - w(b);
});

// group → { title, order, shots: name → { label, order, byViewport } }
const groups = new Map();
for (const m of metas) {
  if (!groups.has(m.group)) {
    groups.set(m.group, { title: m.groupTitle, order: m.groupOrder, shots: new Map() });
  }
  const g = groups.get(m.group);
  if (!g.shots.has(m.name)) g.shots.set(m.name, { label: m.label, order: m.order, byViewport: new Map() });
  g.shots.get(m.name).byViewport.set(m.viewport, m);
}

const ordered = [...groups.entries()].sort((a, b) => a[1].order - b[1].order);

/** Display scale applied to every shot's CSS width, so viewports stay comparable. */
const SCALE = 0.55;

const nav = ordered
  .map(([key, g]) => `<a href="#${esc(key)}">${esc(g.title)} <span class="n">${g.shots.size}</span></a>`)
  .join('');

const sections = ordered
  .map(([key, g]) => {
    const shots = [...g.shots.entries()].sort((a, b) => a[1].order - b[1].order);
    const rows = shots
      .map(([name, s]) => {
        const cells = viewports
          .map((v) => {
            const m = s.byViewport.get(v);
            if (!m) return `<figure class="miss"><figcaption>${esc(v)}</figcaption><div class="none">tidak ada</div></figure>`;
            // Render every viewport at the same *scale*, not the same width: a
            // fixed width shrinks a 1024px tablet shot to ~22% while a 360px phone
            // sits at 60%, making the tablet text unreadable and the two
            // impossible to compare. The row scrolls horizontally instead.
            const w = Math.round(Number(m.size.split('×')[0] || 390) * SCALE);
            return `<figure>
        <figcaption>${esc(v)} <span class="sz">${esc(m.size)}</span></figcaption>
        <a href="${esc(m.file)}" target="_blank" rel="noopener">
          <img loading="lazy" style="width:${w}px" src="${esc(m.file)}" alt="${esc(s.label)} — ${esc(v)}">
        </a>
      </figure>`;
          })
          .join('\n');
        return `<section class="shot" id="${esc(name)}">
      <h3>${esc(s.label)} <code>${esc(name)}</code></h3>
      <div class="row">${cells}</div>
    </section>`;
      })
      .join('\n');
    return `<section class="group" id="${esc(key)}">
    <h2>${esc(g.title)}</h2>
    ${rows}
  </section>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Screenshot — kids-learn</title>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #111; --muted: #667; --line: #e3e3e8; --card: #fafafc; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #14141a; --fg: #f0f0f4; --muted: #9a9aa8; --line: #2a2a34; --card: #1c1c24; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { position: sticky; top: 0; z-index: 2; background: var(--bg);
    border-bottom: 1px solid var(--line); padding: 12px 20px; }
  h1 { margin: 0 0 8px; font-size: 17px; }
  .meta { color: var(--muted); font-size: 13px; margin: 0 0 10px; }
  nav { display: flex; flex-wrap: wrap; gap: 6px; }
  nav a { text-decoration: none; color: var(--fg); background: var(--card);
    border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px; font-size: 13px; }
  nav a:hover { border-color: var(--muted); }
  nav .n { color: var(--muted); font-variant-numeric: tabular-nums; }
  main { padding: 20px; }
  .group { margin: 0 0 34px; }
  .group > h2 { font-size: 16px; margin: 0 0 14px; padding-top: 8px;
    border-top: 2px solid var(--line); }
  .shot { margin: 0 0 26px; }
  .shot h3 { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
  .shot code { color: var(--muted); font-weight: 400; font-size: 12px; }
  /* Horizontal scroll keeps tall full-page shots side by side without shrinking
     them into uselessness on narrow screens. */
  .row { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px;
    align-items: flex-start; }
  figure { margin: 0; flex: 0 0 auto; }
  figcaption { font-size: 12px; color: var(--muted); margin-bottom: 5px; }
  .sz { opacity: .7; }
  /* width is set per-image so each viewport renders at the same scale */
  figure img { display: block; height: auto; background: var(--card);
    border: 1px solid var(--line); border-radius: 8px; }
  .miss .none { width: 215px; padding: 30px 0; text-align: center; color: var(--muted);
    border: 1px dashed var(--line); border-radius: 8px; font-size: 13px; }
</style>
</head>
<body>
<header>
  <h1>📸 Screenshot — kids-learn</h1>
  <p class="meta">${metas.length} gambar · ${viewports.length} viewport · ${ordered.length} grup · full-page · klik untuk ukuran asli</p>
  <nav>${nav}</nav>
</header>
<main>
${sections}
</main>
</body>
</html>
`;

writeFileSync(join(shotDir, 'index.html'), html);
console.log(`Gallery: ${metas.length} shots, ${ordered.length} groups → ${join(shotDir, 'index.html')}`);
