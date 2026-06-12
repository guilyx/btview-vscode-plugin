import type { SerializedDocument } from '../types';

interface WarningsPanelProps {
  doc: SerializedDocument;
  onSelectPath?: (path: string) => void;
}

export function WarningsPanel({ doc, onSelectPath }: WarningsPanelProps) {
  const items = [
    ...doc.warnings.map((w, i) => ({ key: `w-${i}`, text: w, path: undefined })),
    ...(doc.validationErrors ?? []).map((e, i) => ({
      key: `e-${i}`,
      text: e.message,
      path: e.path,
    })),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="warnings-panel" role="region" aria-label="Warnings and validation issues">
      <h4>Issues ({items.length})</h4>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            {item.path && onSelectPath ? (
              <button type="button" className="warning-link" onClick={() => onSelectPath(item.path!)}>
                [{item.path}] {item.text}
              </button>
            ) : (
              item.text
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
