/**
 * Stands in for the VS Code webview runtime inside the demo iframe.
 *
 * VS Code injects `acquireVsCodeApi()` before any extension script runs; the webview
 * app (webview/src/vscodeApi.ts) calls it at module load. We provide the same API and
 * forward outgoing messages to the demo host in the parent window. Host → webview
 * messages arrive as regular `message` events, exactly like in VS Code.
 */
import { DEMO_WEBVIEW_SOURCE, type DemoWebviewEnvelope } from './bridge-types';

const params = new URLSearchParams(window.location.search);
const theme = params.get('theme') === 'light' ? 'light' : 'dark';
document.documentElement.dataset.theme = theme;
document.body.classList.add(`vscode-${theme}`);

let state: unknown;

(window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
  postMessage(message: unknown): void {
    const envelope: DemoWebviewEnvelope = { source: DEMO_WEBVIEW_SOURCE, message };
    window.parent.postMessage(envelope, '*');
  },
  getState(): unknown {
    return state;
  },
  setState(next: unknown): void {
    state = next;
  },
});
