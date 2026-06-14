import { describe, expect, it, vi } from 'vitest';
import { WebviewOutboundGate } from '../../preview/WebviewOutboundGate';
import type { HostToWebviewMessage } from '../../shared/protocol';
import type * as vscode from 'vscode';

function mockWebview(): vscode.Webview {
  return {
    postMessage: vi.fn(),
  } as unknown as vscode.Webview;
}

describe('WebviewOutboundGate', () => {
  it('queues messages until markReady', () => {
    const gate = new WebviewOutboundGate();
    const webview = mockWebview();
    const msg: HostToWebviewMessage = {
      type: 'loadDocument',
      document: {
        formatVersion: 4,
        activeTreeId: 'MainTree',
        trees: [],
        models: [],
        nodePalette: [],
        includes: [],
        warnings: [],
      },
    };

    gate.post(webview, msg);
    expect(webview.postMessage).not.toHaveBeenCalled();
    expect(gate.pendingCount(webview)).toBe(1);

    gate.markReady(webview);
    expect(webview.postMessage).toHaveBeenCalledWith(msg);
    expect(gate.isReady(webview)).toBe(true);
    expect(gate.pendingCount(webview)).toBe(0);
  });

  it('markNotReady clears queue and blocks delivery', () => {
    const gate = new WebviewOutboundGate();
    const webview = mockWebview();
    const msg: HostToWebviewMessage = { type: 'error', message: 'test' };

    gate.markReady(webview);
    gate.markNotReady(webview);
    gate.post(webview, msg);

    expect(webview.postMessage).not.toHaveBeenCalled();
    expect(gate.pendingCount(webview)).toBe(1);
    expect(gate.isReady(webview)).toBe(false);
  });

  it('dispose removes state', () => {
    const gate = new WebviewOutboundGate();
    const webview = mockWebview();

    gate.markReady(webview);
    gate.dispose(webview);
    gate.post(webview, { type: 'error', message: 'after dispose' });

    expect(webview.postMessage).not.toHaveBeenCalled();
    expect(gate.pendingCount(webview)).toBe(1);
    expect(gate.isReady(webview)).toBe(false);
  });
});
