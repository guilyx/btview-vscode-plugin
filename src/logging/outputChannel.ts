import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('BTView');
  }
  return channel;
}

export function logInfo(message: string): void {
  getOutputChannel().appendLine(`[info] ${message}`);
}

export function logError(message: string, err?: unknown): void {
  const detail = err instanceof Error ? err.message : err ? String(err) : '';
  getOutputChannel().appendLine(`[error] ${message}${detail ? `: ${detail}` : ''}`);
}

export function disposeOutputChannel(): void {
  channel?.dispose();
  channel = undefined;
}
