import * as vscode from 'vscode';
import { getWebviewHtml, getWebviewOptions } from './webviewHtml';

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

  createSidePanel(
    uri: vscode.Uri,
    title: string,
    onDispose: () => void,
    onMessage: (msg: unknown) => void,
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
    panel.webview.html = getWebviewHtml(panel.webview, this.extensionUri, this.extensionVersion);

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
      panel.webview.onDidReceiveMessage(onMessage),
    ]);

    return panel;
  }

  setupCustomEditorWebview(
    uri: vscode.Uri,
    webviewPanel: vscode.WebviewPanel,
    onDispose: () => void,
    onMessage: (msg: unknown) => void,
    onVisible: () => void,
  ): void {
    webviewPanel.webview.options = getWebviewOptions(this.extensionUri);
    webviewPanel.webview.html = getWebviewHtml(
      webviewPanel.webview,
      this.extensionUri,
      this.extensionVersion,
    );

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
      webviewPanel.webview.onDidReceiveMessage(onMessage),
    ]);
  }

  reloadAllWebviews(): void {
    for (const uri of this.getOpenUris()) {
      for (const webview of this.getWebviews(uri)) {
        webview.html = getWebviewHtml(webview, this.extensionUri, this.extensionVersion);
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
      }
    }
    this.bindings.clear();
  }
}
