// Media pipeline entry point.
//   node scripts/media/run.mjs               → screenshots, then video
//   node scripts/media/run.mjs screenshots   → screenshots only (extra args filter shot names)
//   node scripts/media/run.mjs video         → promo video, GIF and poster only
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [task, ...rest] = process.argv.slice(2);

function run(script, args = []) {
  const res = spawnSync(process.execPath, [path.join(here, script), ...args], {
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

if (!task || task === 'screenshots') {
  console.log('media: screenshots');
  run('screenshots.mjs', task ? rest : []);
}
if (!task || task === 'video') {
  console.log('media: video');
  run('video.mjs');
}
