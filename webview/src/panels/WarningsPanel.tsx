import type { SerializedDocument, ValidationIssuePayload } from '../types';
import { postMessage } from '../vscodeApi';
import { QuickFixButtons } from '../components/QuickFixButtons';

interface WarningsPanelProps {
  doc: SerializedDocument;
  onSelectPath?: (path: string) => void;
}

type PanelItem =
  | { key: string; text: string; issue?: undefined }
  | { key: string; text: string; issue: ValidationIssuePayload };

export function WarningsPanel({ doc, onSelectPath }: WarningsPanelProps) {
  const items: PanelItem[] = [
    ...doc.warnings.map((w, i) => ({ key: `w-${i}`, text: w })),
    ...(doc.validationErrors ?? []).map((e, i) => ({ key: `e-${i}`, text: e.message, issue: e })),
  ];

  if (items.length === 0) {
    return null;
  }

  const reveal = (issue: ValidationIssuePayload) => {
    if (issue.treeId && issue.treeId !== doc.activeTreeId) {
      // Node lives in another tree: switch to it first; the path is shown for orientation.
      postMessage({ type: 'selectTree', treeId: issue.treeId });
      return;
    }
    onSelectPath?.(issue.path);
  };

  return (
    <div className="warnings-panel" role="region" aria-label="Warnings and validation issues">
      <h4>Issues ({items.length})</h4>
      <ul>
        {items.map((item) => {
          const issue = item.issue;
          const location = issue?.path
            ? issue.treeId && issue.treeId !== doc.activeTreeId
              ? `${issue.treeId} › ${issue.path}`
              : issue.path
            : null;
          return (
            <li key={item.key}>
              {issue && location && onSelectPath ? (
                <button
                  type="button"
                  className="warning-link"
                  onClick={() => reveal(issue)}
                  title="Show node"
                >
                  [{location}] {item.text}
                </button>
              ) : (
                <span>{item.text}</span>
              )}
              {issue && <QuickFixButtons issue={issue} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
