import * as vscode from 'vscode';
import { getSerializeNewFilesAs } from '../config/settings';
import { getBuiltinControls } from '../btcpp/nodeRegistry';
import { buildNewTreeXml } from '../btcpp/treeTemplate';

export async function newTree(): Promise<void> {
  const defaultFormat = getSerializeNewFilesAs();

  const formatPick = await vscode.window.showQuickPick(
    [
      { label: 'BTCpp v4', description: 'Recommended', value: 4 as const },
      { label: 'BTCpp v3.8', value: 3 as const },
    ],
    {
      title: 'New Behavior Tree — format',
      placeHolder: `Select format (default: v${defaultFormat})`,
    },
  );
  if (!formatPick) {
    return;
  }

  const treeId = await vscode.window.showInputBox({
    title: 'New Behavior Tree — tree ID',
    prompt: 'BehaviorTree ID attribute',
    value: 'MainTree',
    validateInput: (v) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(v) ? null : 'Invalid tree ID'),
  });
  if (!treeId) {
    return;
  }

  const startMode = await vscode.window.showQuickPick(
    [
      {
        label: 'Empty canvas',
        description: 'Open graph with no root node; drag a control from the palette',
        value: 'empty' as const,
      },
      {
        label: 'With root control',
        description: 'Pre-create a root control node in XML',
        value: 'root' as const,
      },
    ],
    { title: 'New Behavior Tree — start mode', placeHolder: 'How should the tree start?' },
  );
  if (!startMode) {
    return;
  }

  let rootControl: string | undefined;
  if (startMode.value === 'root') {
    const controls = getBuiltinControls(formatPick.value);
    const rootPick = await vscode.window.showQuickPick(
      controls.map((id) => ({ label: id, value: id })),
      {
        title: 'New Behavior Tree — root control',
        placeHolder: 'Select root node type',
      },
    );
    if (!rootPick) {
      return;
    }
    rootControl = rootPick.value;
  }

  const uri = await vscode.window.showSaveDialog({
    filters: { 'Behavior Tree XML': ['xml'] },
    saveLabel: 'Create Behavior Tree',
  });
  if (!uri) {
    return;
  }

  const content = buildNewTreeXml({
    formatVersion: formatPick.value,
    treeId,
    mainTreeId: treeId,
    rootControl,
    emptyCanvas: startMode.value === 'empty',
  });

  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
  const doc = await vscode.workspace.openTextDocument(uri);

  const openMode = vscode.workspace
    .getConfiguration('btview')
    .get<'text' | 'graph' | 'side'>('defaultOpenMode', 'text');

  if (openMode === 'graph') {
    await vscode.commands.executeCommand('vscode.openWith', uri, 'btview.graph');
  } else if (openMode === 'side') {
    await vscode.commands.executeCommand('btview.openPreviewSide', uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  } else {
    await vscode.window.showTextDocument(doc);
  }
}
