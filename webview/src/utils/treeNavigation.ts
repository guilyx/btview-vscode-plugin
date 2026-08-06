import type { BtNodeData } from '../types';

export type NavDirection = 'parent' | 'child' | 'prevSibling' | 'nextSibling';

function findWithParent(
  root: BtNodeData,
  path: string,
  parent: BtNodeData | null = null,
): { node: BtNodeData; parent: BtNodeData | null } | null {
  if (root.path === path) {
    return { node: root, parent };
  }
  for (const child of root.children) {
    const found = findWithParent(child, path, root);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Structural navigation for arrow keys: parent/child move between depths,
 * prev/next move between siblings. Returns the target path, or null when the
 * move is impossible (root's parent, leaf's child, first/last sibling edge).
 */
export function navigateTree(
  root: BtNodeData | null,
  currentPath: string | null,
  direction: NavDirection,
): string | null {
  if (!root) {
    return null;
  }
  if (!currentPath) {
    return root.path;
  }
  const found = findWithParent(root, currentPath);
  if (!found) {
    return root.path;
  }
  const { node, parent } = found;

  switch (direction) {
    case 'parent':
      return parent?.path ?? null;
    case 'child':
      return node.children[0]?.path ?? null;
    case 'prevSibling':
    case 'nextSibling': {
      if (!parent) {
        return null;
      }
      const index = parent.children.findIndex((c) => c.path === node.path);
      const target = parent.children[direction === 'prevSibling' ? index - 1 : index + 1];
      return target?.path ?? null;
    }
  }
}
