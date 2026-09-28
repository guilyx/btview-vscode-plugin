/** Envelope used by the demo iframe to forward webview → host messages to the shell. */
export const DEMO_WEBVIEW_SOURCE = 'btview-demo-webview';

export interface DemoWebviewEnvelope {
  source: typeof DEMO_WEBVIEW_SOURCE;
  message: unknown;
}
