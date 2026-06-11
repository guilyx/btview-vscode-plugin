import * as vscode from 'vscode';
import { BtGraphController } from './preview/BtGraphController';
import { BtCustomEditorProvider } from './preview/BtCustomEditorProvider';
import { convertToV4, resolveTargetUri } from './preview/BtPreviewManager';

export function activate(context: vscode.ExtensionContext): void {
  const controller = BtGraphController.getInstance(context.extensionUri);

  context.subscriptions.push(
    BtCustomEditorProvider.register(context, controller),

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
  // no-op
}
