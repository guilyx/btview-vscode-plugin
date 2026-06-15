import type { SerializedDocument } from './types';

declare global {
  interface Window {
    __BTVIEW_BOOT__?: { document?: SerializedDocument };
  }
}

export function readBootstrapDocument(): SerializedDocument | null {
  const doc = window.__BTVIEW_BOOT__?.document;
  return doc && typeof doc === 'object' ? doc : null;
}
