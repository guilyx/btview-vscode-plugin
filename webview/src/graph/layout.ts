import type { Node, Edge } from '@xyflow/react';
import type { BtNodeData } from '../types';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  kind: string;
  path: string;
  registeredId: string;
  instanceName?: string;
  attributes: Record<string, string>;
  childCount: number;
  /** Uncommitted palette node — not yet in XML until connected. */
  staged?: boolean;
  /** Resolved port summary for canvas chips */
  portSummary?: string[];
  /** Validation warning on this node */
  hasWarning?: boolean;
  /** Dimmed when search filter active */
  dimmed?: boolean;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;
const H_GAP = 40;
const V_GAP = 80;

export const SNAP_GRID = 16;

export function snapToGrid(value: number): number {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
}

export function buildFlowGraph(
  root: BtNodeData | null,
  layoutPositions?: Record<string, { x: number; y: number }>,
): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];

  if (!root) {
    return { nodes, edges };
  }

  // Tidy tree layout: leaves are placed left-to-right, each parent is
  // centered over the span of its children, so siblings and cousins never
  // overlap and every subtree reads as a visual unit.
  const positions = new Map<string, { x: number; y: number }>();
  let cursor = 0;

  function place(node: BtNodeData, depth: number): number {
    const y = depth * (NODE_HEIGHT + V_GAP);
    if (node.children.length === 0) {
      const x = cursor;
      cursor += NODE_WIDTH + H_GAP;
      positions.set(node.path, { x, y });
      return x;
    }
    const childXs = node.children.map((child) => place(child, depth + 1));
    const x = (childXs[0]! + childXs[childXs.length - 1]!) / 2;
    positions.set(node.path, { x, y });
    return x;
  }

  const rootX = place(root, 0);
  // Recentre so the root sits at x = 0 regardless of tree shape.
  for (const [path, pos] of positions) {
    positions.set(path, { x: pos.x - rootX - NODE_WIDTH / 2, y: pos.y });
  }

  function addNodes(node: BtNodeData): void {
    const autoPos = positions.get(node.path) ?? { x: 0, y: 0 };
    const saved = layoutPositions?.[node.path];
    const pos = saved ?? autoPos;
    const label = node.instanceName ?? node.registeredId;
    nodes.push({
      id: node.path,
      type: 'btNode',
      position: pos,
      data: {
        label,
        kind: node.kind,
        path: node.path,
        registeredId: node.registeredId,
        instanceName: node.instanceName,
        attributes: node.attributes,
        childCount: node.children.length,
      },
    });

    for (const child of node.children) {
      edges.push({
        id: `${node.path}->${child.path}`,
        source: node.path,
        target: child.path,
        type: 'smoothstep',
      });
      addNodes(child);
    }
  }

  addNodes(root);
  return { nodes, edges };
}
