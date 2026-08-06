import type { BtNodeData } from '../types';

/**
 * Collect paths of nodes matching the search query, in depth-first order.
 * Matching mirrors the canvas dimming logic: instance name, registered ID,
 * or kind, case-insensitive substring.
 */
export function collectSearchMatches(root: BtNodeData | null, query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!root || !q) {
    return [];
  }
  const matches: string[] = [];
  const visit = (node: BtNodeData): void => {
    const label = node.instanceName ?? node.registeredId;
    if (
      label.toLowerCase().includes(q) ||
      node.registeredId.toLowerCase().includes(q) ||
      node.kind.toLowerCase().includes(q)
    ) {
      matches.push(node.path);
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  visit(root);
  return matches;
}
