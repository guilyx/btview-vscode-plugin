import { describe, expect, it } from 'vitest';
import { navigateTree } from '../../../webview/src/utils/treeNavigation';
import type { BtNodeData } from '../../../webview/src/types';

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
      children: [leaf('0-0-0'), leaf('0-0-1')],
    },
    leaf('0-1'),
  ],
};

describe('navigateTree', () => {
  it('returns null for empty tree and root for missing selection', () => {
    expect(navigateTree(null, '0', 'child')).toBeNull();
    expect(navigateTree(root, null, 'child')).toBe('0');
    expect(navigateTree(root, 'bogus', 'parent')).toBe('0');
  });

  it('moves to parent and first child', () => {
    expect(navigateTree(root, '0-0-1', 'parent')).toBe('0-0');
    expect(navigateTree(root, '0', 'child')).toBe('0-0');
    expect(navigateTree(root, '0-0', 'child')).toBe('0-0-0');
  });

  it('moves between siblings and stops at edges', () => {
    expect(navigateTree(root, '0-0', 'nextSibling')).toBe('0-1');
    expect(navigateTree(root, '0-1', 'prevSibling')).toBe('0-0');
    expect(navigateTree(root, '0-0', 'prevSibling')).toBeNull();
    expect(navigateTree(root, '0-1', 'nextSibling')).toBeNull();
  });

  it('stops at root parent and leaf child', () => {
    expect(navigateTree(root, '0', 'parent')).toBeNull();
    expect(navigateTree(root, '0-1', 'child')).toBeNull();
    expect(navigateTree(root, '0', 'nextSibling')).toBeNull();
  });
});
