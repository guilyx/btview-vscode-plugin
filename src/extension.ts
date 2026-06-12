import * as vscode from 'vscode';
import { BtGraphController } from './preview/BtGraphController';
import { BtCustomEditorProvider } from './preview/BtCustomEditorProvider';
import { resolveTargetUri } from './commands/targetUri';
import { convertToV4 } from './commands/convertToV4';
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
      if (e.affectsConfiguration('btview.rosDistro') || e.affectsConfiguration('btview.rosWorkspaceSetup') || e.affectsConfiguration('btview.rosPackageShareOverrides')) {
        clearRosCache();
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
  );
}

export function deactivate(): void {
  disposeOutputChannel();
}
