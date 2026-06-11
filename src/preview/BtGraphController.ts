import * as vscode from 'vscode';
import { DocumentSyncService } from '../sync/DocumentSyncService';
import { getWebviewHtml, getWebviewOptions } from './webviewHtml';

export const CUSTOM_EDITOR_VIEW_TYPE = 'btview.graph';
export const SIDE_PREVIEW_VIEW_TYPE = 'btview.preview';

export function looksLikeBtCpp(text: string): boolean {
  return /<root\b/i.test(text) && /<BehaviorTree\b/i.test(text);
}

interface WebviewBinding {
  webview: vscode.Webview;
  dispose: vscode.Disposable[];
}

export class BtGraphController {
  private static instance: BtGraphController | undefined;

  private readonly syncService = new DocumentSyncService();
  private readonly bindings = new Map<string, Set<WebviewBinding>>();
  private readonly sidePanels = new Map<string, vscode.WebviewPanel>();
  private readonly changeDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly autoOpened = new Set<string>();

  static getInstance(extensionUri: vscode.Uri): BtGraphController {
    if (!BtGraphController.instance) {
      BtGraphController.instance = new BtGraphController(extensionUri);
    }
    return BtGraphController.instance;
  }

  private constructor(private readonly extensionUri: vscode.Uri) {
    vscode.workspace.onDidChangeTextDocument((e) => {
      this.scheduleRefresh(e.document.uri);
    });

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        void this.maybeAutoOpen(editor.document);
      }
    });
  }

  getSyncService(): DocumentSyncService {
    return this.syncService;
  }

  async openGraphEditor(uri: vscode.Uri, column?: vscode.ViewColumn): Promise<void> {
    await vscode.commands.executeCommand(
      'vscode.openWith',
      uri,
      CUSTOM_EDITOR_VIEW_TYPE,
      column ?? vscode.ViewColumn.Active,
    );
  }

  async openSource(uri: vscode.Uri): Promise<void> {
    await vscode.commands.executeCommand(
      'vscode.openWith',
      uri,
      'default',
      vscode.ViewColumn.Active,
    );
  }

  async showSidePreview(uri: vscode.Uri): Promise<void> {
    const key = uri.toString();
    const existing = this.sidePanels.get(key);
    if (existing) {
      existing.reveal(vscode.ViewColumn.Beside, true);
      await this.refreshUri(uri);
      return;
    }

    const document = await vscode.workspace.openTextDocument(uri);
    const panel = vscode.window.createWebviewPanel(
      SIDE_PREVIEW_VIEW_TYPE,
      `BT Graph: ${document.fileName.split(/[/\\]/).pop()}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        ...getWebviewOptions(this.extensionUri),
        retainContextWhenHidden: true,
      },
    );

    this.sidePanels.set(key, panel);
    this.bindWebview(uri, panel.webview, [
      panel.onDidDispose(() => {
        this.unbindWebview(uri, panel.webview);
        this.sidePanels.delete(key);
        if (!this.hasBindings(uri)) {
          this.syncService.clear(uri);
        }
      }),
      panel.onDidChangeViewState(() => {
        if (panel.visible) {
          void this.refreshUri(uri);
        }
      }),
      panel.webview.onDidReceiveMessage((msg) => {
        void this.handleMessage(uri, msg);
      }),
    ]);

    panel.webview.html = getWebviewHtml(panel.webview, this.extensionUri);
    await this.refreshUri(uri);
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (token.isCancellationRequested) {
      return;
    }
    const uri = document.uri;
    webviewPanel.webview.options = getWebviewOptions(this.extensionUri);

    this.bindWebview(uri, webviewPanel.webview, [
      webviewPanel.onDidDispose(() => {
        this.unbindWebview(uri, webviewPanel.webview);
        if (!this.hasBindings(uri)) {
          this.syncService.clear(uri);
        }
      }),
      webviewPanel.onDidChangeViewState(() => {
        if (webviewPanel.visible) {
          void this.refreshUri(uri);
        }
      }),
      webviewPanel.webview.onDidReceiveMessage((msg) => {
        void this.handleMessage(uri, msg);
      }),
    ]);

    webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, this.extensionUri);
    await this.refreshUri(uri);
  }

  private bindWebview(
    uri: vscode.Uri,
    webview: vscode.Webview,
    disposables: vscode.Disposable[],
  ): void {
    const key = uri.toString();
    if (!this.bindings.has(key)) {
      this.bindings.set(key, new Set());
    }
    this.bindings.get(key)!.add({ webview, dispose: disposables });
  }

  private unbindWebview(uri: vscode.Uri, webview: vscode.Webview): void {
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

  private hasBindings(uri: vscode.Uri): boolean {
    const set = this.bindings.get(uri.toString());
    return set !== undefined && set.size > 0;
  }

  private scheduleRefresh(uri: vscode.Uri): void {
    const key = uri.toString();
    if (!this.hasBindings(uri)) {
      return;
    }

    const existing = this.changeDebounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    this.changeDebounceTimers.set(
      key,
      setTimeout(() => {
        void this.refreshUri(uri);
      }, 150),
    );
  }

  async refreshUri(uri: vscode.Uri): Promise<void> {
    const key = uri.toString();
    const set = this.bindings.get(key);
    if (!set || set.size === 0) {
      return;
    }

    try {
      await this.syncService.loadFromFile(uri);
      const payload = this.syncService.serializeForWebview(uri);
      if (!payload) {
        return;
      }
      for (const { webview } of set) {
        webview.postMessage({ type: 'loadDocument', document: payload });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const { webview } of set) {
        webview.postMessage({ type: 'error', message });
      }
    }
  }

  private async handleMessage(uri: vscode.Uri, msg: Record<string, unknown>): Promise<void> {
    switch (msg.type) {
      case 'selectTree':
        this.syncService.setActiveTreeId(uri, msg.treeId as string);
        await this.refreshUri(uri);
        break;
      case 'editNode':
        await this.syncService.applyEdit(uri, {
          type: 'editNode',
          treeId: msg.treeId as string,
          path: msg.path as string,
          attr: msg.attr as string,
          value: msg.value as string,
        });
        await this.refreshUri(uri);
        break;
      case 'addNode':
        await this.syncService.applyEdit(uri, {
          type: 'addNode',
          treeId: msg.treeId as string,
          parentPath: msg.parentPath as string,
          registeredId: msg.registeredId as string,
          kind: msg.kind as string,
        });
        await this.refreshUri(uri);
        break;
      case 'deleteNode':
        await this.syncService.applyEdit(uri, {
          type: 'deleteNode',
          treeId: msg.treeId as string,
          path: msg.path as string,
        });
        await this.refreshUri(uri);
        break;
      case 'reparentNode':
        await this.syncService.applyEdit(uri, {
          type: 'reparentNode',
          treeId: msg.treeId as string,
          sourcePath: msg.sourcePath as string,
          targetPath: msg.targetPath as string,
          index: msg.index as number | undefined,
        });
        await this.refreshUri(uri);
        break;
      case 'reorderChildren':
        await this.syncService.applyEdit(uri, {
          type: 'reorderChildren',
          treeId: msg.treeId as string,
          parentPath: msg.parentPath as string,
          order: msg.order as string[],
        });
        await this.refreshUri(uri);
        break;
      case 'openInclude': {
        const target = msg.resolvedUri as string | undefined;
        if (target) {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(target));
          await vscode.window.showTextDocument(doc);
        }
        break;
      }
      case 'ready':
        await this.refreshUri(uri);
        break;
      default:
        break;
    }
  }

  async maybeAutoOpen(document: vscode.TextDocument): Promise<void> {
    if (document.languageId !== 'xml') {
      return;
    }

    const key = document.uri.toString();
    if (this.autoOpened.has(key)) {
      return;
    }

    const mode = vscode.workspace
      .getConfiguration('btview')
      .get<'text' | 'graph' | 'side'>('defaultOpenMode', 'text');

    if (mode === 'text') {
      return;
    }

    if (!looksLikeBtCpp(document.getText())) {
      return;
    }

    this.autoOpened.add(key);

    if (mode === 'graph') {
      await this.openGraphEditor(document.uri);
    } else if (mode === 'side') {
      await this.showSidePreview(document.uri);
    }
  }
}
