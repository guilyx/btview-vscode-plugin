import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { DocumentSyncService, parseWithWorkspaceSettings } from '../sync/DocumentSyncService';
import { validateDocument } from '../btcpp/validation';
import { XmlSyntaxError } from '../btcpp/xmlSyntax';
import { parseWebviewMessage, type HostToWebviewMessage } from '../shared/protocol';
import { logError, logInfo } from '../logging/outputChannel';
import { DiagnosticsService } from '../diagnostics/DiagnosticsService';
import { WebviewPanelManager } from './WebviewPanelManager';
import { DocumentRefreshScheduler } from './DocumentRefreshScheduler';
import { WebviewOutboundGate } from './WebviewOutboundGate';
import { exportWorkspaceConfig } from '../config/exportWorkspaceConfig';
import { Simulator } from '../btcpp/exec/tick';
import type { OutcomeProvider } from '../btcpp/exec/outcomes';
import { verifyTree } from '../btcpp/verify/boundedCheck';

/**
 * Offline "signal firing" model: each leaf reports RUNNING on its first tick and
 * SUCCESS afterward, so stepping walks visibly through the tree one node at a time.
 * A richer mock/random provider can replace this later without touching the wiring.
 */
const oneTickRunning: OutcomeProvider = (_node, ticks) => (ticks < 2 ? 'RUNNING' : 'SUCCESS');

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
  private readonly simulators = new Map<string, Simulator>();
  private readonly webviewDocumentLoaded = new WeakMap<vscode.Webview, boolean>();
  private readonly loadRetryTimers = new WeakMap<vscode.Webview, ReturnType<typeof setInterval>>();
  private readonly textValidationTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
    for (const document of vscode.workspace.textDocuments) {
      this.scheduleTextValidation(document);
    }
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((document) => this.scheduleTextValidation(document)),
      vscode.workspace.onDidChangeTextDocument((e) => {
        this.scheduleTextValidation(e.document);
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
        this.clearTextValidationTimer(doc.uri);
        if (!this.panels.hasBindings(doc.uri)) {
          this.diagnostics.clear(doc.uri);
        }
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          void this.maybeAutoOpen(editor.document);
        }
      }),
    );
  }

  /**
   * Keep Problems-panel diagnostics (and therefore XML quick fixes) live for BTCpp files
   * edited as plain text. Files with an open graph are validated by `refreshUri` instead.
   */
  private scheduleTextValidation(document: vscode.TextDocument): void {
    const scheme = document.uri.scheme;
    if (document.languageId !== 'xml' || (scheme !== 'file' && scheme !== 'untitled')) {
      return;
    }
    if (this.panels.hasBindings(document.uri)) {
      return;
    }
    const key = document.uri.toString();
    this.clearTextValidationTimer(document.uri);
    this.textValidationTimers.set(
      key,
      setTimeout(() => {
        this.textValidationTimers.delete(key);
        void this.validateTextDocument(document);
      }, 300),
    );
  }

  private clearTextValidationTimer(uri: vscode.Uri): void {
    const key = uri.toString();
    const timer = this.textValidationTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.textValidationTimers.delete(key);
    }
  }

  private async validateTextDocument(document: vscode.TextDocument): Promise<void> {
    if (document.isClosed || this.panels.hasBindings(document.uri)) {
      return;
    }
    const text = document.getText();
    if (!looksLikeBtCpp(text)) {
      this.diagnostics.clear(document.uri);
      return;
    }
    try {
      const doc = await parseWithWorkspaceSettings(text, document.uri);
      this.diagnostics.setValidationErrors(document.uri, validateDocument(doc), text);
    } catch (err) {
      this.reportLoadError(document.uri, err);
    }
  }

  private reportLoadError(uri: vscode.Uri, err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);
    this.diagnostics.setLoadError(
      uri,
      message,
      err instanceof XmlSyntaxError ? err.issue : undefined,
    );
    return message;
  }

  /** After the last graph for `uri` closes, fall back to text validation if it is still open. */
  private revalidateOpenText(uri: vscode.Uri): void {
    const open = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
    if (open) {
      this.scheduleTextValidation(open);
    }
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
    for (const timer of this.textValidationTimers.values()) {
      clearTimeout(timer);
    }
    this.textValidationTimers.clear();
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

  /** Opens the BT Graph editor with `treeId` selected (used by the XML CodeLens). */
  async openTreeInGraph(uri: vscode.Uri, treeId: string): Promise<void> {
    this.syncService.setActiveTreeId(uri, treeId);
    await this.refreshUri(uri, false);
    await this.openGraphEditor(uri);
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
    try {
      await this.syncService.loadFromFile(uri);
    } catch {
      // Reported to the webview (and Problems panel) by the refresh below.
    }

    this.panels.createSidePanel(
      uri,
      `BT Graph: ${document.fileName.split(/[/\\]/).pop()}`,
      () => {
        if (!this.panels.hasBindings(uri)) {
          this.syncService.clear(uri);
          this.diagnostics.clear(uri);
          this.initialLoadDone.delete(uri.toString());
          this.revalidateOpenText(uri);
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

    try {
      await this.syncService.loadFromText(document.getText(), uri);
    } catch {
      // Still open the editor: the refresh below shows the load error with a way back to XML.
    }

    this.panels.setupCustomEditorWebview(
      uri,
      webviewPanel,
      () => {
        if (!this.panels.hasBindings(uri)) {
          this.syncService.clear(uri);
          this.diagnostics.clear(uri);
          this.initialLoadDone.delete(uri.toString());
          this.revalidateOpenText(uri);
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

    // A document change invalidates any in-progress simulation; drop it and clear overlays.
    if (this.simulators.delete(uri.toString())) {
      this.postToAllWebviews(uri, {
        type: 'tickUpdate',
        tick: 0,
        rootStatus: 'IDLE',
        statuses: {},
        blackboard: {},
      });
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
      this.diagnostics.setValidationErrors(uri, validationErrors, this.syncService.getText(uri));

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
      logError('Failed to load document', err);
      const message = this.reportLoadError(uri, err);
      const syntax = err instanceof XmlSyntaxError ? err.issue : undefined;
      // Drop the stale model so graph edits cannot overwrite the broken XML.
      this.syncService.clear(uri);
      this.initialLoadDone.delete(uri.toString());
      for (const webview of webviews) {
        this.outboundGate.post(webview, {
          type: 'loadError',
          message: syntax?.message ?? message,
          line: syntax?.line,
          column: syntax?.column,
        });
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
        case 'applyQuickFix': {
          this.scheduler.markSelfEdit(uri);
          const result = await this.syncService.applyQuickFix(uri, msg.issue, msg.fix);
          if (!result.success) {
            // No edit happened: consume the self-edit marker so the next real change refreshes.
            this.scheduler.shouldSkipRefresh(uri);
            const errMsg = result.error?.message ?? 'Quick fix failed';
            this.postToAllWebviews(uri, { type: 'validationError', message: errMsg });
            void vscode.window.showWarningMessage(`BTView: ${errMsg}`);
          }
          await this.refreshUri(uri, false);
          break;
        }
        case 'dismissOnboarding':
          await this.syncService.dismissOnboarding();
          break;
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
        case 'sim':
          if (msg.action === 'step') {
            this.doSimStep(uri);
          } else {
            this.doSimReset(uri);
          }
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

  /** Advance the offline simulation by one tick and broadcast the node statuses. */
  private doSimStep(uri: vscode.Uri): void {
    const doc = this.syncService.getDocument(uri);
    if (!doc) {
      return;
    }
    const key = uri.toString();
    let sim = this.simulators.get(key);
    if (!sim) {
      try {
        sim = new Simulator(doc, {
          treeId: this.syncService.getActiveTreeId(uri),
          outcome: oneTickRunning,
        });
      } catch (err) {
        this.postToAllWebviews(uri, {
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
        return;
      }
      this.simulators.set(key, sim);
    }
    const result = sim.tick();
    this.postToAllWebviews(uri, {
      type: 'tickUpdate',
      tick: result.tick,
      rootStatus: result.rootStatus,
      statuses: result.statuses,
      blackboard: result.blackboard,
    });
  }

  /** Stop the simulation and clear all status overlays. */
  private doSimReset(uri: vscode.Uri): void {
    this.simulators.delete(uri.toString());
    this.postToAllWebviews(uri, {
      type: 'tickUpdate',
      tick: 0,
      rootStatus: 'IDLE',
      statuses: {},
      blackboard: {},
    });
  }

  async simStep(): Promise<void> {
    const uri = this.getActiveBtUri();
    if (uri) {
      this.doSimStep(uri);
    }
  }

  async simReset(): Promise<void> {
    const uri = this.getActiveBtUri();
    if (uri) {
      this.doSimReset(uri);
    }
  }

  /** Run the bounded exhaustive verifier on the active tree and report the results. */
  async verifyActiveTree(): Promise<void> {
    const uri = this.getActiveBtUri();
    if (!uri) {
      void vscode.window.showWarningMessage('Open a BT Graph editor first.');
      return;
    }
    const doc = this.syncService.getDocument(uri);
    if (!doc) {
      return;
    }
    const results = verifyTree(doc, { treeId: this.syncService.getActiveTreeId(uri) });
    const lines = results.map(
      (r) =>
        `${r.holds ? '✓' : '✗'} ${r.property}${r.note ? ` — ${r.note}` : ''} (${r.checked} runs)`,
    );
    logInfo(`BTView verify:\n${lines.join('\n')}`);
    void vscode.window.showInformationMessage(`BTView verification — ${lines.join('  |  ')}`);
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
