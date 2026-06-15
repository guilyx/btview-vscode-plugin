import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { SerializedDocument } from '../shared/protocol';

export function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function buildCsp(webview: vscode.Webview, nonce: string): string {
  const src = webview.cspSource;
  return [
    "default-src 'none'",
    `img-src ${src} https: data:`,
    `font-src ${src}`,
    `style-src ${src} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}' ${src}`,
    `connect-src ${src}`,
  ].join('; ');
}

function assetUri(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  relativePath: string,
  cacheKey: string,
): vscode.Uri {
  const base = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...relativePath.split('/')));
  return base.with({ query: `v=${cacheKey}` });
}

/** Inline boot splash (works before bundled CSS loads). */
const BOOT_SPLASH_HTML = `<div class="btview-loader" role="status" aria-live="polite" aria-busy="true">
  <div class="btview-loader-logo" aria-hidden="true">
    <svg viewBox="0 0 128 128" width="72" height="72" class="btview-loader-tree">
      <circle class="btview-loader-node btview-loader-node-root" cx="64" cy="24" r="12" />
      <circle class="btview-loader-node btview-loader-node-left" cx="36" cy="64" r="10" />
      <circle class="btview-loader-node btview-loader-node-right" cx="92" cy="64" r="10" />
      <circle class="btview-loader-node btview-loader-node-leaf" cx="64" cy="104" r="10" />
      <line x1="64" y1="36" x2="36" y2="54" class="btview-loader-edge" />
      <line x1="64" y1="36" x2="92" y2="54" class="btview-loader-edge" />
      <line x1="36" y1="74" x2="64" y2="94" class="btview-loader-edge" />
      <line x1="92" y1="74" x2="64" y2="94" class="btview-loader-edge" />
    </svg>
  </div>
  <p class="btview-loader-title">BTView</p>
  <div class="btview-loader-bar" aria-hidden="true"><div class="btview-loader-bar-fill"></div></div>
  <p class="btview-loader-subtitle">Loading behavior tree…</p>
</div>`;

const BOOT_SPLASH_CSS = `
.btview-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:12px;padding:24px;text-align:center;font-family:var(--vscode-font-family,system-ui,sans-serif);color:var(--vscode-editor-foreground,#d4d4d4);background:var(--vscode-editor-background,#1e1e1e)}
.btview-loader-title{margin:0;font-size:15px;font-weight:600;letter-spacing:.04em}
.btview-loader-subtitle{margin:0;font-size:12px;opacity:.75}
.btview-loader-bar{width:min(220px,70vw);height:4px;border-radius:999px;background:var(--vscode-progressBar-background,#3c3c3c);overflow:hidden}
.btview-loader-bar-fill{height:100%;width:35%;border-radius:999px;background:linear-gradient(90deg,#4a9eff,#4ade80,#a78bfa);animation:btview-bar-slide 1.4s ease-in-out infinite}
.btview-loader-node-root{fill:#4a9eff;animation:btview-pulse 1.2s ease-in-out infinite}
.btview-loader-node-left{fill:#4ade80;animation:btview-pulse 1.2s ease-in-out .15s infinite}
.btview-loader-node-right{fill:#4ade80;animation:btview-pulse 1.2s ease-in-out .3s infinite}
.btview-loader-node-leaf{fill:#a78bfa;animation:btview-pulse 1.2s ease-in-out .45s infinite}
.btview-loader-edge{stroke:#6b7280;stroke-width:3;stroke-linecap:round}
@keyframes btview-bar-slide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
@keyframes btview-pulse{0%,100%{opacity:.45;transform:scale(.92)}50%{opacity:1;transform:scale(1)}}
`;

function escapeJsonForScript(json: string): string {
  return json.replace(/</g, '\\u003c');
}

function bootstrapScript(nonce: string, bootstrap: SerializedDocument | null | undefined): string {
  if (!bootstrap) {
    return '';
  }
  const payload = escapeJsonForScript(JSON.stringify({ document: bootstrap }));
  return `<script nonce="${nonce}">window.__BTVIEW_BOOT__=${payload};</script>`;
}

export function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  extensionVersion = '0',
  bootstrap?: SerializedDocument | null,
): string {
  const scriptUri = assetUri(
    webview,
    extensionUri,
    'webview/dist/assets/index.js',
    extensionVersion,
  );
  const styleUri = assetUri(
    webview,
    extensionUri,
    'webview/dist/assets/index.css',
    extensionVersion,
  );
  const nonce = getNonce();
  const csp = buildCsp(webview, nonce);

  const stylePath = path.join(extensionUri.fsPath, 'webview', 'dist', 'assets', 'index.css');
  const hasExternalCss = fs.existsSync(stylePath);
  const styleLink = hasExternalCss ? `<link rel="stylesheet" href="${styleUri}" />` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BTView</title>
  <style>${BOOT_SPLASH_CSS}</style>
  ${styleLink}
  ${bootstrapScript(nonce, bootstrap)}
</head>
<body>
  <div id="root">${BOOT_SPLASH_HTML}</div>
  <script defer nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(extensionUri, 'webview', 'dist'),
      vscode.Uri.joinPath(extensionUri, 'media'),
    ],
  };
}
