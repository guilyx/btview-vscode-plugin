import * as vscode from 'vscode';
import { BtGraphController, CUSTOM_EDITOR_VIEW_TYPE } from './BtGraphController';
import { getWebviewOptions } from './webviewHtml';

export class BtCustomEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(
    private readonly controller: BtGraphController,
    private readonly extensionUri: vscode.Uri,
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = getWebviewOptions(this.extensionUri);

    if (token.isCancellationRequested) {
      return;
    }

    await this.controller.resolveCustomTextEditor(document, webviewPanel, token);
  }

  static register(
    context: vscode.ExtensionContext,
    controller: BtGraphController,
  ): vscode.Disposable {
    const provider = new BtCustomEditorProvider(controller, context.extensionUri);
    return vscode.window.registerCustomEditorProvider(CUSTOM_EDITOR_VIEW_TYPE, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: true,
    });
  }
}
