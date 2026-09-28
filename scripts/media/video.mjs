// Record the promo walkthrough of the real UI and post-process it with ffmpeg.
//
//   npm run media:video
//
// Output (docs/public/media/): promo.mp4 (H.264, 1920×1080), demo.gif (README loop),
// poster.png. Requires ffmpeg on PATH.
import path from 'node:path';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  MEDIA_DIR,
  ensureDir,
  hasBinary,
  optimizePng,
  launchBrowser,
  openDemo,
  sleep,
  startDemoServer,
} from './lib.mjs';
import {
  END_CARD,
  TITLE_CARD,
  caption,
  cursorInitScript,
  hideCard,
  installOverlays,
  showCard,
} from './overlay.mjs';

const WAREHOUSE = 'fixtures/showcase/warehouse_delivery.xml';
const BROKEN = 'fixtures/showcase/needs_fixes.xml';
const SIZE = { width: 1920, height: 1080 };

/** Timeline markers (seconds since recording start) used to cut the GIF and poster. */
const marks = {};
const mark = (name) => (marks[name] = Date.now() / 1000);

async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`no bounding box for ${locator}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/** Glide the (visible) cursor to a locator, then click it. */
async function glideClick(page, locator, { button = 'left', steps = 28, pause = 180 } = {}) {
  const { x, y } = await center(locator);
  await page.mouse.move(x, y, { steps });
  await sleep(pause);
  await page.mouse.down({ button });
  await page.mouse.up({ button });
  await sleep(250);
}

async function glideTo(page, locator, steps = 28) {
  const { x, y } = await center(locator);
  await page.mouse.move(x, y, { steps });
}

async function typeSlow(page, text, delay = 85) {
  await page.keyboard.type(text, { delay });
}

async function walkthrough(page, baseUrl) {
  const demo = await openDemo(page, baseUrl, { file: WAREHOUSE, xml: true });
  await installOverlays(page);
  await demo.closeLegend();
  await page.mouse.move(960, 700);

  // 1 — Title card
  await showCard(page, TITLE_CARD, { instant: true });
  mark('start');
  await sleep(3800);
  await hideCard(page);
  await sleep(700);

  // 2 — Overview, pan & zoom
  mark('overview');
  await caption(page, 'Open any BehaviorTree.CPP XML as a live, editable graph');
  const pane = demo.frame.locator('.react-flow__pane');
  const paneBox = (await center(pane)).box;
  const cx = paneBox.x + paneBox.width / 2;
  const cy = paneBox.y + paneBox.height / 2;
  await page.mouse.move(cx, cy + 120, { steps: 25 });
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, -120);
    await sleep(140);
  }
  await sleep(500);
  await page.mouse.down();
  await page.mouse.move(cx - 160, cy + 60, { steps: 30 });
  await page.mouse.up();
  await sleep(500);
  await demo.fitView();
  await sleep(900);

  // 3 — Inspector: typed ports, edits sync to XML
  mark('inspector');
  await caption(page, 'Typed ports in the inspector — edits write straight back to the XML');
  await glideClick(page, demo.node('0-3-0-0'));
  await sleep(700);
  const planner = demo.frame.locator('#btview-port-planner');
  await glideClick(page, planner);
  await page.keyboard.press('Control+A');
  await typeSlow(page, 'NavFn');
  await sleep(500);
  await glideClick(page, demo.frame.locator('#btview-node-name'));
  await sleep(1800);

  // 4 — Rename with F2, add a node from the palette
  mark('palette');
  await caption(page, 'Rename with <span class="k">F2</span>, drag nodes in from the palette');
  await glideClick(page, demo.node('0-3-1'));
  await page.keyboard.press('F2');
  await sleep(200);
  await typeSlow(page, 'page_operator');
  await page.keyboard.press('Tab');
  await sleep(900);
  const paletteSearch = demo.frame.getByLabel('Search node palette');
  await glideClick(page, paletteSearch);
  await typeSlow(page, 'Dock', 60);
  await sleep(300);
  await glideClick(page, demo.frame.locator('.palette-node', { hasText: /^Dock/ }));
  await sleep(600);
  // Drag the staged node next to the Fallback, then connect parent → child.
  const staged = demo.frame.locator('.react-flow__node.staged-node').first();
  const parent = demo.node('0-3');
  const parentBox = (await center(parent)).box;
  const stagedPos = await center(staged);
  await page.mouse.move(stagedPos.x, stagedPos.y, { steps: 20 });
  await page.mouse.down();
  await page.mouse.move(parentBox.x + parentBox.width / 2 + 260, parentBox.y + 170, {
    steps: 30,
  });
  await page.mouse.up();
  await sleep(500);
  const source = parent.locator('.react-flow__handle.source');
  const target = staged.locator('.react-flow__handle.target');
  const s = await center(source);
  const t = await center(target);
  await page.mouse.move(s.x, s.y, { steps: 25 });
  await page.mouse.down();
  await page.mouse.move(t.x, t.y, { steps: 35 });
  await page.mouse.up();
  await sleep(1400);
  await paletteSearch.fill('');
  await sleep(400);

  // 5 — Search + keyboard navigation (XML pane closed: more room for the graph)
  await demo.setXml(false);
  await demo.fitView();
  mark('search');
  await caption(
    page,
    'Search with <span class="k">Ctrl+F</span>, walk the tree with the arrow keys',
  );
  await glideClick(page, demo.frame.getByLabel('Search nodes', { exact: true }));
  await typeSlow(page, 'item');
  await sleep(500);
  await page.keyboard.press('Enter');
  await sleep(900);
  await page.keyboard.press('Enter');
  await sleep(900);
  await page.keyboard.press('Escape');
  await sleep(300);
  for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) {
    await page.keyboard.press(key);
    await sleep(650);
  }

  // 6 — Subtree drill-down with breadcrumbs
  await demo.fitView();
  await sleep(400);
  mark('subtree');
  await caption(page, 'Drill into subtrees — breadcrumbs take you back');
  await glideClick(page, demo.node('0-2'), { button: 'right' });
  await sleep(700);
  await glideClick(page, demo.frame.getByRole('menuitem', { name: 'Open subtree' }));
  await sleep(1600);
  await glideTo(page, demo.frame.locator('.drill-crumb').first());
  await sleep(600);
  await glideClick(page, demo.frame.locator('.drill-crumb').first());
  await sleep(900);

  // 7 — Validation issues, click to jump
  mark('validation');
  await caption(page, 'Validation catches broken trees — click an issue to jump to it');
  await demo.openFile(BROKEN);
  await demo.closeLegend();
  await sleep(700);
  await glideClick(page, demo.frame.locator('.warning-link').nth(1));
  await sleep(1400);
  await glideClick(page, demo.frame.locator('.warning-link').nth(3));
  await sleep(1400);

  // 8 — Offline simulation with live status overlays
  mark('simulation');
  await caption(page, 'Simulate ticks offline — watch RUNNING · SUCCESS · FAILURE fire live');
  await demo.openFile(WAREHOUSE);
  await demo.closeLegend();
  await demo.fitView();
  await demo.setScenario(2);
  await sleep(500);
  await glideClick(page, demo.frame.getByRole('button', { name: 'Play', exact: true }));
  await page.waitForFunction(
    () => /SUCCESS|FAILURE/.test(document.getElementById('status-sim')?.textContent ?? ''),
    null,
    { timeout: 20000 },
  );
  mark('simulationDone');
  await sleep(1800);
  await caption(page, 'Prove properties with the bounded verifier and trace tests');
  await demo.setXml(true);
  await glideClick(page, page.getByRole('button', { name: 'Run trace tests' }));
  await sleep(2600);
  await caption(page, null);

  // 9 — End card
  mark('end');
  await showCard(page, END_CARD);
  await sleep(4800);
  mark('stop');
}

/**
 * Record the page with the Chrome DevTools screencast (JPEG frames with wall-clock
 * timestamps). Unlike Playwright's recordVideo this needs no extra ffmpeg download and
 * keeps text crisp; frames are assembled into a constant-frame-rate video below.
 */
async function startRecorder(page, dir) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `f${String(frames.length).padStart(6, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, ts: metadata.timestamp ?? Date.now() / 1000 });
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId });
    } catch {
      // session closed
    }
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: SIZE.width,
    maxHeight: SIZE.height,
    everyNthFrame: 1,
  });
  return {
    frames,
    async stop() {
      await cdp.send('Page.stopScreencast');
    },
  };
}

