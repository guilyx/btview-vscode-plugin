import { describe, expect, it } from 'vitest';
import { buildFlowGraph } from '../../../webview/src/graph/layout';
import type { BtNodeData } from '../../../webview/src/types';

describe('buildFlowGraph', () => {
  it('returns empty graph for null root', () => {
    const { nodes, edges } = buildFlowGraph(null);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('builds nodes and edges for simple tree', () => {
    const root: BtNodeData = {
      path: '0',
      kind: 'control',
      registeredId: 'Sequence',
      attributes: {},
      children: [
        {
          path: '0-0',
          kind: 'action',
          registeredId: 'MyAction',
          attributes: {},
          children: [],
        },
      ],
    };
    const { nodes, edges } = buildFlowGraph(root);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(nodes[0]?.data.childCount).toBe(1);
    expect(nodes[0]?.position).toEqual(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );
  });

  it('centers parents over their children and keeps sibling subtrees apart', () => {
    const leaf = (path: string): BtNodeData => ({
      path,
      kind: 'action',
      registeredId: 'Act',
      attributes: {},
      children: [],
    });
    const root: BtNodeData = {
      path: '0',
      kind: 'control',
      registeredId: 'Sequence',
      attributes: {},
      children: [
        {
          path: '0-0',
          kind: 'control',
          registeredId: 'Fallback',
          attributes: {},
          children: [leaf('0-0-0'), leaf('0-0-1'), leaf('0-0-2')],
        },
        {
          path: '0-1',
          kind: 'control',
          registeredId: 'Sequence',
          attributes: {},
          children: [leaf('0-1-0')],
        },
      ],
    };

    const { nodes } = buildFlowGraph(root);
    const byPath = new Map(nodes.map((n) => [n.id, n.position]));

    // Each parent sits at the midpoint of its children's span.
    const fallback = byPath.get('0-0')!;
    expect(fallback.x).toBeCloseTo((byPath.get('0-0-0')!.x + byPath.get('0-0-2')!.x) / 2);
    const rootPos = byPath.get('0')!;
    expect(rootPos.x).toBeCloseTo((byPath.get('0-0')!.x + byPath.get('0-1')!.x) / 2);

    // Same-depth nodes from different subtrees never overlap.
    const depth2 = ['0-0-0', '0-0-1', '0-0-2', '0-1-0']
      .map((p) => byPath.get(p)!.x)
      .sort((a, b) => a - b);
    for (let i = 1; i < depth2.length; i++) {
      expect(depth2[i]! - depth2[i - 1]!).toBeGreaterThanOrEqual(180);
    }

    // Depth maps to the y axis.
    expect(byPath.get('0')!.y).toBeLessThan(byPath.get('0-0')!.y);
    expect(byPath.get('0-0')!.y).toBeLessThan(byPath.get('0-0-0')!.y);
  });

  it('prefers saved layout positions over computed ones', () => {
    const root: BtNodeData = {
      path: '0',
      kind: 'control',
      registeredId: 'Sequence',
      attributes: {},
      children: [],
    };
    const { nodes } = buildFlowGraph(root, { '0': { x: 42, y: 24 } });
    expect(nodes[0]?.position).toEqual({ x: 42, y: 24 });
  });
});
