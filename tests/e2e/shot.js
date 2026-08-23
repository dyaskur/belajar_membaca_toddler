import { mkdirSync, writeFileSync } from 'node:fs';
import { VIEWPORTS } from '../../playwright.config.js';

const shotDir = process.env.SHOT_DIR ?? 'shots';
const metaDir = `${shotDir}/meta`;

mkdirSync(metaDir, { recursive: true });

/**
 * Order of the workflow groups in the PR comment, and their human-facing titles.
 * The workflow renders whatever it finds in shots/meta/, so adding a screenshot
 * is a one-line change here + at the call site — never an edit to preview.yml.
 * @type {Record<string, { order: number, title: string }>}
 */
export const GROUPS = {
  beranda: { order: 1, title: '🏠 Beranda & navigasi' },
  belajar: { order: 2, title: '📚 Belajar — halaman kursus' },
  'belajar-flow': { order: 3, title: '🎓 Belajar — alur pelajaran' },
  game: { order: 4, title: '🎮 Game lain' },
  'stiker-album': { order: 4.5, title: '📒 Buku Stiker — status koleksi' },
  menulis: { order: 5, title: '✍️ Menulis' },
  wizard: { order: 6, title: '👋 First-run wizard' },
  dev: { order: 7, title: '🛠️ Halaman dev' }
};

/**
 * Capture a screenshot plus the sibling metadata the PR comment is built from.
 *
 * `animations: 'disabled'` fast-forwards CSS animations to their end state at
 * capture time only, so shots are deterministic without running the app in its
 * reduced-motion variant. Metadata goes to one file per shot: parallel workers
 * would race on a single shared manifest.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {{ group: keyof GROUPS | string, name: string, label: string, order?: number, route?: string }} opts
 */
export async function shot(page, testInfo, { group, name, label, order = 0, route }) {
  const viewport = testInfo.project.name;
  const file = `${name}-${viewport}.png`;

  // Fonts and images settle before we judge the frame. Full-page screenshots do
  // not reliably give below-the-fold lazy images enough time to load, which can
  // produce a false visual diff with blank tiles. Promote the images already in
  // the DOM to eager loading, wait for load/error, then decode successful images
  // before capture. The timeout keeps a stalled request from blocking the smoke
  // test forever. Return a plain value because document.fonts is not serializable.
  // Screenshots stay best-effort: a failing assertion should still leave an image
  // showing why.
  await page
    .evaluate(async () => {
      await document.fonts.ready;

      const images = [...document.images];
      for (const image of images) image.loading = 'eager';

      const settled = Promise.all(
        images.map(
          (image) =>
            image.complete ||
            new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            })
        )
      );
      await Promise.race([settled, new Promise((resolve) => setTimeout(resolve, 15_000))]);
      await Promise.all(
        images.filter((image) => image.complete).map((image) => image.decode().catch(() => {}))
      );

      return true;
    })
    .catch(() => {});
  await page
    .screenshot({ path: `${shotDir}/${file}`, fullPage: true, animations: 'disabled' })
    .catch(() => {});

  const vp = VIEWPORTS.find((v) => v.name === viewport);

  // Everything the PR comment needs to render this shot, so the workflow can stay
  // a generic renderer: `title` lets it map a failed test back onto its group,
  // `inline` decides full-size vs. folded into the nested <details>.
  writeFileSync(
    `${metaDir}/${name}-${viewport}.json`,
    JSON.stringify({
      group,
      groupOrder: GROUPS[group]?.order ?? 99,
      groupTitle: GROUPS[group]?.title ?? group,
      name,
      label,
      order,
      route: route ?? null, // set for page shots, so the comment can flag routes the PR touched
      viewport,
      inline: vp?.inline ?? false,
      size: vp ? `${vp.width}×${vp.height}` : '',
      title: testInfo.title,
      file
    })
  );
}