/** Write an ffmpeg concat list covering [start, stop] from timestamped frames. */
function concatList(frames, start, stop, dir) {
  let first = 0;
  while (first + 1 < frames.length && frames[first + 1].ts <= start) first++;
  const lines = [];
  for (let i = first; i < frames.length && frames[i].ts < stop; i++) {
    const from = Math.max(frames[i].ts, start);
    const to = Math.min(frames[i + 1]?.ts ?? stop, stop);
    if (to <= from) continue;
    lines.push(`file '${frames[i].file}'`, `duration ${(to - from).toFixed(4)}`);
  }
  // concat demuxer quirk: repeat the last file so its duration is honoured.
  lines.push(lines[lines.length - 2]);
  const list = path.join(dir, 'frames.txt');
  writeFileSync(list, lines.join('\n') + '\n');
  return list;
}

function ffmpeg(args) {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: 'inherit',
  });
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}

async function main() {
  if (!hasBinary('ffmpeg')) throw new Error('ffmpeg is required for the promo video.');
  ensureDir(MEDIA_DIR);
  const rawDir = mkdtempSync(path.join(tmpdir(), 'btview-video-'));
  const server = await startDemoServer();
  const browser = await launchBrowser();
  let frames;
  try {
    const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1 });
    await context.addInitScript(cursorInitScript);
    const page = await context.newPage();
    const recorder = await startRecorder(page, rawDir);
    try {
      await walkthrough(page, server.url);
    } catch (err) {
      await page.screenshot({ path: path.join(MEDIA_DIR, 'video-failure.png') });
      throw err;
    }
    await sleep(300);
    await recorder.stop();
    frames = recorder.frames;
    await context.close();
  } finally {
    await browser.close();
    await server.close();
  }

  const start = marks.start;
  const duration = marks.stop - start;
  const mp4 = path.join(MEDIA_DIR, 'promo.mp4');
  const list = concatList(frames, start, marks.stop, rawDir);
  ffmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    list,
    '-vf',
    'fps=30,format=yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '24',
    '-tune',
    'stillimage',
    '-movflags',
    '+faststart',
    '-an',
    mp4,
  ]);

  // Poster: the simulation mid-run.
  const posterAt = (marks.simulation + marks.simulationDone) / 2 - start;
  ffmpeg([
    '-ss',
    posterAt.toFixed(2),
    '-i',
    mp4,
    '-frames:v',
    '1',
    path.join(MEDIA_DIR, 'poster.png'),
  ]);
  optimizePng(path.join(MEDIA_DIR, 'poster.png'));

  // README GIF: inspector edit → simulation, sped up, 960px wide.
  const gifStart = marks.inspector - start;
  const gifEnd = marks.simulationDone - start + 1.2;
  const palette = path.join(rawDir, 'palette.png');
  const filters = 'setpts=0.62*PTS,fps=10,scale=960:-1:flags=lanczos';
  ffmpeg([
    '-ss',
    gifStart.toFixed(2),
    '-t',
    (gifEnd - gifStart).toFixed(2),
    '-i',
    mp4,
    '-vf',
    `${filters},palettegen=max_colors=128:stats_mode=diff`,
    palette,
  ]);
  ffmpeg([
    '-ss',
    gifStart.toFixed(2),
    '-t',
    (gifEnd - gifStart).toFixed(2),
    '-i',
    mp4,
    '-i',
    palette,
    '-lavfi',
    `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
    '-loop',
    '0',
    path.join(MEDIA_DIR, 'demo.gif'),
  ]);

  rmSync(rawDir, { recursive: true, force: true });
  for (const f of ['promo.mp4', 'demo.gif', 'poster.png']) {
    const size = statSync(path.join(MEDIA_DIR, f)).size / 1024 / 1024;
    console.log(`  ${f}  ${size.toFixed(2)} MB`);
  }
  console.log(`  promo length ${duration.toFixed(1)} s`);
  console.log(`  marks ${JSON.stringify(marks)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
