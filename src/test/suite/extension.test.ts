import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
suite('BTView Extension', () => {
  vscode.window.showInformationMessage('Start BTView integration tests.');

  test('extension activates', async () => {
    const ext = vscode.extensions.getExtension('your-publisher.btview');
    if (ext) {
      await ext.activate();
      assert.ok(ext.isActive);
    }
  });

  test('commands are registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('btview.openPreview'));
    assert.ok(commands.includes('btview.openPreviewSide'));
    assert.ok(commands.includes('btview.openSource'));
    assert.ok(commands.includes('btview.convertToV4'));
  });

  test('opens preview on sample v4 XML', async () => {
    const fixturePath = path.join(__dirname, '../../../../fixtures/v4/simple_sequence.xml');
    const uri = vscode.Uri.file(fixturePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand('btview.openPreview');
    await new Promise((r) => setTimeout(r, 1000));

    assert.ok(fs.existsSync(fixturePath));
  });
});
