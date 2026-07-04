import { describe, expect, it } from 'vitest';
import {
  validateNodeChildren,
  validateReparent,
  validateDocument,
  validateUniqueTreeIds,
  validateMainTree,
  validateSubtreeReferences,
  validateSubtreeCycles,
  validateNodePorts,
} from '../../btcpp/validation';
import type { BtNode, BtDocument, NodeModel } from '../../btcpp/types';

function leaf(path: string, kind: BtNode['kind'] = 'action'): BtNode {
  return { path, kind, registeredId: 'Test', attributes: {}, children: [] };
}

function control(path: string, children: BtNode[]): BtNode {
  return { path, kind: 'control', registeredId: 'Sequence', attributes: {}, children };
}

function subtree(path: string, targetId: string, legacyTag?: string): BtNode {
  return {
    path,
    kind: 'subtree',
    registeredId: targetId,
    attributes: {},
    children: [],
    legacyTag,
  };
}

function doc(trees: BtDocument['trees'], extra: Partial<BtDocument> = {}): BtDocument {
  return {
    formatVersion: 4,
    trees,
    models: new Map(),
    includes: [],
    warnings: [],
    ...extra,
  };
}

describe('validation', () => {
  it('rejects leaf with children', () => {
    const node = leaf('0');
    node.children = [leaf('0-0')];
    const errors = validateNodeChildren(node);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects reparent into own subtree', () => {
    const seq = control('0-0', [leaf('0-0-0')]);
    const err = validateReparent(seq, leaf('0-0-0'));
    expect(err).not.toBeNull();
  });

  it('validateDocument walks all trees', () => {
    const d = doc([{ id: 'Main', root: control('0', [leaf('0-0'), leaf('0-1')]) }]);
    const errors = validateDocument(d);
    expect(errors).toEqual([]);
  });
});

describe('validateUniqueTreeIds', () => {
  it('flags duplicate BehaviorTree IDs', () => {
    const d = doc([
      { id: 'Main', root: leaf('0') },
      { id: 'Main', root: leaf('0') },
    ]);
    expect(validateUniqueTreeIds(d)).toHaveLength(1);
  });

  it('accepts distinct IDs', () => {
    const d = doc([
      { id: 'Main', root: leaf('0') },
      { id: 'Other', root: leaf('0') },
    ]);
    expect(validateUniqueTreeIds(d)).toEqual([]);
  });
});

describe('validateMainTree', () => {
  it('flags a missing main_tree_to_execute target', () => {
    const d = doc([{ id: 'Main', root: leaf('0') }], { mainTreeToExecute: 'Ghost' });
    expect(validateMainTree(d)).toHaveLength(1);
  });

  it('accepts a resolvable main tree', () => {
    const d = doc([{ id: 'Main', root: leaf('0') }], { mainTreeToExecute: 'Main' });
    expect(validateMainTree(d)).toEqual([]);
  });

  it('is a no-op when unset', () => {
    expect(validateMainTree(doc([{ id: 'Main', root: leaf('0') }]))).toEqual([]);
  });
});

describe('validateSubtreeReferences', () => {
  it('flags a SubTree that references an undefined tree', () => {
    const d = doc([{ id: 'Main', root: control('0', [subtree('0-0', 'Ghost')]) }]);
    const errors = validateSubtreeReferences(d);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Ghost');
  });

  it('accepts a SubTree that resolves', () => {
    const d = doc([
      { id: 'Main', root: control('0', [subtree('0-0', 'Sub')]) },
      { id: 'Sub', root: leaf('0') },
    ]);
    expect(validateSubtreeReferences(d)).toEqual([]);
  });

  it('flags a bare <SubTree/> without an ID', () => {
    const d = doc([{ id: 'Main', root: control('0', [subtree('0-0', 'SubTree')]) }]);
    expect(validateSubtreeReferences(d)).toHaveLength(1);
  });

  it('skips SubTreePlus whose target was dropped at parse time', () => {
    const d = doc([{ id: 'Main', root: control('0', [subtree('0-0', 'SubTree', 'SubTreePlus')]) }]);
    expect(validateSubtreeReferences(d)).toEqual([]);
  });
});

describe('validateSubtreeCycles', () => {
  it('flags a self-recursive subtree', () => {
    const d = doc([{ id: 'Main', root: control('0', [subtree('0-0', 'Main')]) }]);
    expect(validateSubtreeCycles(d)).toHaveLength(1);
  });

  it('flags a mutual cycle between two trees', () => {
    const d = doc([
      { id: 'A', root: control('0', [subtree('0-0', 'B')]) },
      { id: 'B', root: control('0', [subtree('0-0', 'A')]) },
    ]);
    expect(validateSubtreeCycles(d).length).toBeGreaterThan(0);
  });

  it('accepts an acyclic subtree DAG', () => {
    const d = doc([
      { id: 'A', root: control('0', [subtree('0-0', 'B'), subtree('0-1', 'C')]) },
      { id: 'B', root: control('0', [subtree('0-0', 'C')]) },
      { id: 'C', root: leaf('0') },
    ]);
    expect(validateSubtreeCycles(d)).toEqual([]);
  });
});

describe('validateNodePorts required ports', () => {
  const model: NodeModel = {
    id: 'Move',
    kind: 'action',
    ports: [
      { name: 'goal', direction: 'input' },
      { name: 'speed', direction: 'input', defaultValue: '1.0' },
      { name: 'result', direction: 'output' },
    ],
  };
  const models = new Map([['Move', model]]);

  it('flags a missing required input port', () => {
    const node: BtNode = {
      path: '0',
      kind: 'action',
      registeredId: 'Move',
      attributes: {},
      children: [],
    };
    const errors = validateNodePorts(node, models);
    expect(errors.map((e) => e.message).join()).toContain('goal');
  });

  it('does not flag ports with defaults or output ports', () => {
    const node: BtNode = {
      path: '0',
      kind: 'action',
      registeredId: 'Move',
      attributes: { goal: '{target}' },
      children: [],
    };
    expect(validateNodePorts(node, models)).toEqual([]);
  });
});
