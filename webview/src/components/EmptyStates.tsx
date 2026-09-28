/** Onboarding empty states: load errors, files without trees, and empty trees. */

import type { ValidationIssuePayload } from '../types';
import { postMessage } from '../vscodeApi';
import { issueRef } from '../utils/issues';
import { STARTER_ROOTS } from '../utils/onboarding';

export interface LoadErrorInfo {
  message: string;
  line?: number;
  column?: number;
}

/** Shown instead of the graph when the XML cannot be loaded (syntax error, no `<root>`, …). */
export function LoadErrorState({ error }: { error: LoadErrorInfo }) {
  const where =
    error.line !== undefined
      ? `Line ${error.line}${error.column !== undefined ? `, column ${error.column}` : ''}`
      : null;
  return (
    <div className="empty-state" role="alert" aria-labelledby="btview-load-error-title">
      <h2 id="btview-load-error-title" className="empty-state-title">
        This file could not be displayed as a behavior tree
      </h2>
      {where && <p className="empty-state-where">{where}</p>}
      <pre className="empty-state-error">{error.message}</pre>
      <p className="empty-state-desc">
        Fix the XML in the text editor — the graph reloads automatically once the file parses. The
        Problems panel points at the same location.
      </p>
      <div className="empty-state-actions">
        <button
          type="button"
          className="empty-state-primary"
          onClick={() => postMessage({ type: 'openSource' })}
        >
          Open XML Source
        </button>
      </div>
    </div>
  );
}

/** The file parsed but declares no `<BehaviorTree>`. */
export function NoTreesState({ createTreeIssue }: { createTreeIssue?: ValidationIssuePayload }) {
  const ref = createTreeIssue ? issueRef(createTreeIssue) : null;
  const fix = createTreeIssue?.fixes?.[0];
  return (
    <div className="empty-state" role="region" aria-labelledby="btview-no-trees-title">
      <h2 id="btview-no-trees-title" className="empty-state-title">
        No behavior trees in this file
      </h2>
      <p className="empty-state-desc">
        Add a <code>&lt;BehaviorTree&gt;</code> to start editing. It will be created empty, ready
        for nodes from the palette.
      </p>
      <div className="empty-state-actions">
        {ref && fix && (
          <button
            type="button"
            className="empty-state-primary"
            onClick={() => postMessage({ type: 'applyQuickFix', issue: ref, fix: fix.title })}
          >
            Add BehaviorTree “MainTree”
          </button>
        )}
        <button type="button" onClick={() => postMessage({ type: 'openSource' })}>
          Open XML Source
        </button>
      </div>
    </div>
  );
}

/** Overlay on an empty tree canvas with one-click root starters. */
export function EmptyTreeOverlay({ treeId }: { treeId: string }) {
  return (
    <div className="empty-canvas-overlay" role="region" aria-label="Empty tree">
      <p className="empty-canvas-title">“{treeId}” is empty</p>
      <p className="empty-canvas-desc">
        Pick a root control to start, or drag nodes from the palette — staged nodes appear dashed
        until you connect them (parent bottom handle → child top handle).
      </p>
      <div className="empty-canvas-actions">
        {STARTER_ROOTS.map((root) => (
          <button
            key={root.id}
            type="button"
            title={`${root.id}: ${root.hint}`}
            onClick={() =>
              postMessage({
                type: 'addNode',
                treeId,
                parentPath: '0',
                registeredId: root.id,
                kind: 'control',
              })
            }
          >
            Start with {root.id}
          </button>
        ))}
      </div>
    </div>
  );
}
