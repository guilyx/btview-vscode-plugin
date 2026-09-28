import type { IssueRefPayload, SerializedDocument, ValidationIssuePayload } from '../types';

/** Issues attached to a node of `treeId`; issues without a tree ID match any tree. */
export function issuesForNode(
  doc: Pick<SerializedDocument, 'validationErrors'>,
  treeId: string,
  path: string,
): ValidationIssuePayload[] {
  return (doc.validationErrors ?? []).filter(
    (e) => e.path === path && (!e.treeId || e.treeId === treeId),
  );
}

/** Reference the host uses to find the issue again before applying a fix. */
export function issueRef(issue: ValidationIssuePayload): IssueRefPayload | null {
  if (!issue.code) {
    return null;
  }
  return { code: issue.code, path: issue.path, treeId: issue.treeId, message: issue.message };
}
