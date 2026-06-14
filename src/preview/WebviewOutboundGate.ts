import * as vscode from 'vscode';
import type { HostToWebviewMessage } from '../shared/protocol';

interface WebviewState {
  ready: boolean;
  pending: HostToWebviewMessage[];
}

/**
 * Queues host→webview messages until the webview signals ready (avoids lost loadDocument).
 */
export class WebviewOutboundGate {
  private readonly states = new WeakMap<vscode.Webview, WebviewState>();

  private state(webview: vscode.Webview): WebviewState {
    let s = this.states.get(webview);
    if (!s) {
      s = { ready: false, pending: [] };
      this.states.set(webview, s);
    }
    return s;
  }

  markNotReady(webview: vscode.Webview): void {
    const s = this.state(webview);
    s.ready = false;
    s.pending = [];
  }

  markReady(webview: vscode.Webview): void {
    const s = this.state(webview);
    s.ready = true;
    const queue = s.pending;
    s.pending = [];
    for (const msg of queue) {
      webview.postMessage(msg);
    }
  }

  post(webview: vscode.Webview, message: HostToWebviewMessage): void {
    const s = this.state(webview);
    if (s.ready) {
      webview.postMessage(message);
    } else {
      s.pending.push(message);
    }
  }

  dispose(webview: vscode.Webview): void {
    this.states.delete(webview);
  }

  isReady(webview: vscode.Webview): boolean {
    return this.state(webview).ready;
  }

  pendingCount(webview: vscode.Webview): number {
    return this.state(webview).pending.length;
  }
}
