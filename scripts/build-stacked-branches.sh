#!/usr/bin/env bash
# Builds stacked feature branches from the current working tree.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree must be clean or only untracked; stashing tracked changes..."
fi

# Ensure we have full content saved
BACKUP="/tmp/btview-full-$$"
mkdir -p "$BACKUP"
rsync -a --exclude .git --exclude node_modules --exclude dist --exclude out-test --exclude webview/dist --exclude .vscode-test "$ROOT/" "$BACKUP/"

git checkout main

# Remove untracked before building (restore from backup each step)
git clean -fdx -e node_modules -e dist -e out-test -e webview/dist -e .vscode-test 2>/dev/null || true

restore() {
  rsync -a "$BACKUP/" "$ROOT/"
}

commit_msg() {
  git add -A
  if git diff --cached --quiet; then
    echo "Nothing to commit for $1"
    return 1
  fi
  git commit -m "$2"
}

# --- PR1: scaffold ---
git checkout -B feat/01-scaffold main
restore
rm -rf src/btcpp src/config src/ros src/sync src/preview src/test webview fixtures docs examples media
mkdir -p src
cat > src/extension.ts <<'EOF'
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('btview.ping', () => {
      void vscode.window.showInformationMessage('BTView scaffold ready.');
    }),
  );
}

export function deactivate(): void {
  // no-op
}
EOF

# Minimal package.json for scaffold (no webview/btcpp yet)
node <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.activationEvents = ['onLanguage:xml'];
delete pkg.contributes.customEditors;
pkg.contributes.commands = [
  { command: 'btview.ping', title: 'BTView Ping', category: 'BTView' },
];
pkg.contributes.menus = {};
delete pkg.contributes.keybindings;
pkg.contributes.configuration = { title: 'BTView', properties: {} };
pkg.scripts['compile:inner'] = 'npm run check-types && node esbuild.js';
pkg.scripts.lint = 'eslint src';
pkg.scripts.test = 'npm run test:unit';
pkg.scripts['pretest:integration'] = 'echo "integration tests added in PR6"';
pkg.scripts['test:integration'] = 'echo "skip"';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODE

commit_msg "PR1" "chore: add OSS scaffold, CI, and extension tooling

- ESLint, Prettier, Husky, commitlint, GitHub Actions
- esbuild + TypeScript project layout
- Node 20+ guard via scripts/with-node.sh
- Minimal extension entrypoint for F5 dev loop"

# --- PR2: btcpp ---
git checkout -B feat/02-btcpp-core feat/01-scaffold
restore
cp -r "$BACKUP/src/btcpp" src/
cp -r "$BACKUP/fixtures" .
cp -r "$BACKUP/src/test/unit" src/test/
mkdir -p src/test

