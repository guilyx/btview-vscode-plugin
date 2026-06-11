import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('btview.ping', () => {
      void vscode.window.showInformationMessage('BTView scaffold ready.');
    }),
  );
}

export function deactivate(): void {
  // no-op
}
