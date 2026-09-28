import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STATE_KEY,
  canvasEmptyState,
  isOnboardingDismissed,
} from '../../../webview/src/utils/onboarding';
import { buildNewTreeXml } from '../../btcpp/treeTemplate';
import { parseDocument } from '../../btcpp/parser';
import { validateDocument } from '../../btcpp/validation';

const leaf = { path: '0', kind: 'action', registeredId: 'A', attributes: {}, children: [] };

describe('canvasEmptyState', () => {
  it('reports a file without trees, with the create-tree fix when offered', () => {
    const issue = {
      path: '',
      message: 'no trees',
      code: 'no-behavior-tree',
      fixes: [{ kind: 'createTree', title: 'Add <BehaviorTree ID="MainTree">' }],
    };
    expect(canvasEmptyState({ trees: [], activeTreeId: 'MainTree' })).toEqual({
      kind: 'noTrees',
      createTreeIssue: undefined,
    });
    expect(
      canvasEmptyState({ trees: [], activeTreeId: 'MainTree', validationErrors: [issue] }),
    ).toEqual({ kind: 'noTrees', createTreeIssue: issue });
  });

  it('reports an empty active tree', () => {
    const trees = [
      { id: 'Main', root: leaf },
      { id: 'Empty', root: null },
    ];
    expect(canvasEmptyState({ trees, activeTreeId: 'Empty' })).toEqual({
      kind: 'emptyTree',
      treeId: 'Empty',
    });
    expect(canvasEmptyState({ trees, activeTreeId: 'Main' })).toBeNull();
    // Unknown active tree falls back to the first tree, like the graph does.
    expect(canvasEmptyState({ trees, activeTreeId: 'Gone' })).toBeNull();
  });
});

describe('isOnboardingDismissed', () => {
  it('honours host global state and per-editor webview state', () => {
    expect(isOnboardingDismissed({}, undefined)).toBe(false);
    expect(isOnboardingDismissed({ onboardingDismissed: true }, undefined)).toBe(true);
    expect(isOnboardingDismissed({}, { [ONBOARDING_STATE_KEY]: true })).toBe(true);
    expect(isOnboardingDismissed({}, { viewport: {} })).toBe(false);
  });
});

describe('new tree templates', () => {
  it('produce an empty canvas that validates cleanly', () => {
    for (const formatVersion of [3, 4] as const) {
      const xml = buildNewTreeXml({ formatVersion, treeId: 'MainTree', emptyCanvas: true });
      const doc = parseDocument(xml);
      expect(doc.trees).toEqual([expect.objectContaining({ id: 'MainTree', root: null })]);
      expect(validateDocument(doc)).toEqual([]);
    }
  });
});
