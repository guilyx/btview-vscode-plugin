import { describe, expect, it } from 'vitest';
import { issueRef, issuesForNode } from '../../../webview/src/utils/issues';

const validationErrors = [
  { path: '0-1', message: 'in Main', code: 'unknown-port', treeId: 'Main' },
  { path: '0-1', message: 'in Other', code: 'unknown-port', treeId: 'Other' },
  { path: '0-1', message: 'untagged' },
  { path: '', message: 'document', code: 'missing-main-tree' },
];

describe('issuesForNode', () => {
  it('scopes node issues to the active tree', () => {
    expect(issuesForNode({ validationErrors }, 'Main', '0-1').map((e) => e.message)).toEqual([
      'in Main',
      'untagged',
    ]);
    expect(issuesForNode({ validationErrors }, 'Main', '0-2')).toEqual([]);
    expect(issuesForNode({}, 'Main', '0')).toEqual([]);
  });
});

describe('issueRef', () => {
  it('needs a code to be fixable', () => {
    expect(issueRef(validationErrors[2]!)).toBeNull();
    expect(issueRef(validationErrors[0]!)).toEqual({
      code: 'unknown-port',
      path: '0-1',
      treeId: 'Main',
      message: 'in Main',
    });
  });
});
