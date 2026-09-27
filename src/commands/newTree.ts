import * as vscode from 'vscode';
import { getSerializeNewFilesAs } from '../config/settings';
import { getBuiltinControls } from '../btcpp/nodeRegistry';
import { buildNewTreeXml } from '../btcpp/treeTemplate';

/**
 * Optional arguments for `btview.newTree` (scripts, keybindings, tests). When `uri` is
 * given the command runs without prompts, using defaults for anything omitted.
 */
export interface NewTreeArgs {
  uri?: vscode.Uri;
  formatVersion?: 3 | 4;
  treeId?: string;
  /** Root control ID; omit for an empty canvas. */
  rootControl?: string;
  /** Where to open the new file (defaults to the empty-canvas aware choice below). */
  openIn?: 'text' | 'graph' | 'side';
}

const TREE_ID_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export async function newTree(args: NewTreeArgs = {}): Promise<vscode.Uri | undefined> {
  const spec = args.uri ? resolveArgs(args) : await promptForSpec();
  if (!spec) {
    return undefined;
  }

  const content = buildNewTreeXml({
    formatVersion: spec.formatVersion,
    treeId: spec.treeId,
    mainTreeId: spec.treeId,
    rootControl: spec.rootControl,
    emptyCanvas: !spec.rootControl,
  });

  await vscode.workspace.fs.writeFile(spec.uri, Buffer.from(content, 'utf8'));
  const doc = await vscode.workspace.openTextDocument(spec.uri);

  const configured = vscode.workspace
    .getConfiguration('btview')
    .get<'text' | 'graph' | 'side'>('defaultOpenMode', 'text');
  // An empty canvas is only useful in the graph, so open it there even in text mode.
  const openIn = args.openIn ?? (configured === 'text' && !spec.rootControl ? 'graph' : configured);

  if (openIn === 'graph') {
    await vscode.commands.executeCommand('vscode.openWith', spec.uri, 'btview.graph');
  } else if (openIn === 'side') {
    await vscode.window.showTextDocument(doc, { preview: false });
    await vscode.commands.executeCommand('btview.openPreviewSide', spec.uri);
  } else {
    await vscode.window.showTextDocument(doc);
  }
  return spec.uri;
}

interface NewTreeSpec {
  uri: vscode.Uri;
  formatVersion: 3 | 4;
  treeId: string;
  rootControl?: string;
}

function resolveArgs(args: NewTreeArgs): NewTreeSpec | undefined {
  const treeId = args.treeId ?? 'MainTree';
  if (!args.uri || !TREE_ID_RE.test(treeId)) {
    return undefined;
  }
  return {
    uri: args.uri,
    formatVersion: args.formatVersion ?? (getSerializeNewFilesAs() === '3' ? 3 : 4),
    treeId,
    rootControl: args.rootControl,
  };
}

async function promptForSpec(): Promise<NewTreeSpec | undefined> {
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
    return undefined;
  }

  const treeId = await vscode.window.showInputBox({
    title: 'New Behavior Tree — tree ID',
    prompt: 'BehaviorTree ID attribute',
    value: 'MainTree',
    validateInput: (v) => (TREE_ID_RE.test(v) ? null : 'Invalid tree ID'),
  });
  if (!treeId) {
    return undefined;
  }

  const startMode = await vscode.window.showQuickPick(
    [
      {
        label: 'Empty canvas',
        description: 'Open the graph with no root node; pick a starter or drag from the palette',
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
    return undefined;
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
      return undefined;
    }
    rootControl = rootPick.value;
  }

  const uri = await vscode.window.showSaveDialog({
    filters: { 'Behavior Tree XML': ['xml'] },
    saveLabel: 'Create Behavior Tree',
  });
  if (!uri) {
    return undefined;
  }

  return { uri, formatVersion: formatPick.value, treeId, rootControl };
}
