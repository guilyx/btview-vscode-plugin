import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

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

export function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  extensionVersion = '0',
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

  const distHtmlPath = path.join(extensionUri.fsPath, 'webview', 'dist', 'index.html');
  if (fs.existsSync(distHtmlPath)) {
    const raw = fs.readFileSync(distHtmlPath, 'utf8');
    let html = raw
      .replace(
        '<head>',
        `<head>
  <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      )
      .replace(/\s*<meta name="viewport"[^>]*>/, '')
      .replace(
        /<script[^>]*src="\.\/assets\/index\.js"[^>]*><\/script>/,
        `<script nonce="${nonce}" src="${scriptUri}"></script>`,
      )
      .replace(
        '<div id="root"></div>',
        `<div id="root"><p class="loading" role="status">Loading behavior tree…</p></div>`,
      );

    if (hasExternalCss) {
      html = html.replace(
        /<link rel="stylesheet"[^>]*href="\.\/assets\/index\.css"[^>]*>/,
        styleLink,
      );
    } else {
      html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/index\.css"[^>]*>/, '');
    }
    return html;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${styleLink}
  <title>BTView</title>
</head>
<body>
  <div id="root"><p class="loading" role="status">Loading behavior tree…</p></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
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
