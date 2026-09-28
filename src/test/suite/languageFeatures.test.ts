import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

const fixtures = path.join(__dirname, '../../../../fixtures');

async function activate(): Promise<void> {
  const ext = vscode.extensions.getExtension('rangonomics.btview');
  assert.ok(ext);
  await ext.activate();
}

function positionOf(doc: vscode.TextDocument, needle: string, delta = 0): vscode.Position {
  const offset = doc.getText().indexOf(needle);
  assert.ok(offset >= 0, `"${needle}" not found`);
  return doc.positionAt(offset + delta);
}

suite('BTView XML language features', () => {
  suiteSetup(activate);

  test('completes BT node names inside a BehaviorTree', async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: 'xml',
      content: [
        '<root BTCPP_format="4">',
        '  <BehaviorTree ID="MainTree">',
        '    <Sequence>',
        '      <',
        '    </Sequence>',
        '  </BehaviorTree>',
        '  <TreeNodesModel>',
        '    <Action ID="SaySomething"><input_port name="message"/></Action>',
        '  </TreeNodesModel>',
        '</root>',
      ].join('\n'),
    });
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      doc.uri,
      new vscode.Position(3, 7),
      '<',
    );
    const labels = list.items.map((i) => (typeof i.label === 'string' ? i.label : i.label.label));
    assert.ok(labels.includes('Fallback'), 'built-in control expected');
    assert.ok(labels.includes('SaySomething'), 'TreeNodesModel node expected');
  });

  test('goes from SubTree ID to the included BehaviorTree', async () => {
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(fixtures, 'includes_relative.xml')),
    );
    const locations = await vscode.commands.executeCommand<
      Array<vscode.Location | vscode.LocationLink>
    >('vscode.executeDefinitionProvider', doc.uri, positionOf(doc, 'ChildTree"', 2));
    assert.ok(locations.length > 0, 'definition expected');
    const first = locations[0];
    const uri = 'targetUri' in first ? first.targetUri : first.uri;
    assert.strictEqual(path.basename(uri.fsPath), 'child_v4.xml');
  });

  test('provides an outline of trees and nodes', async () => {
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(fixtures, 'v3/subtree_plus.xml')),
    );
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      doc.uri,
    );
    assert.ok(symbols, 'symbols expected');
    const names = symbols.map((s) => s.name);
    assert.ok(names.includes('MainTree'));
    assert.ok(names.includes('GraspObject'));
    const main = symbols.find((s) => s.name === 'MainTree')!;
    assert.strictEqual(main.children[0]?.name, 'Sequence');
  });

  test('ignores XML files that are not behavior trees', async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: 'xml',
      content: '<project>\n  <\n</project>',
    });
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
      'vscode.executeDocumentSymbolProvider',
      doc.uri,
    );
    assert.ok(!symbols || symbols.length === 0);
  });
});
