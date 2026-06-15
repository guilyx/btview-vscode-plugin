/** Host → webview messages: captured before React mounts. */

import { postMessage } from './vscodeApi';

const pending: unknown[] = [];
const listeners = new Set<(data: unknown) => void>();

function isRecord(data: unknown): data is Record<string, unknown> {
  return Boolean(data && typeof data === 'object');
}

function isDocumentMessage(data: unknown): boolean {
  if (!isRecord(data)) {
    return false;
  }
  const t = data.type;
  return t === 'loadDocument' || t === 'documentChanged';
}

function dispatch(data: unknown): void {
  for (const listener of listeners) {
    listener(data);
  }
}

function onMessage(event: MessageEvent): void {
  const data = event.data;
  pending.push(data);
  if (isDocumentMessage(data)) {
    postMessage({ type: 'loaded' });
  }
  dispatch(data);
}

window.addEventListener('message', onMessage);

export function subscribeHostMessages(handler: (data: unknown) => void): () => void {
  listeners.add(handler);
  for (const msg of pending) {
    handler(msg);
  }
  return () => listeners.delete(handler);
}

export function signalReady(): void {
  postMessage({ type: 'ready' });
}
