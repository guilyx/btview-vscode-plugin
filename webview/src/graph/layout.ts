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
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;
const H_GAP = 40;
const V_GAP = 80;

export function buildFlowGraph(root: BtNodeData | null): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];

  if (!root) {
    return { nodes, edges };
  }

  const levels = new Map<string, number>();
  const positions = new Map<string, { x: number; y: number }>();

  function assignLevel(node: BtNodeData, depth: number): void {
    levels.set(node.path, depth);
    for (const child of node.children) {
      assignLevel(child, depth + 1);
    }
  }

  assignLevel(root, 0);

  const byLevel = new Map<number, BtNodeData[]>();
  function collect(node: BtNodeData): void {
    const level = levels.get(node.path) ?? 0;
    if (!byLevel.has(level)) {
      byLevel.set(level, []);
    }
    byLevel.get(level)!.push(node);
    for (const child of node.children) {
      collect(child);
    }
  }
  collect(root);

  for (const [level, levelNodes] of byLevel) {
    const totalWidth = levelNodes.length * NODE_WIDTH + (levelNodes.length - 1) * H_GAP;
    let x = -totalWidth / 2;
    for (const node of levelNodes) {
      positions.set(node.path, { x, y: level * (NODE_HEIGHT + V_GAP) });
      x += NODE_WIDTH + H_GAP;
    }
  }

  function addNodes(node: BtNodeData): void {
    const pos = positions.get(node.path) ?? { x: 0, y: 0 };
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
