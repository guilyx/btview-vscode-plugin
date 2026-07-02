import * as vscode from 'vscode';
import { BtGraphController } from './preview/BtGraphController';
import { BtCustomEditorProvider } from './preview/BtCustomEditorProvider';
import { resolveTargetUri } from './commands/targetUri';
import { convertToV4 } from './commands/convertToV4';
import { newTree } from './commands/newTree';
import { getOutputChannel, disposeOutputChannel } from './logging/outputChannel';
import { clearRosCache } from './ros/packageResolver';

export function activate(context: vscode.ExtensionContext): void {
  const controller = BtGraphController.getInstance(context.extensionUri);
  controller.registerWorkspaceListeners();
  context.subscriptions.push({ dispose: () => controller.dispose() });

  context.subscriptions.push(
    getOutputChannel(),
    BtCustomEditorProvider.register(context, controller),

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('btview.rosDistro') ||
        e.affectsConfiguration('btview.rosWorkspaceSetup') ||
        e.affectsConfiguration('btview.rosPackageShareOverrides')
      ) {
        clearRosCache();
      }
      if (
        e.affectsConfiguration('btview.nodeTypeMap') ||
        e.affectsConfiguration('btview.defaultFormatVersion') ||
        e.affectsConfiguration('btview.simpleMode') ||
        e.affectsConfiguration('btview.showNodePorts')
      ) {
        void controller.reloadOpenDocuments();
      }
    }),

    vscode.commands.registerCommand('btview.openPreview', (uri?: vscode.Uri) => {
      const target = resolveTargetUri(uri);
      if (target) {
        void controller.openGraphEditor(target);
      } else {
        void vscode.window.showWarningMessage('Open a BTCpp XML file first.');
      }
    }),

    vscode.commands.registerCommand('btview.openPreviewSide', (uri?: vscode.Uri) => {
      const target = resolveTargetUri(uri);
      if (target) {
        void controller.showSidePreview(target);
      } else {
        void vscode.window.showWarningMessage('Open a BTCpp XML file first.');
      }
    }),

    vscode.commands.registerCommand('btview.openSource', (uri?: vscode.Uri) => {
      const target = resolveTargetUri(uri);
      if (target) {
        void controller.openSource(target);
      }
    }),

    vscode.commands.registerCommand('btview.convertToV4', () => {
      const target = resolveTargetUri();
      if (target) {
        void convertToV4(target);
      } else {
        void vscode.window.showWarningMessage('Open a BTCpp XML file first.');
      }
    }),

    vscode.commands.registerCommand('btview.newTree', () => {
      void newTree();
    }),

    vscode.commands.registerCommand('btview.graph.undo', () => {
      void controller.graphUndo();
    }),

    vscode.commands.registerCommand('btview.graph.redo', () => {
      void controller.graphRedo();
    }),

    vscode.commands.registerCommand('btview.exportWorkspaceConfig', () => {
      void controller.exportWorkspaceConfigForActive();
    }),

    vscode.commands.registerCommand('btview.graph.fitView', () => {
      void controller.graphFitView();
    }),

    vscode.commands.registerCommand('btview.graph.toggleLegend', () => {
      void controller.graphToggleLegend();
    }),

    vscode.commands.registerCommand('btview.graph.togglePorts', () => {
      void controller.graphTogglePorts();
    }),

    vscode.commands.registerCommand('btview.graph.focusSearch', () => {
      void controller.graphFocusSearch();
    }),

    vscode.commands.registerCommand('btview.graph.deleteNode', () => {
      void controller.graphDeleteNode();
    }),

    vscode.commands.registerCommand('btview.graph.showShortcutHelp', () => {
      void controller.graphShowShortcutHelp();
    }),

    vscode.commands.registerCommand('btview.verifyTree', () => {
      void controller.verifyActiveTree();
    }),
  );

  const currentVersion = context.extension.packageJSON.version as string;
  const lastVersion = context.globalState.get<string>('btview.extensionVersion');
  if (lastVersion !== currentVersion) {
    void context.globalState.update('btview.extensionVersion', currentVersion);
    void controller.reloadOpenDocuments();
  }
}

export function deactivate(): void {
  disposeOutputChannel();
}