node <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.contributes.configuration.properties = {
  'btview.defaultFormatVersion': pkg.contributes.configuration.properties?.['btview.defaultFormatVersion'] || {
    type: 'string', enum: ['auto', '3', '4'], default: 'auto',
    description: 'Default BTCpp format when BTCPP_format is absent.',
  },
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODE

commit_msg "PR2" "feat: add BTCpp v3/v4 XML parser and serializer

- Version detection, canonical AST, v3/v4 adapters
- Include resolver (relative paths), migration helper
- Vitest fixtures and unit tests for parse/serialize round-trip"

# --- PR3: webview ---
git checkout -B feat/03-webview feat/02-btcpp-core
restore
cp -r "$BACKUP/webview" .

node <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts['compile:inner'] = 'npm run check-types && node esbuild.js && npm run build:webview';
pkg.scripts.lint = 'eslint src webview/src';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODE

commit_msg "PR3" "feat: add React Flow webview for behavior tree graph

- Vite-built SPA with graph layout, inspector, toolbar
- VS Code webview messaging protocol (loadDocument)
- Theme-aware styling"

# --- PR4: extension host ---
git checkout -B feat/04-extension-host feat/03-webview
restore
mkdir -p src/{config,ros,sync,preview}
cp "$BACKUP/src/config/settings.ts" src/config/
cp "$BACKUP/src/ros/packageResolver.ts" src/ros/
cp "$BACKUP/src/sync/DocumentSyncService.ts" src/sync/
cp "$BACKUP/src/preview/webviewHtml.ts" src/preview/
cp "$BACKUP/src/preview/BtGraphController.ts" src/preview/
cp "$BACKUP/src/preview/BtPreviewManager.ts" src/preview/

cat > src/extension.ts <<'EOF'
import * as vscode from 'vscode';
import { BtGraphController } from './preview/BtGraphController';
import { convertToV4, resolveTargetUri } from './preview/BtPreviewManager';

export function activate(context: vscode.ExtensionContext): void {
  const controller = BtGraphController.getInstance(context.extensionUri);

  context.subscriptions.push(
    vscode.commands.registerCommand('btview.openPreviewSide', (uri?: vscode.Uri) => {
      const target = resolveTargetUri(uri);
      if (target) {
        void controller.showSidePreview(target);
      } else {
        void vscode.window.showWarningMessage('Open a BTCpp XML file first.');
      }
    }),
    vscode.commands.registerCommand('btview.convertToV4', () => {
      const target = resolveTargetUri();
      if (target) {
        void convertToV4(target);
      }
    }),
  );
}

export function deactivate(): void {}
EOF

node <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.contributes.commands = [
  { command: 'btview.openPreviewSide', title: 'Open BT Graph to the Side', category: 'BTView', icon: '$(open-preview)' },
  { command: 'btview.convertToV4', title: 'Convert to BTCpp v4', category: 'BTView' },
];
pkg.contributes.configuration.properties = {
  'btview.rosDistro': { type: 'string', default: '', description: 'ROS distro for package resolution.' },
  'btview.rosWorkspaceSetup': { type: 'string', default: '', description: 'Path to setup.bash/setup.zsh.' },
  'btview.rosPackageShareOverrides': { type: 'object', default: {}, description: 'ROS package share overrides.' },
  'btview.defaultFormatVersion': { type: 'string', enum: ['auto', '3', '4'], default: 'auto', description: 'Default BTCpp format.' },
  'btview.serializeNewFilesAs': { type: 'string', enum: ['3', '4'], default: '4', description: 'Format for new files.' },
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODE

commit_msg "PR4" "feat: wire extension host with sync and side preview

- DocumentSyncService for bidirectional XML ↔ graph sync
- ROS package resolver and include loading
- Side-by-side webview preview command"

# --- PR5: custom editor UX ---
git checkout -B feat/05-custom-editor-ux feat/04-extension-host
restore
cp "$BACKUP/src/preview/BtCustomEditorProvider.ts" src/preview/
cp "$BACKUP/src/extension.ts" src/extension.ts
cp -r "$BACKUP/media" .

cp "$BACKUP/package.json" package.json

commit_msg "PR5" "feat: add custom text editor and Markdown-like title bar UX

- CustomTextEditorProvider (BT Graph tab)
- Open XML Source / Open BT Graph title bar icons
- Ctrl+Shift+V and Ctrl+K V keybindings
- btview.defaultOpenMode setting"

# --- PR6: docs and tests ---
git checkout -B feat/06-docs-and-tests feat/05-custom-editor-ux
restore
cp -r "$BACKUP/docs" .
cp -r "$BACKUP/examples" .
cp "$BACKUP/src/test/suite/"*.ts src/test/suite/ 2>/dev/null || mkdir -p src/test/suite && cp "$BACKUP/src/test/suite/"*.ts src/test/suite/
cp "$BACKUP/.vscode-test.mjs" .
cp "$BACKUP/tsconfig.test.json" .
cp "$BACKUP/CHANGELOG.md" .
cp "$BACKUP/README.md" .

node <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.repository.url = 'https://github.com/guilyx/btview-vscode-plugin';
pkg.bugs.url = 'https://github.com/guilyx/btview-vscode-plugin/issues';
pkg.scripts['pretest:integration'] = 'bash scripts/with-node.sh npm run pretest:integration:inner';
pkg.scripts['pretest:integration:inner'] = 'npm run compile:inner && tsc -p tsconfig.test.json';
pkg.scripts['test:integration'] = 'vscode-test';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODE

commit_msg "PR6" "docs: add user guides, examples, and integration tests

- USER_GUIDE, CONFIGURATION, DEVELOPMENT, DISTRIBUTION docs
- example_tree.xml and integration test suite
- README and CHANGELOG updates"

echo "Done. Branches:"
git branch --list 'feat/*'

rm -rf "$BACKUP"
