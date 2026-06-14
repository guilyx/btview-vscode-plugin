import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { CUSTOM_EDITOR_VIEW_TYPE } from '../../preview/BtGraphController';

suite('BTView Extension', () => {
  vscode.window.showInformationMessage('Start BTView integration tests.');

  test('extension activates', async () => {
    const ext = vscode.extensions.getExtension('rangonomics.btview');
    assert.ok(ext, 'rangonomics.btview extension must be installed');
    await ext.activate();
    assert.ok(ext.isActive);
  });

  test('commands are registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('btview.openPreview'));
    assert.ok(commands.includes('btview.openPreviewSide'));
    assert.ok(commands.includes('btview.openSource'));
    assert.ok(commands.includes('btview.convertToV4'));
    assert.ok(commands.includes('btview.newTree'));
  });

  test('opens BT Graph custom editor on sample v4 XML', async () => {
    const fixturePath = path.join(__dirname, '../../../../fixtures/v4/simple_sequence.xml');
    const uri = vscode.Uri.file(fixturePath);

    await vscode.commands.executeCommand('vscode.openWith', uri, CUSTOM_EDITOR_VIEW_TYPE);
    await new Promise((r) => setTimeout(r, 2000));

    const customEditorTab = vscode.window.tabGroups.all
      .flatMap((g) => g.tabs)
      .find(
        (tab) =>
          tab.input instanceof vscode.TabInputCustom &&
          tab.input.viewType === CUSTOM_EDITOR_VIEW_TYPE,
      );

    assert.ok(customEditorTab, 'BT Graph custom editor tab should be open');
  });

  test('openPreview command opens graph for active XML', async () => {
    const fixturePath = path.join(__dirname, '../../../../fixtures/v4/simple_sequence.xml');
    const uri = vscode.Uri.file(fixturePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand('btview.openPreview');
    await new Promise((r) => setTimeout(r, 1500));

    const hasGraphTab = vscode.window.tabGroups.all
      .flatMap((g) => g.tabs)
      .some(
        (tab) =>
          tab.input instanceof vscode.TabInputCustom &&
          tab.input.viewType === CUSTOM_EDITOR_VIEW_TYPE,
      );

    assert.ok(hasGraphTab, 'openPreview should open BT Graph custom editor');
  });
});
