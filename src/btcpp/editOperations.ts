import type { BtDocument, BtNode, NodeKind } from './types';
import { assignPaths, cloneNode, findNodeByPath, findParentOfPath } from './xmlUtils';
import { validateReparent } from './validation';

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

export function addNode(
  doc: BtDocument,
  treeId: string,
  parentPath: string,
  registeredId: string,
  kind: NodeKind,
): BtDocument {
  const updated = cloneDocument(doc);
  const tree = updated.trees.find((t) => t.id === treeId);
  if (!tree?.root) {
    return doc;
  }

  const parent = parentPath === 'root' ? tree.root : findNodeByPath(tree.root, parentPath);
  if (!parent) {
    return doc;
  }

  const newNode: BtNode = {
    path: '',
    kind,
    registeredId,
    attributes: {},
    children: [],
    rawTag: kind === 'action' ? 'Action' : kind === 'condition' ? 'Condition' : registeredId,
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
): BtDocument {
  const updated = cloneDocument(doc);
  const tree = updated.trees.find((t) => t.id === treeId);
  if (!tree?.root) {
    return doc;
  }

  const source = findNodeByPath(tree.root, sourcePath);
  const targetParent =
    targetParentPath === '0' ? tree.root : findNodeByPath(tree.root, targetParentPath);
  if (!source || !targetParent) {
    return doc;
  }

  const err = validateReparent(targetParent, source);
  if (err) {
    return doc;
  }

  const sourceParent = findParentOfPath(tree.root, sourcePath);
  if (!sourceParent) {
    return doc;
  }

  sourceParent.children = sourceParent.children.filter((c) => c.path !== sourcePath);
  const detached = cloneNode(source);
  const insertAt = index ?? targetParent.children.length;
  targetParent.children.splice(insertAt, 0, detached);
  assignPaths(tree.root, '0');
  return updated;
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
