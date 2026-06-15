import type { BtDocument, BtNode, NodeKind } from './types';
import { assignPaths, cloneNode, findNodeByPath, findParentOfPath } from './xmlUtils';
import { rawTagForNewNode } from './nodeRegistry';
import { validateReparent, type ValidationError } from './validation';

export function editNodeAttribute(
  doc: BtDocument,
  treeId: string,
  path: string,
  attr: string,
  value: string,
): BtDocument {
  const updated = cloneDocument(doc);
  const tree = updated.trees.find((t) => t.id === treeId);
  const node = tree?.root ? findNodeByPath(tree.root, path) : null;
  if (!node) {
    return doc;
  }
  if (attr === 'name') {
    node.instanceName = value || undefined;
  } else {
    node.attributes[attr] = value;
  }
  return updated;
}

export interface EditResult {
  success: boolean;
  document: BtDocument;
  error?: ValidationError;
}

const LEAF_KINDS = new Set<NodeKind>(['action', 'condition', 'script']);

export function changeNodeDefinition(
  doc: BtDocument,
  treeId: string,
  path: string,
  kind: NodeKind,
  registeredId: string,
): EditResult {
  const id = registeredId.trim();
  if (!id) {
    return {
      success: false,
      document: doc,
      error: { path, message: 'Node type (registered ID) is required.' },
    };
  }

  const updated = cloneDocument(doc);
  const tree = updated.trees.find((t) => t.id === treeId);
  const node = tree?.root ? findNodeByPath(tree.root, path) : null;
  if (!node) {
    return {
      success: false,
      document: doc,
      error: { path, message: 'Node not found.' },
    };
  }

  if (LEAF_KINDS.has(kind) && node.children.length > 0) {
    return {
      success: false,
      document: doc,
      error: {
        path,
        message: `${kind} nodes cannot have children. Remove or reparent children first.`,
      },
    };
  }

  node.kind = kind;
  node.registeredId = id;
  node.rawTag = rawTagForNewNode(kind, id);
  if (kind === 'action' || kind === 'condition') {
    node.legacyTag = undefined;
  }

  return { success: true, document: updated };
}

export function addNode(
  doc: BtDocument,
  treeId: string,
  parentPath: string,
  registeredId: string,
  kind: NodeKind,
): BtDocument {
  const updated = cloneDocument(doc);
  const tree = updated.trees.find((t) => t.id === treeId);
  if (!tree) {
    return doc;
  }

  if (!tree.root) {
    if (parentPath !== '0') {
      return doc;
    }
    tree.root = {
      path: '0',
      kind,
      registeredId,
      attributes: {},
      children: [],
      rawTag: rawTagForNewNode(kind, registeredId),
    };
    return updated;
  }

  const parent =
    parentPath === '0' || parentPath === 'root' ? tree.root : findNodeByPath(tree.root, parentPath);
  if (!parent) {
    return doc;
  }

  const newNode: BtNode = {
    path: '',
    kind,
    registeredId,
    attributes: {},
    children: [],
    rawTag: rawTagForNewNode(kind, registeredId),
  };

  parent.children.push(newNode);
  assignPaths(tree.root, '0');
  return updated;
}

export function deleteNode(doc: BtDocument, treeId: string, path: string): BtDocument {
  const updated = cloneDocument(doc);
  const tree = updated.trees.find((t) => t.id === treeId);
  if (!tree?.root || path === '0') {
    return doc;
  }

  const parent = findParentOfPath(tree.root, path);
  if (!parent) {
    return doc;
  }

  parent.children = parent.children.filter((c) => c.path !== path);
  assignPaths(tree.root, '0');
  return updated;
}

export function reparentNode(
  doc: BtDocument,
  treeId: string,
  sourcePath: string,
  targetParentPath: string,
  index?: number,
): EditResult {
  const updated = cloneDocument(doc);
  const tree = updated.trees.find((t) => t.id === treeId);
  if (!tree?.root) {
    return {
      success: false,
      document: doc,
      error: { path: sourcePath, message: 'Tree not found.' },
    };
  }

  const source = findNodeByPath(tree.root, sourcePath);
  const targetParent =
    targetParentPath === '0' ? tree.root : findNodeByPath(tree.root, targetParentPath);
  if (!source || !targetParent) {
    return {
      success: false,
      document: doc,
      error: { path: sourcePath, message: 'Node not found.' },
    };
  }

  const err = validateReparent(targetParent, source);
  if (err) {
    return { success: false, document: doc, error: err };
  }

  const sourceParent = findParentOfPath(tree.root, sourcePath);
  if (!sourceParent) {
    return {
      success: false,
      document: doc,
      error: { path: sourcePath, message: 'Source parent not found.' },
    };
  }

  sourceParent.children = sourceParent.children.filter((c) => c.path !== sourcePath);
  const detached = cloneNode(source);
  const insertAt = index ?? targetParent.children.length;
  targetParent.children.splice(insertAt, 0, detached);
  assignPaths(tree.root, '0');
  return { success: true, document: updated };
}

export function reorderChildren(
  doc: BtDocument,
  treeId: string,
  parentPath: string,
  newOrder: string[],
): BtDocument {
  const updated = cloneDocument(doc);
  const tree = updated.trees.find((t) => t.id === treeId);
  if (!tree?.root) {
    return doc;
  }

  const parent = parentPath === '0' ? tree.root : findNodeByPath(tree.root, parentPath);
  if (!parent) {
    return doc;
  }

  const byPath = new Map(parent.children.map((c) => [c.path, c]));
  parent.children = newOrder.map((p) => byPath.get(p)).filter((c): c is BtNode => c !== undefined);
  assignPaths(tree.root, '0');
  return updated;
}

function cloneDocument(doc: BtDocument): BtDocument {
  return {
    ...doc,
    trees: doc.trees.map((t) => ({
      ...t,
      root: t.root ? cloneNode(t.root) : null,
    })),
    models: new Map(doc.models),
    includes: [...doc.includes],
    warnings: [...doc.warnings],
  };
}
