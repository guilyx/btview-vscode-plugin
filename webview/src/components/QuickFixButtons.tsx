import type { ValidationIssuePayload } from '../types';
import { issueRef } from '../utils/issues';
import { postMessage } from '../vscodeApi';

/** "Fix" buttons for one issue; the host applies the edit to the XML (undoable). */
export function QuickFixButtons({ issue }: { issue: ValidationIssuePayload }) {
  const ref = issueRef(issue);
  if (!ref || !issue.fixes?.length) {
    return null;
  }
  return (
    <span className="quick-fixes">
      {issue.fixes.map((fix) => (
        <button
          key={`${fix.kind}:${fix.title}`}
          type="button"
          className="quick-fix-btn"
          title={fix.title}
          aria-label={`Fix: ${fix.title}`}
          onClick={() => postMessage({ type: 'applyQuickFix', issue: ref, fix: fix.title })}
        >
          {issue.fixes!.length === 1 ? 'Fix' : fix.title}
        </button>
      ))}
    </span>
  );
}
