import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { BtDocument } from '../btcpp/types';
import { collectNodeTypeMap } from '../btcpp/portResolution';
import { serializeDocument } from '../btcpp/serializer';

function modelsOnlyDocument(doc: BtDocument): BtDocument {
  return {
    formatVersion: doc.formatVersion,
    mainTreeToExecute: undefined,
    trees: [{ id: 'ExportedModels', root: null }],
    models: doc.models,
    includes: [],
    warnings: [],
  };
}

export async function exportWorkspaceConfig(
  doc: BtDocument,
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<void> {
  const nodeTypeMap = collectNodeTypeMap(doc);
  const config = vscode.workspace.getConfiguration('btview', workspaceFolder.uri);
  const existing = config.get<Record<string, string>>('nodeTypeMap') ?? {};

  const merged = { ...existing, ...nodeTypeMap };
  await config.update('nodeTypeMap', merged, vscode.ConfigurationTarget.Workspace);

  const modelsPath = config.get<string>('customModelsInclude') || '.btview/models.xml';
  const modelsFile = path.join(workspaceFolder.uri.fsPath, modelsPath);
  fs.mkdirSync(path.dirname(modelsFile), { recursive: true });

  const modelsDoc = modelsOnlyDocument(doc);
  const xml = serializeDocument(modelsDoc);
  fs.writeFileSync(modelsFile, xml, 'utf8');

  const open = await vscode.window.showInformationMessage(
    `BTView: exported ${Object.keys(nodeTypeMap).length} custom type(s) to workspace settings and ${modelsPath}`,
    'Open settings',
    'Open models file',
  );

  if (open === 'Open settings') {
    await vscode.commands.executeCommand('workbench.action.openWorkspaceSettingsFile');
  } else if (open === 'Open models file') {
    const uri = vscode.Uri.file(modelsFile);
    const textDoc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(textDoc);
  }
}
