/** Shared host ↔ webview protocol types. */

import type { PortModel } from '../btcpp/types';

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
    ports: { name: string; direction: PortModel['direction']; type?: string }[];
  }[];
  /** Built-in + user-configured nodes available in the add-node palette. */
  nodePalette: { id: string; kind: string }[];
  includes: { path: string; rosPkg?: string; resolvedUri?: string; error?: string }[];
  warnings: string[];
  validationErrors?: { path: string; message: string }[];
  /** Saved node positions per tree (from sidecar layout file). */
  layoutPositions?: Record<string, { x: number; y: number }>;
  showNodePorts?: boolean;
}

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'loaded' }
  | { type: 'selectTree'; treeId: string }
  | {
      type: 'editNode';
      treeId: string;
      path: string;
      attr: string;
      value: string;
    }
  | {
      type: 'changeNodeType';
      treeId: string;
      path: string;
      kind: string;
      registeredId: string;
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
  | { type: 'openInclude'; resolvedUri?: string }
  | { type: 'openSource' }
  | { type: 'openGraphSide' }
  | { type: 'undo' }
  | { type: 'redo' }
  | {
      type: 'pasteSubtree';
      treeId: string;
      parentPath: string;
      subtree: {
        kind: string;
        registeredId: string;
        instanceName?: string;
        attributes: Record<string, string>;
        children?: unknown[];
      };
    }
  | { type: 'goToSource'; path?: string }
  | { type: 'exportWorkspaceConfig' }
  | { type: 'removePort'; treeId: string; path: string; attr: string }
  | {
      type: 'saveLayout';
      treeId: string;
      positions: Record<string, { x: number; y: number }>;
    }
  | { type: 'resetLayout'; treeId: string };

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
    case 'loaded':
      return { type: 'loaded' };
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
    case 'changeNodeType':
      if (
        typeof msg.treeId === 'string' &&
        typeof msg.path === 'string' &&
        typeof msg.kind === 'string' &&
        typeof msg.registeredId === 'string'
      ) {
        return {
          type: 'changeNodeType',
          treeId: msg.treeId,
          path: msg.path,
          kind: msg.kind,
          registeredId: msg.registeredId,
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
    case 'openSource':
      return { type: 'openSource' };
    case 'openGraphSide':
      return { type: 'openGraphSide' };
    case 'undo':
      return { type: 'undo' };
    case 'redo':
      return { type: 'redo' };
    case 'exportWorkspaceConfig':
      return { type: 'exportWorkspaceConfig' };
    case 'goToSource':
      return { type: 'goToSource', path: typeof msg.path === 'string' ? msg.path : undefined };
    case 'removePort':
      if (
        typeof msg.treeId === 'string' &&
        typeof msg.path === 'string' &&
        typeof msg.attr === 'string'
      ) {
        return {
          type: 'removePort',
          treeId: msg.treeId,
          path: msg.path,
          attr: msg.attr,
        };
      }
      return null;
    case 'resetLayout':
      return typeof msg.treeId === 'string' ? { type: 'resetLayout', treeId: msg.treeId } : null;
    case 'saveLayout':
      if (typeof msg.treeId === 'string' && msg.positions && typeof msg.positions === 'object') {
        return {
          type: 'saveLayout',
          treeId: msg.treeId,
          positions: msg.positions as Record<string, { x: number; y: number }>,
        };
      }
      return null;
    case 'pasteSubtree':
      if (
        typeof msg.treeId === 'string' &&
        typeof msg.parentPath === 'string' &&
        msg.subtree &&
        typeof msg.subtree === 'object'
      ) {
        const st = msg.subtree as Record<string, unknown>;
        if (typeof st.kind === 'string' && typeof st.registeredId === 'string') {
          return {
            type: 'pasteSubtree',
            treeId: msg.treeId,
            parentPath: msg.parentPath,
            subtree: {
              kind: st.kind,
              registeredId: st.registeredId,
              instanceName: typeof st.instanceName === 'string' ? st.instanceName : undefined,
              attributes:
                st.attributes && typeof st.attributes === 'object'
                  ? (st.attributes as Record<string, string>)
                  : {},
              children: Array.isArray(st.children) ? st.children : undefined,
            },
          };
        }
      }
      return null;
    default:
      return null;
  }
}
