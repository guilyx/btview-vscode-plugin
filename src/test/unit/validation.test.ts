import { describe, expect, it } from 'vitest';
import { validateNodeChildren, validateReparent, validateDocument } from '../../btcpp/validation';
import type { BtNode, BtDocument } from '../../btcpp/types';

function leaf(path: string, kind: BtNode['kind'] = 'action'): BtNode {
  return { path, kind, registeredId: 'Test', attributes: {}, children: [] };
}

function control(path: string, children: BtNode[]): BtNode {
  return { path, kind: 'control', registeredId: 'Sequence', attributes: {}, children };
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
    const doc: BtDocument = {
      formatVersion: 4,
      trees: [{ id: 'Main', root: control('0', [leaf('0-0'), leaf('0-1')]) }],
      models: new Map(),
      includes: [],
      warnings: [],
    };
    const errors = validateDocument(doc);
    expect(errors).toEqual([]);
  });
});
