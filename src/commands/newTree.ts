import * as vscode from 'vscode';
import { getSerializeNewFilesAs } from '../config/settings';

function emptyTreeTemplate(formatVersion: 3 | 4): string {
  if (formatVersion === 4) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence/>
  </BehaviorTree>
</root>
`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<root main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence/>
  </BehaviorTree>
</root>
`;
}

export async function newTree(): Promise<void> {
  const formatVersion = getSerializeNewFilesAs() === '3' ? 3 : 4;
  const uri = await vscode.window.showSaveDialog({
    filters: { 'Behavior Tree XML': ['xml'] },
    saveLabel: 'Create Behavior Tree',
  });
  if (!uri) {
    return;
  }

  const content = emptyTreeTemplate(formatVersion);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
}
