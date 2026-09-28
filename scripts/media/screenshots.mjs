// Capture documentation screenshots of the real webview UI (via the demo harness).
//
//   npm run media:screenshots            # all shots
//   npm run media:screenshots -- search  # only shots whose name contains "search"
import path from 'node:path';
import { statSync } from 'node:fs';
import {
  SCREENSHOT_DIR,
  ensureDir,
  launchBrowser,
  openDemo,
  optimizePng,
  sleep,
  startDemoServer,
} from './lib.mjs';

const WAREHOUSE = 'fixtures/showcase/warehouse_delivery.xml';
const NAV2 = 'fixtures/nav2/navigate_w_replanning_and_recovery.xml';
const BROKEN = 'fixtures/showcase/needs_fixes.xml';

const VIEWPORT = { width: 1440, height: 900 };
const WIDE = { width: 1680, height: 945 };

/**
 * Each shot opens a fresh page. `target` is 'webview' (just the extension UI) or
 * 'page' (demo shell incl. XML pane / output).
 */
const SHOTS = [
  {
    name: 'overview',
    file: NAV2,
    viewport: { width: 1920, height: 1080 },
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      await demo.fitView();
      await demo.zoomIn(1);
    },
  },
  {
    name: 'inspector-ports',
    file: WAREHOUSE,
    viewport: { width: 1440, height: 1000 },
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      await demo.frame.getByLabel('Active behavior tree').selectOption('PickItem');
      await sleep(900);
      await demo.clickNode('0-1');
      await demo.frame
        .locator('.inspector-section-label')
        .last()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await sleep(200);
    },
  },
  {
    name: 'palette-models',
    file: WAREHOUSE,
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      await demo.frame.getByLabel('Search node palette').fill('re');
      await sleep(200);
      await demo.frame.locator('.palette-node', { hasText: 'ReactiveSequence' }).click();
      await sleep(400);
      await demo.frame.locator('.react-flow__node.staged-node').first().click();
      await sleep(300);
    },
  },
  {
    name: 'search',
    file: NAV2,
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      const search = demo.frame.getByLabel('Search nodes', { exact: true });
      await search.fill('costmap');
      await search.press('Enter');
      await search.press('Enter');
      await sleep(600);
    },
  },
  {
    name: 'context-menu',
    file: WAREHOUSE,
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      await demo.zoomIn(2);
      await demo.clickNode('0-2');
      await demo.node('0-2').click({ button: 'right' });
      await sleep(300);
    },
  },
  {
    name: 'subtree-breadcrumbs',
    file: WAREHOUSE,
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      await demo.node('0-2').click({ button: 'right' });
      await sleep(200);
      await demo.frame.getByRole('menuitem', { name: 'Open subtree' }).click();
      await sleep(900);
      await demo.clickNode('0-2');
    },
  },
  {
    name: 'validation-issues',
    file: BROKEN,
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      await demo.frame.locator('.warning-link').nth(1).click();
      await sleep(600);
    },
  },
  {
    name: 'simulation',
    file: WAREHOUSE,
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      await demo.zoomIn(2);
      await demo.setScenario(2);
      await demo.simStep(4);
      await sleep(300);
    },
  },
  {
    name: 'shortcuts',
    file: WAREHOUSE,
    target: 'webview',
    async run(demo) {
      await demo.frame.locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
      await demo.frame.locator('body').press('?');
      await sleep(300);
    },
  },
  {
    name: 'light-theme',
    file: WAREHOUSE,
    theme: 'light',
    target: 'webview',
    async run(demo) {
      await demo.clickNode('0-3-0-0');
    },
  },
  {
    name: 'xml-sync',
    file: WAREHOUSE,
    xml: true,
    viewport: WIDE,
    target: 'page',
    async run(demo) {
      await demo.closeLegend();
      await demo.clickNode('0-3-0-0');
      const planner = demo.frame.locator('#btview-port-planner');
      await planner.fill('NavFn');
      await planner.blur();
      await sleep(700);
    },
  },
  {
    name: 'verify-traces',
    file: WAREHOUSE,
    xml: true,
    viewport: WIDE,
    target: 'page',
    async run(demo) {
      await demo.closeLegend();
      await demo.page.getByRole('button', { name: 'Run trace tests' }).click();
      await sleep(300);
    },
  },
  {
    name: 'verify-output',
    file: WAREHOUSE,
    xml: true,
    viewport: WIDE,
    target: 'page',
    async run(demo) {
      await demo.closeLegend();
      await demo.page.getByRole('button', { name: 'Verify tree' }).click();
      await sleep(300);
    },
  },
  {
    name: 'includes',
    file: 'fixtures/includes_relative.xml',
    target: 'webview',
    async run(demo) {
      await demo.closeLegend();
      await demo.frame.locator('.include-ok').first().hover();
      await sleep(300);
    },
  },
  {
    name: 'v3-format',
    file: 'fixtures/v3/subtree_plus.xml',
    xml: true,
    viewport: WIDE,
    target: 'page',
    async run(demo) {
      await demo.closeLegend();
      await demo.clickNode('0-1');
    },
  },
];

async function main() {
  const filter = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const shots = filter.length ? SHOTS.filter((s) => filter.some((f) => s.name.includes(f))) : SHOTS;
  ensureDir(SCREENSHOT_DIR);
  const server = await startDemoServer();
  const browser = await launchBrowser();
  try {
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: shot.viewport ?? VIEWPORT,
        deviceScaleFactor: 2,
        colorScheme: shot.theme === 'light' ? 'light' : 'dark',
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => console.error(`[${shot.name}] page error:`, e.message));
      const demo = await openDemo(page, server.url, {
        file: shot.file,
        theme: shot.theme ?? 'dark',
        xml: shot.xml ?? false,
      });
      await shot.run(demo);
      const out = path.join(SCREENSHOT_DIR, `${shot.name}.png`);
      if (shot.target === 'page') {
        await page.screenshot({ path: out });
      } else {
        await page.locator('#webview').screenshot({ path: out });
      }
      optimizePng(out);
      console.log(`  ${shot.name}.png  ${(statSync(out).size / 1024).toFixed(0)} KB`);
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
