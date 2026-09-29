// Shared helpers for the media pipeline (screenshots + promo video).
//
// Everything is captured from the real webview UI running in the browser demo harness
// (demo/), driven by Playwright against the system Chrome — no browser download.
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PUBLIC_DIR = path.join(ROOT, 'docs/public');
export const SCREENSHOT_DIR = path.join(PUBLIC_DIR, 'screenshots');
export const MEDIA_DIR = path.join(PUBLIC_DIR, 'media');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export function chromePath() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error('No Chrome/Chromium found. Set CHROME_PATH to a Chrome executable.');
  }
  return found;
}

export async function launchBrowser() {
  const { chromium } = await import('playwright-core');
  return chromium.launch({
    executablePath: chromePath(),
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars'],
  });
}

/** Build the demo harness once and serve it with `vite preview`. */
export async function startDemoServer() {
  const vite = await import('vite');
  const configFile = path.join(ROOT, 'demo/vite.config.mts');
  const outDir = mkdtempSync(path.join(tmpdir(), 'btview-demo-'));
  await vite.build({ configFile, logLevel: 'warn', build: { outDir, emptyOutDir: true } });
  const server = await vite.preview({
    configFile,
    logLevel: 'warn',
    build: { outDir },
    preview: { port: 0, strictPort: false, host: '127.0.0.1' },
  });
  const url = server.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:5174/';
  return {
    url,
    async close() {
      await new Promise((resolve) => server.httpServer.close(resolve));
      rmSync(outDir, { recursive: true, force: true });
    },
  };
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Open the demo on `file`, wait for the webview to render the graph, return helpers. */
export async function openDemo(page, baseUrl, { file, theme = 'dark', xml = false } = {}) {
  const url = new URL(baseUrl);
  if (file) url.searchParams.set('file', file);
  url.searchParams.set('theme', theme);
  url.searchParams.set('xml', xml ? '1' : '0');
  await page.goto(url.toString());
  const demo = new Demo(page);
  await demo.waitForGraph();
  return demo;
}

/** Thin automation layer over the harness + the webview iframe. */
export class Demo {
  constructor(page) {
    this.page = page;
  }

  get frame() {
    const f = this.page.frames().find((fr) => fr.url().includes('webview.html'));
    if (!f) throw new Error('webview frame not found');
    return f;
  }

  async waitForGraph() {
    await this.page.waitForFunction(() => window.btviewDemo && window.btviewDemo.document);
    await this.page.evaluate(() => window.btviewDemo.ready);
    const frame = await (await this.page.waitForSelector('#webview')).contentFrame();
    await frame.waitForSelector('.react-flow__node', { timeout: 15000 });
    await sleep(600);
  }

  async openFile(file) {
    await this.page.evaluate((f) => window.btviewDemo.openFile(f), file);
    await this.waitForGraph();
  }

  node(path) {
    return this.frame.locator(`.react-flow__node[data-id="${path}"]`);
  }

  async clickNode(path) {
    await this.node(path).click();
    await sleep(250);
  }

  async fitView() {
    await this.frame.locator('body').press('Control+0');
    await sleep(400);
  }

  /** Zoom the canvas in `steps` notches around its centre (React Flow controls). */
  async zoomIn(steps = 1) {
    for (let i = 0; i < steps; i++) {
      await this.frame.locator('.react-flow__controls-zoomin').click();
      await sleep(250);
    }
  }

  async setTheme(theme) {
    await this.page.evaluate((t) => window.btviewDemo.setTheme(t), theme);
    await sleep(200);
  }

  async setXml(visible) {
    await this.page.evaluate((v) => window.btviewDemo.setXmlVisible(v), visible);
    await sleep(300);
  }

  async setScenario(n) {
    await this.page.evaluate((i) => window.btviewDemo.setScenario(i), n);
  }

  async simStep(times = 1, delay = 150) {
    for (let i = 0; i < times; i++) {
      await this.frame.getByRole('button', { name: 'Step', exact: true }).click();
      await sleep(delay);
    }
  }

  /** Hide the node-kind legend overlay for cleaner shots. */
  async closeLegend() {
    const close = this.frame.locator('.kind-legend-close');
    if (await close.count()) {
      await close.click();
      await sleep(150);
    }
  }
}

/**
 * Losslessly-ish shrink a PNG: quantize to a 256-colour palette with ImageMagick when
 * available (UI captures are flat colour, so this is visually identical and ~3x smaller).
 */
export function optimizePng(file) {
  const convert = ['magick', 'convert'].find(
    (bin) => spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0,
  );
  if (!convert) {
    return false;
  }
  const res = spawnSync(
    convert,
    [file, '-strip', '-dither', 'None', '-colors', '256', `PNG8:${file}`],
    { stdio: 'inherit' },
  );
  return res.status === 0;
}

export function hasBinary(bin) {
  return spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0;
}
