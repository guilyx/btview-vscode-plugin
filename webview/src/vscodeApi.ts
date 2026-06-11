declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

export function postMessage(message: unknown): void {
  vscode?.postMessage(message);
}

export function isVsCode(): boolean {
  return vscode !== null;
}
