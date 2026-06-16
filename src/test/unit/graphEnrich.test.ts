import { describe, expect, it } from 'vitest';
import { enrichNodeData, findInTree } from '../../../webview/src/graph/enrichNodeData';
import { buildFlowGraph } from '../../../webview/src/graph/layout';
import type { BtNodeData, SerializedDocument } from '../../../webview/src/types';

const sampleRoot: BtNodeData = {
  path: '0',
  kind: 'control',
  registeredId: 'Sequence',
  attributes: {},
  children: [
    {
      path: '0-0',
      kind: 'action',
      registeredId: 'SaySomething',
      instanceName: 'action_hello',
      attributes: { message: 'Hello' },
      children: [],
    },
  ],
};

const sampleDoc: SerializedDocument = {
  formatVersion: 4,
  activeTreeId: 'MainTree',
  trees: [{ id: 'MainTree', root: sampleRoot }],
  models: [],
  nodePalette: [],
  includes: [],
  warnings: [],
};

describe('buildFlowGraph layout positions', () => {
  it('uses saved positions when provided', () => {
    const saved = {
      '0': { x: 100, y: 200 },
      '0-0': { x: 120, y: 320 },
    };
    const { nodes } = buildFlowGraph(sampleRoot, saved);
    expect(nodes.find((n) => n.id === '0')?.position).toEqual({ x: 100, y: 200 });
    expect(nodes.find((n) => n.id === '0-0')?.position).toEqual({ x: 120, y: 320 });
  });

  it('falls back to auto layout for nodes without saved position', () => {
    const { nodes: auto } = buildFlowGraph(sampleRoot);
    const { nodes: mixed } = buildFlowGraph(sampleRoot, { '0': { x: 50, y: 60 } });
    expect(mixed.find((n) => n.id === '0')?.position).toEqual({ x: 50, y: 60 });
    expect(mixed.find((n) => n.id === '0-0')?.position).toEqual(
      auto.find((n) => n.id === '0-0')?.position,
    );
  });

  it('produces nodes with visible data labels', () => {
    const { nodes } = buildFlowGraph(sampleRoot);
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(node.data.label).toBeTruthy();
      expect(node.data.kind).toBeTruthy();
      expect(node.type).toBe('btNode');
    }
  });
});

describe('enrichNodeData', () => {
  it('does not dim nodes when search is empty', () => {
    const data = enrichNodeData(sampleRoot.children[0]!, sampleDoc, '', false);
    expect(data.dimmed).toBe(false);
    expect(data.label).toBe('action_hello');
  });

  it('dims non-matching nodes when search is active', () => {
    const data = enrichNodeData(sampleRoot.children[0]!, sampleDoc, 'zzznomatch', false);
    expect(data.dimmed).toBe(true);
  });

  it('findInTree resolves nested paths', () => {
    expect(findInTree(sampleRoot, '0-0')?.registeredId).toBe('SaySomething');
    expect(findInTree(sampleRoot, 'missing')).toBeNull();
  });
});
