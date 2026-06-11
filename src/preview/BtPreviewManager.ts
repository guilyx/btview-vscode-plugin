import * as vscode from 'vscode';
import { migrateV3ToV4 } from '../btcpp/migrateV3ToV4';
import { BtGraphController } from './BtGraphController';

/** @deprecated Use BtGraphController directly */
export class BtPreviewManager {
  private static instance: BtPreviewManager | undefined;

  static getInstance(extensionUri: vscode.Uri): BtPreviewManager {
    if (!BtPreviewManager.instance) {
      BtPreviewManager.instance = new BtPreviewManager(BtGraphController.getInstance(extensionUri));
    }
    return BtPreviewManager.instance;
  }

  private constructor(private readonly controller: BtGraphController) {}

  showPreview(uri: vscode.Uri, beside: boolean): Promise<void> {
    if (beside) {
      return this.controller.showSidePreview(uri);
    }
    return this.controller.openGraphEditor(uri);
  }

  convertToV4(uri: vscode.Uri): Promise<void> {
    return convertToV4(uri);
  }
}

export async function convertToV4(uri: vscode.Uri): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  const { xml, warnings } = migrateV3ToV4(doc.getText());

  await vscode.workspace
    .openTextDocument({ language: 'xml', content: xml })
    .then(async (migratedDoc) => {
      await vscode.commands.executeCommand(
        'vscode.diff',
        uri,
        migratedDoc.uri,
        'BTCpp v3 → v4 Migration Preview',
      );
    });

  if (warnings.length > 0) {
    vscode.window.showWarningMessage(
      `Migration completed with ${warnings.length} warning(s). Review the diff before saving.`,
    );
  }
}

export function resolveTargetUri(fallback?: vscode.Uri): vscode.Uri | undefined {
  if (fallback) {
    return fallback;
  }

  const editor = vscode.window.activeTextEditor;
  if (editor?.document.languageId === 'xml') {
    return editor.document.uri;
  }

  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (tab?.input instanceof vscode.TabInputCustom) {
    return tab.input.uri;
  }
  if (tab?.input instanceof vscode.TabInputText) {
    return tab.input.uri;
  }

  return undefined;
}
