import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { DocumentSyncService } from '../sync/DocumentSyncService';
import { parseWebviewMessage, type HostToWebviewMessage } from '../shared/protocol';
import { logError, logInfo } from '../logging/outputChannel';
import { DiagnosticsService } from '../diagnostics/DiagnosticsService';
import { WebviewPanelManager } from './WebviewPanelManager';
import { DocumentRefreshScheduler } from './DocumentRefreshScheduler';
import { WebviewOutboundGate } from './WebviewOutboundGate';
import { exportWorkspaceConfig } from '../config/exportWorkspaceConfig';

export const CUSTOM_EDITOR_VIEW_TYPE = 'btview.graph';

function readExtensionVersion(extensionUri: vscode.Uri): string {
  try {
    const pkgPath = path.join(extensionUri.fsPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0';
  } catch {
    return '0';
  }
}

export function looksLikeBtCpp(text: string): boolean {
  return /<root\b/i.test(text) && /<BehaviorTree\b/i.test(text);
}

export class BtGraphController {
  private static instance: BtGraphController | undefined;

  private readonly syncService = new DocumentSyncService();
  private readonly outboundGate = new WebviewOutboundGate();
  private readonly panels: WebviewPanelManager;
  private readonly scheduler = new DocumentRefreshScheduler();
  private readonly diagnostics = new DiagnosticsService();
  private initialLoadDone = new Map<string, boolean>();
  private readonly webviewDocumentLoaded = new WeakMap<vscode.Webview, boolean>();
  private readonly loadRetryTimers = new WeakMap<vscode.Webview, ReturnType<typeof setInterval>>();

  private disposables: vscode.Disposable[] = [];

  static getInstance(extensionUri: vscode.Uri): BtGraphController {
    if (!BtGraphController.instance) {
      BtGraphController.instance = new BtGraphController(extensionUri);
    }
    return BtGraphController.instance;
  }

  private constructor(extensionUri: vscode.Uri) {
    const version = readExtensionVersion(extensionUri);
    this.panels = new WebviewPanelManager(
      extensionUri,
      version,
      this.outboundGate,
      (webview) => this.onWebviewUnbound(webview),
      (uri) => this.syncService.serializeForWebview(uri),
    );
  }

  private onWebviewUnbound(webview: vscode.Webview): void {
    this.clearLoadRetry(webview);
    this.webviewDocumentLoaded.delete(webview);
  }

  private clearLoadRetry(webview: vscode.Webview): void {
    const timer = this.loadRetryTimers.get(webview);
    if (timer) {
      clearInterval(timer);
      this.loadRetryTimers.delete(webview);
    }
  }

  private scheduleLoadRetry(uri: vscode.Uri, webview: vscode.Webview): void {
    this.clearLoadRetry(webview);
    let attempts = 0;
    const timer = setInterval(() => {
      if (this.webviewDocumentLoaded.get(webview) || attempts >= 20) {
        this.clearLoadRetry(webview);
        return;
      }
      attempts += 1;
      void this.refreshUri(uri, true, true);
    }, 500);
    this.loadRetryTimers.set(webview, timer);
  }

  registerWorkspaceListeners(): void {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (this.scheduler.shouldSkipRefresh(e.document.uri)) {
          return;
        }
        this.scheduler.schedule(e.document.uri, this.panels.hasBindings(e.document.uri), () => {
          void this.refreshUri(e.document.uri, false);
        });
      }),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.scheduler.unmarkAutoOpened(doc.uri);
        this.scheduler.clearTimer(doc.uri);
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          void this.maybeAutoOpen(editor.document);
        }
      }),
    );
  }

  getSyncService(): DocumentSyncService {
    return this.syncService;
  }

  getDiagnosticsService(): DiagnosticsService {
    return this.diagnostics;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.scheduler.dispose();
    this.panels.dispose();
    this.diagnostics.dispose();
    BtGraphController.instance = undefined;
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
    const existing = this.panels.getSidePanel(uri);
    if (existing) {
      existing.reveal(vscode.ViewColumn.Beside, true);
      await this.refreshUri(uri, false);
      return;
    }

    const document = await vscode.workspace.openTextDocument(uri);
    await this.syncService.loadFromFile(uri);

    this.panels.createSidePanel(
      uri,
      `BT Graph: ${document.fileName.split(/[/\\]/).pop()}`,
      () => {
        if (!this.panels.hasBindings(uri)) {
          this.syncService.clear(uri);
          this.diagnostics.clear(uri);
          this.initialLoadDone.delete(uri.toString());
        }
      },
      (msg, webview) => {
        void this.handleMessage(uri, msg, webview);
      },
      () => {
        void this.refreshUri(uri, false);
      },
    );

    await this.refreshUri(uri, true);
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

    await this.syncService.loadFromText(document.getText(), uri);

    this.panels.setupCustomEditorWebview(
      uri,
      webviewPanel,
      () => {
        if (!this.panels.hasBindings(uri)) {
          this.syncService.clear(uri);
          this.diagnostics.clear(uri);
          this.initialLoadDone.delete(uri.toString());
        }
      },
      (msg, webview) => {
        void this.handleMessage(uri, msg, webview);
      },
      () => {
        void this.refreshUri(uri, false);
      },
    );

    await this.refreshUri(uri, true, true);
  }

  async reloadOpenDocuments(): Promise<void> {
    const openUris = this.panels.getOpenUris();
    if (openUris.length === 0) {
      return;
    }

    for (const uri of openUris) {
      this.syncService.clear(uri);
      this.initialLoadDone.delete(uri.toString());
      try {
        await this.syncService.loadFromFile(uri);
      } catch (err) {
        logError(`Failed to reload ${uri.fsPath}`, err);
      }
    }
    this.panels.reloadAllWebviews();
  }

  async refreshUri(uri: vscode.Uri, isInitial: boolean, forceLoadDocument = false): Promise<void> {
    const webviews = this.panels.getWebviews(uri);
    if (webviews.length === 0) {
      return;
    }

    try {
      await this.syncService.loadFromFile(uri);
      const payload = this.syncService.serializeForWebview(uri);
      if (!payload) {
        const message = 'Document failed to load (empty parse result).';
        logError(message);
        for (const webview of webviews) {
          this.outboundGate.post(webview, { type: 'error', message });
        }
        return;
      }

      const validationErrors = this.syncService.getValidationErrors(uri);
      this.diagnostics.setValidationErrors(uri, validationErrors);

      const key = uri.toString();
      const firstLoad = !this.initialLoadDone.has(key);
      const msgType =
        forceLoadDocument || isInitial || firstLoad ? 'loadDocument' : 'documentChanged';
      if (firstLoad) {
        this.initialLoadDone.set(key, true);
      }

      const message: HostToWebviewMessage = { type: msgType, document: payload };
      const readyFlags = webviews.map((w) => this.outboundGate.isReady(w)).join(',');
      logInfo(
        `BTView: push ${msgType} to ${webviews.length} webview(s) for ${uri.fsPath} (ready=${readyFlags})`,
      );
      for (const webview of webviews) {
        this.outboundGate.post(webview, message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Failed to load document', err);
      for (const webview of webviews) {
        this.outboundGate.post(webview, { type: 'error', message });
      }
    }
  }

  private postToAllWebviews(uri: vscode.Uri, message: HostToWebviewMessage): void {
    for (const webview of this.panels.getWebviews(uri)) {
      this.outboundGate.post(webview, message);
    }
  }

  private async handleMessage(
    uri: vscode.Uri,
    raw: unknown,
    sourceWebview: vscode.Webview,
  ): Promise<void> {
    const msg = parseWebviewMessage(raw);
    if (!msg) {
      return;
    }

    try {
      switch (msg.type) {
        case 'selectTree':
          this.syncService.setActiveTreeId(uri, msg.treeId);
          await this.refreshUri(uri, false);
          break;
        case 'editNode':
        case 'changeNodeType':
        case 'addNode':
        case 'deleteNode':
        case 'reparentNode':
        case 'reorderChildren':
        case 'pasteSubtree':
        case 'removePort':
        case 'addModel':
        case 'deleteModel': {
          this.scheduler.markSelfEdit(uri);
          const result = await this.syncService.applyEdit(uri, msg);
          if (!result.success) {
            const errMsg = result.error?.message ?? 'Edit failed';
            this.postToAllWebviews(uri, { type: 'validationError', message: errMsg });
            void vscode.window.showErrorMessage(`BTView: ${errMsg}`);
            return;
          }
          await this.refreshUri(uri, false);
          break;
        }
        case 'openInclude': {
          const target = msg.resolvedUri;
          if (target) {
            try {
              const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(target));
              await vscode.window.showTextDocument(doc);
            } catch (err) {
              logError('Failed to open include', err);
              void vscode.window.showErrorMessage(
                `Failed to open include: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
          break;
        }
        case 'openSource':
          await this.openSource(uri);
          break;
        case 'goToSource':
          await this.openSource(uri);
          break;
        case 'openGraphSide':
          await this.showSidePreview(uri);
          break;
        case 'undo': {
          this.scheduler.markSelfEdit(uri);
          const undoResult = await this.syncService.undo(uri);
          if (!undoResult.success) {
            const errMsg = undoResult.error?.message ?? 'Undo failed';
            this.postToAllWebviews(uri, { type: 'validationError', message: errMsg });
            return;
          }
          await this.refreshUri(uri, false);
          break;
        }
        case 'redo': {
          this.scheduler.markSelfEdit(uri);
          const redoResult = await this.syncService.redo(uri);
          if (!redoResult.success) {
            const errMsg = redoResult.error?.message ?? 'Redo failed';
            this.postToAllWebviews(uri, { type: 'validationError', message: errMsg });
            return;
          }
          await this.refreshUri(uri, false);
          break;
        }
        case 'exportWorkspaceConfig': {
          const doc = this.syncService.getDocument(uri);
          const folder = vscode.workspace.getWorkspaceFolder(uri);
          if (doc && folder) {
            await exportWorkspaceConfig(doc, folder);
          } else {
            void vscode.window.showWarningMessage(
              'BTView: open a workspace folder to export config.',
            );
          }
          break;
        }
        case 'saveLayout':
          this.syncService.saveLayoutPositions(uri, msg.treeId, msg.positions);
          await this.refreshUri(uri, false);
          break;
        case 'resetLayout':
          this.syncService.resetLayout(uri, msg.treeId);
          await this.refreshUri(uri, false);
          break;
        case 'ready':
          logInfo(`BTView: webview ready for ${uri.fsPath}`);
          this.webviewDocumentLoaded.set(sourceWebview, false);
          this.outboundGate.markReady(sourceWebview);
          await this.refreshUri(uri, true, true);
          this.scheduleLoadRetry(uri, sourceWebview);
          break;
        case 'loaded':
          logInfo(`BTView: webview loaded document for ${uri.fsPath}`);
          this.webviewDocumentLoaded.set(sourceWebview, true);
          this.clearLoadRetry(sourceWebview);
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Webview message handler failed', err);
      this.postToAllWebviews(uri, { type: 'error', message });
      void vscode.window.showErrorMessage(`BTView: ${message}`);
    }
  }

  private getActiveBtUri(): vscode.Uri | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      return editor.document.uri;
    }
    const open = this.panels.getOpenUris();
    return open[0];
  }

  async graphUndo(): Promise<void> {
    const uri = this.getActiveBtUri();
    if (!uri) {
      return;
    }
    this.scheduler.markSelfEdit(uri);
    const result = await this.syncService.undo(uri);
    if (result.success) {
      await this.refreshUri(uri, false);
    }
  }

  async graphRedo(): Promise<void> {
    const uri = this.getActiveBtUri();
    if (!uri) {
      return;
    }
    this.scheduler.markSelfEdit(uri);
    const result = await this.syncService.redo(uri);
    if (result.success) {
      await this.refreshUri(uri, false);
    }
  }

  async exportWorkspaceConfigForActive(): Promise<void> {
    const uri = this.getActiveBtUri();
    if (!uri) {
      void vscode.window.showWarningMessage('Open a BT Graph editor first.');
      return;
    }
    const doc = this.syncService.getDocument(uri);
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (doc && folder) {
      await exportWorkspaceConfig(doc, folder);
    }
  }

  async invokeGraphAction(action: import('../shared/protocol').GraphAction): Promise<void> {
    const uri = this.getActiveBtUri();
    if (!uri) {
      return;
    }
    this.postToAllWebviews(uri, { type: 'graphAction', action });
  }

  async graphDeleteNode(): Promise<void> {
    await this.invokeGraphAction('deleteNode');
  }

  async graphFitView(): Promise<void> {
    await this.invokeGraphAction('fitView');
  }

  async graphToggleLegend(): Promise<void> {
    await this.invokeGraphAction('toggleLegend');
  }

  async graphTogglePorts(): Promise<void> {
    await this.invokeGraphAction('togglePorts');
  }

  async graphFocusSearch(): Promise<void> {
    await this.invokeGraphAction('focusSearch');
  }

  async graphShowShortcutHelp(): Promise<void> {
    await this.invokeGraphAction('showShortcutHelp');
  }

  async maybeAutoOpen(document: vscode.TextDocument): Promise<void> {
    if (document.languageId !== 'xml') {
      return;
    }

    if (this.scheduler.wasAutoOpened(document.uri)) {
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

    this.scheduler.markAutoOpened(document.uri);

    if (mode === 'graph') {
      await this.openGraphEditor(document.uri);
    } else if (mode === 'side') {
      await this.showSidePreview(document.uri);
    }
  }
}
