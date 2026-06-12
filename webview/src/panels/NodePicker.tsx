import type { SerializedDocument } from '../types';
import { postMessage } from '../vscodeApi';

interface NodePickerProps {
  doc: SerializedDocument;
  parentPath: string;
}

export function NodePicker({ doc, parentPath }: NodePickerProps) {
  if (doc.models.length === 0) {
    return null;
  }

  return (
    <div className="node-picker">
      <span className="toolbar-label">From model:</span>
      {doc.models.map((m) => (
        <button
          key={m.id}
          title={m.ports.map((p) => `${p.direction}:${p.name}`).join(', ')}
          onClick={() =>
            postMessage({
              type: 'addNode',
              treeId: doc.activeTreeId,
              parentPath,
              registeredId: m.id,
              kind: m.kind,
            })
          }
        >
          {m.id}
        </button>
      ))}
    </div>
  );
}
