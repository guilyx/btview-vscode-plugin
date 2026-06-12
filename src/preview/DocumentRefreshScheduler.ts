import * as vscode from 'vscode';

export class DocumentRefreshScheduler {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly skipNextRefresh = new Set<string>();
  private readonly autoOpened = new Set<string>();

  markSelfEdit(uri: vscode.Uri): void {
    this.skipNextRefresh.add(uri.toString());
  }

  shouldSkipRefresh(uri: vscode.Uri): boolean {
    const key = uri.toString();
    if (this.skipNextRefresh.has(key)) {
      this.skipNextRefresh.delete(key);
      return true;
    }
    return false;
  }

  schedule(uri: vscode.Uri, hasBindings: boolean, refresh: () => void): void {
    if (!hasBindings) {
      return;
    }

    const key = uri.toString();
    const existing = this.timers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        refresh();
      }, 150),
    );
  }

  clearTimer(uri: vscode.Uri): void {
    const key = uri.toString();
    const t = this.timers.get(key);
    if (t) {
      clearTimeout(t);
      this.timers.delete(key);
    }
  }

  markAutoOpened(uri: vscode.Uri): void {
    this.autoOpened.add(uri.toString());
  }

  wasAutoOpened(uri: vscode.Uri): boolean {
    return this.autoOpened.has(uri.toString());
  }

  unmarkAutoOpened(uri: vscode.Uri): void {
    this.autoOpened.delete(uri.toString());
  }

  dispose(): void {
    for (const t of this.timers.values()) {
      clearTimeout(t);
    }
    this.timers.clear();
    this.skipNextRefresh.clear();
    this.autoOpened.clear();
  }
}
