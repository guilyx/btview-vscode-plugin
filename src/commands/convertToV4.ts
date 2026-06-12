import * as vscode from 'vscode';
import { migrateV3ToV4 } from '../btcpp/migrateV3ToV4';
import { logError, logInfo } from '../logging/outputChannel';

export async function convertToV4(uri: vscode.Uri): Promise<void> {
  try {
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
      logInfo(`Migration warnings: ${warnings.join('; ')}`);
      void vscode.window.showWarningMessage(
        `Migration completed with ${warnings.length} warning(s). Review the diff before saving.`,
      );
    }
  } catch (err) {
    logError('v3 → v4 migration failed', err);
    void vscode.window.showErrorMessage(
      `Migration failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
