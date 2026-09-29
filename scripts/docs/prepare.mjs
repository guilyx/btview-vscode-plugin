// Prepare generated inputs for the VitePress site (docs/):
//   - docs/changelog.md from CHANGELOG.md (links rewritten for the site)
//   - with --with-demo: build the browser demo into docs/public/demo/ ("Try it live")
//
// Both outputs are git-ignored.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REPO = 'https://github.com/guilyx/btview-vscode-plugin';

function writeChangelog() {
  const src = readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const body = src
    // Links relative to the repo root → site pages (docs/…) or GitHub (everything else).
    .replace(/\]\((?!https?:|#|mailto:)([^)]+)\)/g, (_m, target) => {
      if (target.startsWith('docs/') && !target.startsWith('docs/README.md')) {
        return `](./${target.slice('docs/'.length)})`;
      }
      return `](${REPO}/blob/main/${target})`;
    });
  const header = [
    '---',
    'title: Changelog',
    'editLink: false',
    '---',
    '',
    '<!-- Generated from CHANGELOG.md by scripts/docs/prepare.mjs — do not edit. -->',
    '',
  ].join('\n');
  writeFileSync(path.join(ROOT, 'docs/changelog.md'), header + body);
}

async function buildDemo() {
  const vite = await import('vite');
  await vite.build({
    configFile: path.join(ROOT, 'demo/vite.config.mts'),
    logLevel: 'warn',
    base: './',
    build: { outDir: path.join(ROOT, 'docs/public/demo'), emptyOutDir: true },
  });
}

writeChangelog();
if (process.argv.includes('--with-demo')) {
  await buildDemo();
}
console.log('docs: prepared changelog' + (process.argv.includes('--with-demo') ? ' + demo' : ''));
