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
  });
});
