import type { BtNodeData, SerializedDocument } from '../types';
import type { FlowNodeData } from './layout';
import { resolveNodePorts } from '../utils/portResolution';

export function enrichNodeData(
  node: BtNodeData,
  doc: SerializedDocument,
  searchQuery: string,
  portsVisible: boolean,
  statuses?: Record<string, string>,
): FlowNodeData {
  const q = searchQuery.trim().toLowerCase();
  const label = node.instanceName ?? node.registeredId;
  const matches =
    !q ||
    label.toLowerCase().includes(q) ||
    node.registeredId.toLowerCase().includes(q) ||
    node.kind.toLowerCase().includes(q);

  const resolved = resolveNodePorts(node, doc.models);
  const portSummary = portsVisible
    ? [...resolved.inputs, ...resolved.inouts, ...resolved.outputs, ...resolved.custom]
        .filter((p) => p.value)
        .map((p) => `${p.name}=${p.value}`)
        .slice(0, 3)
    : undefined;

  return {
    label,
    kind: node.kind,
    path: node.path,
    registeredId: node.registeredId,
    instanceName: node.instanceName,
    attributes: node.attributes,
    childCount: node.children.length,
    portSummary,
    hasWarning: doc.validationErrors?.some((e) => e.path === node.path),
    dimmed: Boolean(q) && !matches,
    status: statuses?.[node.path],
  };
}

export function findInTree(root: BtNodeData | null, path: string): BtNodeData | null {
  if (!root) {
    return null;
  }
  if (root.path === path) {
    return root;
  }
  for (const child of root.children) {
    const found = findInTree(child, path);
    if (found) {
      return found;
    }
  }
  return null;
}
