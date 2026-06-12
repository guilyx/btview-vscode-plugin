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

export function getState<T>(): T | undefined {
  return vscode?.getState() as T | undefined;
}

export function setState<T>(state: T): void {
  vscode?.setState(state);
}
