import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { CUSTOM_EDITOR_VIEW_TYPE } from '../../preview/BtGraphController';
import { DocumentSyncService } from '../../sync/DocumentSyncService';
import { parseDocument } from '../../btcpp/parser';

const FIXTURES = path.join(__dirname, '../../../../fixtures');

let tmpDir: string;

/** Copy a fixture (or write `content`) into a temp dir so tests never touch `fixtures/`. */
function tempXml(name: string, content: string): vscode.Uri {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, content, 'utf8');
  return vscode.Uri.file(file);
}

function fixtureText(...parts: string[]): string {
  return fs.readFileSync(path.join(FIXTURES, ...parts), 'utf8');
}

async function waitFor<T>(
  probe: () => T | undefined | false | Promise<T | undefined | false>,
  what: string,
  timeoutMs = 10000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value) {
      return value;
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

function graphTabFor(uri: vscode.Uri): vscode.Tab | undefined {
  return vscode.window.tabGroups.all
    .flatMap((g) => g.tabs)
    .find(
      (tab) =>
        tab.input instanceof vscode.TabInputCustom &&
        tab.input.viewType === CUSTOM_EDITOR_VIEW_TYPE &&
        tab.input.uri.toString() === uri.toString(),
    );
}

function btDiagnostics(uri: vscode.Uri, code?: string): vscode.Diagnostic[] {
  return vscode.languages
    .getDiagnostics(uri)
    .filter((d) => d.source === 'btview' && (code === undefined || d.code === code));
}

async function textOf(uri: vscode.Uri): Promise<string> {
  return (await vscode.workspace.openTextDocument(uri)).getText();
}

async function quickFixes(uri: vscode.Uri, range: vscode.Range): Promise<vscode.CodeAction[]> {
  return (
    (await vscode.commands.executeCommand<vscode.CodeAction[]>(
      'vscode.executeCodeActionProvider',
      uri,
      range,
    )) ?? []
  );
}

suite('BTView editor RC', () => {
  suiteSetup(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btview-it-'));
    await vscode.extensions.getExtension('rangonomics.btview')?.activate();
  });

  teardown(async () => {
    // Revert-and-close avoids "save changes?" prompts for dirty or untitled editors.
    for (let i = 0; i < 20 && vscode.window.tabGroups.all.some((g) => g.tabs.length > 0); i++) {
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    }
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  suiteTeardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  for (const fixture of [
    ['v3', 'simple_sequence.xml'],
    ['v4', 'fallback_recovery.xml'],
    ['nav2', 'navigate_w_replanning_and_recovery.xml'],
  ]) {
    test(`opens the graph editor on ${fixture.join('/')}`, async () => {
      const uri = vscode.Uri.file(path.join(FIXTURES, ...fixture));
      await vscode.commands.executeCommand('vscode.openWith', uri, CUSTOM_EDITOR_VIEW_TYPE);
      await waitFor(() => graphTabFor(uri), 'graph tab');
      // Loads cleanly: no XML syntax error reported for a well-formed fixture.
      await new Promise((r) => setTimeout(r, 500));
      assert.deepStrictEqual(btDiagnostics(uri, 'xml-syntax'), []);
    });
  }

  test('graph edits round-trip through DocumentSyncService and undo', async () => {
    const uri = tempXml('roundtrip.xml', fixtureText('v4', 'simple_sequence.xml'));
    const sync = new DocumentSyncService();
    await sync.loadFromFile(uri);
    const treeId = 'MainTree';

    let result = await sync.applyEdit(uri, {
      type: 'addNode',
      treeId,
      parentPath: '0',
      registeredId: 'AlwaysSuccess',
      kind: 'action',
    });
    assert.ok(result.success);
    assert.match(await textOf(uri), /AlwaysSuccess/);

    result = await sync.applyEdit(uri, {
      type: 'editNode',
      treeId,
      path: '0-1',
      attr: 'name',
      value: 'renamed_gripper',
    });
    assert.ok(result.success);
    assert.match(await textOf(uri), /<OpenGripper name="renamed_gripper"\/>/);

    result = await sync.applyEdit(uri, { type: 'deleteNode', treeId, path: '0-0' });
    assert.ok(result.success);
    assert.doesNotMatch(await textOf(uri), /SaySomething/);

    // XML stays parseable after every edit.
    const tree = parseDocument(await textOf(uri)).trees[0]!;
    assert.deepStrictEqual(
      tree.root!.children.map((c) => c.registeredId),
      ['OpenGripper', 'ApproachObject', 'CloseGripper', 'AlwaysSuccess'],
    );

    assert.ok((await sync.undo(uri)).success);
    assert.match(await textOf(uri), /SaySomething/);
    assert.ok((await sync.undo(uri)).success);
    assert.doesNotMatch(await textOf(uri), /renamed_gripper/);
    assert.ok((await sync.undo(uri)).success);
    assert.doesNotMatch(await textOf(uri), /AlwaysSuccess/);
    assert.ok((await sync.redo(uri)).success);
    assert.match(await textOf(uri), /AlwaysSuccess/);

    await vscode.workspace.openTextDocument(uri).then((d) => d.save());
  });

  test('quick fix from the graph path edits text and is undoable', async () => {
    const uri = tempXml(
      'dup.xml',
      `<root BTCPP_format="4" main_tree_to_execute="Main">
  <!-- comment survives the fix -->
  <BehaviorTree ID="Main"><AlwaysSuccess/></BehaviorTree>
  <BehaviorTree ID="Main"><AlwaysFailure/></BehaviorTree>
</root>
`,
    );
    const sync = new DocumentSyncService();
    await sync.loadFromFile(uri);
    const issue = sync.getValidationErrors(uri).find((e) => e.code === 'duplicate-tree-id');
    assert.ok(issue, 'duplicate-tree-id issue expected');

    const payload = sync.serializeForWebview(uri)!;
    const offered = payload.validationErrors!.find((e) => e.code === 'duplicate-tree-id')!;
    assert.deepStrictEqual(
      offered.fixes?.map((f) => f.kind),
      ['renameDuplicateTree'],
    );

    const result = await sync.applyQuickFix(
      uri,
      { code: issue.code!, path: issue.path, treeId: issue.treeId, message: issue.message },
      offered.fixes![0]!.title,
    );
    assert.ok(result.success, result.error?.message ?? 'quick fix failed');
    const fixed = await textOf(uri);
    assert.match(fixed, /<!-- comment survives the fix -->/);
    assert.match(fixed, /<BehaviorTree ID="Main_2"><AlwaysFailure\/>/);

    await sync.loadFromFile(uri);
    assert.deepStrictEqual(sync.getValidationErrors(uri), []);

    assert.ok((await sync.undo(uri)).success);
    await sync.loadFromFile(uri);
    assert.ok(sync.getValidationErrors(uri).some((e) => e.code === 'duplicate-tree-id'));

    await vscode.workspace.openTextDocument(uri).then((d) => d.save());
  });

  test('XML editor offers quick fixes for BTView diagnostics', async () => {
    const uri = tempXml(
      'quickfix.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="Main">
  <BehaviorTree ID="Main">
    <Sequence>
      <SubTree ID="Dock"/>
      <Move/>
    </Sequence>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="Move">
      <input_port name="goal"/>
    </Action>
  </TreeNodesModel>
</root>
`,
    );
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    const subtreeDiag = await waitFor(
      () => btDiagnostics(uri, 'undefined-subtree')[0],
      'undefined-subtree diagnostic',
    );
    // Anchored on the offending element, not line 1.
    assert.strictEqual(doc.getText(subtreeDiag.range), 'SubTree');

    const stub = (await quickFixes(uri, subtreeDiag.range)).find(
      (a) => a.title === 'Create BehaviorTree "Dock" stub',
    );
    assert.ok(stub?.edit, 'stub quick fix expected');
    assert.ok(await vscode.workspace.applyEdit(stub.edit));
    assert.match(doc.getText(), /<BehaviorTree ID="Dock">\s*<AlwaysSuccess\/>\s*<\/BehaviorTree>/);

    const portDiag = await waitFor(
      () => btDiagnostics(uri, 'missing-required-port')[0],
      'missing-required-port diagnostic',
    );
    const addPort = (await quickFixes(uri, portDiag.range)).find((a) =>
      a.title.startsWith('Add required port goal'),
    );
    assert.ok(addPort?.edit, 'add-port quick fix expected');
    assert.ok(await vscode.workspace.applyEdit(addPort.edit));
    assert.match(doc.getText(), /<Move goal="\{goal\}"\/>/);

    await waitFor(() => btDiagnostics(uri).length === 0, 'diagnostics to clear');
    await doc.save();
  });

  test('v3 files offer an in-place Convert to BTCpp v4 source action', async () => {
    const uri = tempXml('legacy.xml', fixtureText('v3', 'simple_sequence.xml'));
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    const actions =
      (await vscode.commands.executeCommand<vscode.CodeAction[]>(
        'vscode.executeCodeActionProvider',
        uri,
        new vscode.Range(0, 0, 0, 0),
        'source.btview.convertToV4',
      )) ?? [];
    const convert = actions.find((a) => a.title === 'Convert file to BTCpp v4');
    assert.ok(convert?.edit, 'convert source action expected');
    assert.ok(await vscode.workspace.applyEdit(convert.edit));
    assert.strictEqual(parseDocument(doc.getText()).formatVersion, 4);
    await doc.save();
  });

  test('convertToV4 command previews the migration', async () => {
    const uri = vscode.Uri.file(path.join(FIXTURES, 'v3', 'simple_sequence.xml'));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
    await vscode.commands.executeCommand('btview.convertToV4');
    const migrated = await waitFor(
      () =>
        vscode.workspace.textDocuments.find(
          (d) => d.isUntitled && d.getText().includes('BTCPP_format="4"'),
        ),
      'migrated preview document',
    );
    assert.strictEqual(parseDocument(migrated.getText()).trees[0]?.id, 'MainTree');
  });

  test('newTree creates a tree without prompts when given arguments', async () => {
    const withRoot = vscode.Uri.file(path.join(tmpDir, 'patrol.xml'));
    const created = await vscode.commands.executeCommand<vscode.Uri>('btview.newTree', {
      uri: withRoot,
      formatVersion: 4,
      treeId: 'Patrol',
      rootControl: 'Sequence',
      openIn: 'text',
    });
    assert.strictEqual(created?.toString(), withRoot.toString());
    const parsed = parseDocument(fs.readFileSync(withRoot.fsPath, 'utf8'));
    assert.strictEqual(parsed.mainTreeToExecute, 'Patrol');
    assert.strictEqual(parsed.trees[0]?.root?.registeredId, 'Sequence');

    // An empty canvas opens straight into the graph editor.
    const empty = vscode.Uri.file(path.join(tmpDir, 'empty.xml'));
    await vscode.commands.executeCommand('btview.newTree', { uri: empty, treeId: 'Blank' });
    await waitFor(() => graphTabFor(empty), 'graph tab for the new empty tree');
    assert.strictEqual(parseDocument(fs.readFileSync(empty.fsPath, 'utf8')).trees[0]?.root, null);
  });

  test('malformed XML opens the graph editor and reports the syntax error', async () => {
    const uri = tempXml(
      'broken.xml',
      '<root BTCPP_format="4">\n  <BehaviorTree ID="Main">\n    <Sequence>\n  </BehaviorTree>\n</root>\n',
    );
    await vscode.commands.executeCommand('vscode.openWith', uri, CUSTOM_EDITOR_VIEW_TYPE);
    await waitFor(() => graphTabFor(uri), 'graph tab');
    const diag = await waitFor(() => btDiagnostics(uri, 'xml-syntax')[0], 'xml-syntax diagnostic');
    assert.strictEqual(diag.severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(diag.range.start.line, 3);
  });
});
