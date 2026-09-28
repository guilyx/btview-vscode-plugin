import { describe, expect, it } from 'vitest';
import { collectSearchMatches } from '../../../webview/src/utils/searchMatches';
import type { BtNodeData } from '../../../webview/src/types';

const tree: BtNodeData = {
  path: '0',
  kind: 'control',
  registeredId: 'Sequence',
  attributes: {},
  children: [
    {
      path: '0-0',
      kind: 'action',
      registeredId: 'MoveBase',
      instanceName: 'go_to_dock',
      attributes: {},
      children: [],
    },
    {
      path: '0-1',
      kind: 'condition',
      registeredId: 'BatteryOK',
      attributes: {},
      children: [],
    },
  ],
};

describe('collectSearchMatches', () => {
  it('returns empty for null root or blank query', () => {
    expect(collectSearchMatches(null, 'x')).toEqual([]);
    expect(collectSearchMatches(tree, '')).toEqual([]);
    expect(collectSearchMatches(tree, '   ')).toEqual([]);
  });

  it('matches instance name, registered id, and kind case-insensitively', () => {
    expect(collectSearchMatches(tree, 'dock')).toEqual(['0-0']);
    expect(collectSearchMatches(tree, 'batteryok')).toEqual(['0-1']);
    expect(collectSearchMatches(tree, 'CONDITION')).toEqual(['0-1']);
  });

  it('returns matches in depth-first order', () => {
    expect(collectSearchMatches(tree, 'e')).toEqual(['0', '0-0', '0-1']);
  });
});
