import * as vscode from 'vscode';
import { BtGraphController, CUSTOM_EDITOR_VIEW_TYPE } from './BtGraphController';

export class BtCustomEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly controller: BtGraphController) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      ...webviewPanel.webview.options,
      enableScripts: true,
    };

    if (token.isCancellationRequested) {
      return;
    }

    await this.controller.resolveCustomTextEditor(document, webviewPanel, token);
  }

  static register(
    _context: vscode.ExtensionContext,
    controller: BtGraphController,
  ): vscode.Disposable {
    const provider = new BtCustomEditorProvider(controller);
    return vscode.window.registerCustomEditorProvider(CUSTOM_EDITOR_VIEW_TYPE, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: true,
    });
  }
}
