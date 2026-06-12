import * as vscode from 'vscode';

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
