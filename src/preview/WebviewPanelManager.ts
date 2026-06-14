import * as vscode from 'vscode';
import { getWebviewHtml, getWebviewOptions } from './webviewHtml';
import type { WebviewOutboundGate } from './WebviewOutboundGate';

export const SIDE_PREVIEW_VIEW_TYPE = 'btview.preview';

interface WebviewBinding {
  webview: vscode.Webview;
  dispose: vscode.Disposable[];
}

export class WebviewPanelManager {
  private readonly bindings = new Map<string, Set<WebviewBinding>>();
  private readonly sidePanels = new Map<string, vscode.WebviewPanel>();

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly extensionVersion: string,
    private readonly outboundGate: WebviewOutboundGate,
    private readonly onWebviewUnbound?: (webview: vscode.Webview) => void,
  ) {}

  bindWebview(uri: vscode.Uri, webview: vscode.Webview, disposables: vscode.Disposable[]): void {
    const key = uri.toString();
    if (!this.bindings.has(key)) {
      this.bindings.set(key, new Set());
    }
    this.bindings.get(key)!.add({ webview, dispose: disposables });
  }

  unbindWebview(uri: vscode.Uri, webview: vscode.Webview): void {
    const key = uri.toString();
    const set = this.bindings.get(key);
    if (!set) {
      return;
    }
    for (const binding of set) {
      if (binding.webview === webview) {
        binding.dispose.forEach((d) => d.dispose());
        this.onWebviewUnbound?.(webview);
        this.outboundGate.dispose(webview);
        set.delete(binding);
        break;
      }
    }
    if (set.size === 0) {
      this.bindings.delete(key);
    }
  }

  hasBindings(uri: vscode.Uri): boolean {
    const set = this.bindings.get(uri.toString());
    return set !== undefined && set.size > 0;
  }

  getWebviews(uri: vscode.Uri): vscode.Webview[] {
    const set = this.bindings.get(uri.toString());
    if (!set) {
      return [];
    }
    return [...set].map((b) => b.webview);
  }

  getOpenUris(): vscode.Uri[] {
    return [...this.bindings.keys()].map((key) => vscode.Uri.parse(key));
  }

  getSidePanel(uri: vscode.Uri): vscode.WebviewPanel | undefined {
    return this.sidePanels.get(uri.toString());
  }

  private setWebviewHtml(webview: vscode.Webview): void {
    this.outboundGate.markNotReady(webview);
    webview.html = getWebviewHtml(webview, this.extensionUri, this.extensionVersion);
  }

  createSidePanel(
    uri: vscode.Uri,
    title: string,
    onDispose: () => void,
    onMessage: (msg: unknown, webview: vscode.Webview) => void,
    onVisible: () => void,
  ): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      SIDE_PREVIEW_VIEW_TYPE,
      title,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        ...getWebviewOptions(this.extensionUri),
        retainContextWhenHidden: true,
      },
    );

    this.sidePanels.set(uri.toString(), panel);

    this.bindWebview(uri, panel.webview, [
      panel.onDidDispose(() => {
        this.unbindWebview(uri, panel.webview);
        this.sidePanels.delete(uri.toString());
        onDispose();
      }),
      panel.onDidChangeViewState(() => {
        if (panel.visible) {
          onVisible();
        }
      }),
      panel.webview.onDidReceiveMessage((msg) => onMessage(msg, panel.webview)),
    ]);

    this.setWebviewHtml(panel.webview);

    return panel;
  }

  setupCustomEditorWebview(
    uri: vscode.Uri,
    webviewPanel: vscode.WebviewPanel,
    onDispose: () => void,
    onMessage: (msg: unknown, webview: vscode.Webview) => void,
    onVisible: () => void,
  ): void {
    webviewPanel.webview.options = getWebviewOptions(this.extensionUri);

    this.bindWebview(uri, webviewPanel.webview, [
      webviewPanel.onDidDispose(() => {
        this.unbindWebview(uri, webviewPanel.webview);
        onDispose();
      }),
      webviewPanel.onDidChangeViewState(() => {
        if (webviewPanel.visible) {
          onVisible();
        }
      }),
      webviewPanel.webview.onDidReceiveMessage((msg) => onMessage(msg, webviewPanel.webview)),
    ]);

    this.setWebviewHtml(webviewPanel.webview);
  }

  reloadAllWebviews(): void {
    for (const uri of this.getOpenUris()) {
      for (const webview of this.getWebviews(uri)) {
        this.setWebviewHtml(webview);
      }
    }
  }

  dispose(): void {
    for (const panel of this.sidePanels.values()) {
      panel.dispose();
    }
    this.sidePanels.clear();
    for (const set of this.bindings.values()) {
      for (const binding of set) {
        binding.dispose.forEach((d) => d.dispose());
        this.outboundGate.dispose(binding.webview);
      }
    }
    this.bindings.clear();
  }
}
