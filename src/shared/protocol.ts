/** Shared host ↔ webview protocol types. */

export interface BtNodePayload {
  path: string;
  kind: string;
  registeredId: string;
  instanceName?: string;
  attributes: Record<string, string>;
  children: BtNodePayload[];
  rawTag?: string;
  legacyTag?: string;
}

export interface SerializedDocument {
  formatVersion: 3 | 4;
  mainTreeToExecute?: string;
  activeTreeId: string;
  trees: { id: string; root: BtNodePayload | null }[];
  models: {
    id: string;
    kind: string;
    ports: { name: string; direction: string; type?: string }[];
  }[];
  includes: { path: string; rosPkg?: string; resolvedUri?: string; error?: string }[];
  warnings: string[];
  validationErrors?: { path: string; message: string }[];
}

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'selectTree'; treeId: string }
  | {
      type: 'editNode';
      treeId: string;
      path: string;
      attr: string;
      value: string;
    }
  | {
      type: 'addNode';
      treeId: string;
      parentPath: string;
      registeredId: string;
      kind: string;
    }
  | { type: 'deleteNode'; treeId: string; path: string }
  | {
      type: 'reparentNode';
      treeId: string;
      sourcePath: string;
      targetPath: string;
      index?: number;
    }
  | {
      type: 'reorderChildren';
      treeId: string;
      parentPath: string;
      order: string[];
    }
  | { type: 'openInclude'; resolvedUri?: string };

export type HostToWebviewMessage =
  | { type: 'loadDocument'; document: SerializedDocument }
  | { type: 'documentChanged'; document: SerializedDocument }
  | { type: 'error'; message: string }
  | { type: 'validationError'; message: string };

export function parseWebviewMessage(data: unknown): WebviewToHostMessage | null {
  if (!data || typeof data !== 'object' || !('type' in data)) {
    return null;
  }
  const msg = data as Record<string, unknown>;
  switch (msg.type) {
    case 'ready':
      return { type: 'ready' };
    case 'selectTree':
      return typeof msg.treeId === 'string' ? { type: 'selectTree', treeId: msg.treeId } : null;
    case 'editNode':
      if (
        typeof msg.treeId === 'string' &&
        typeof msg.path === 'string' &&
        typeof msg.attr === 'string' &&
        typeof msg.value === 'string'
      ) {
        return {
          type: 'editNode',
          treeId: msg.treeId,
          path: msg.path,
          attr: msg.attr,
          value: msg.value,
        };
      }
      return null;
    case 'addNode':
      if (
        typeof msg.treeId === 'string' &&
        typeof msg.parentPath === 'string' &&
        typeof msg.registeredId === 'string' &&
        typeof msg.kind === 'string'
      ) {
        return {
          type: 'addNode',
          treeId: msg.treeId,
          parentPath: msg.parentPath,
          registeredId: msg.registeredId,
          kind: msg.kind,
        };
      }
      return null;
    case 'deleteNode':
      return typeof msg.treeId === 'string' && typeof msg.path === 'string'
        ? { type: 'deleteNode', treeId: msg.treeId, path: msg.path }
        : null;
    case 'reparentNode':
      if (
        typeof msg.treeId === 'string' &&
        typeof msg.sourcePath === 'string' &&
        typeof msg.targetPath === 'string'
      ) {
        return {
          type: 'reparentNode',
          treeId: msg.treeId,
          sourcePath: msg.sourcePath,
          targetPath: msg.targetPath,
          index: typeof msg.index === 'number' ? msg.index : undefined,
        };
      }
      return null;
    case 'reorderChildren':
      if (
        typeof msg.treeId === 'string' &&
        typeof msg.parentPath === 'string' &&
        Array.isArray(msg.order)
      ) {
        return {
          type: 'reorderChildren',
          treeId: msg.treeId,
          parentPath: msg.parentPath,
          order: msg.order as string[],
        };
      }
      return null;
    case 'openInclude':
      return {
        type: 'openInclude',
        resolvedUri: typeof msg.resolvedUri === 'string' ? msg.resolvedUri : undefined,
      };
    default:
      return null;
  }
}
