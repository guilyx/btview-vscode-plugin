import type { SerializedDocument } from '../types';
import { postMessage } from '../vscodeApi';

interface ToolbarProps {
  doc: SerializedDocument;
  selectedPath: string;
}

const KIND_LABELS: Record<string, string> = {
  control: 'Controls',
  decorator: 'Decorators',
  action: 'Actions',
  condition: 'Conditions',
  subtree: 'Subtrees',
  script: 'Scripts',
};

export function Toolbar({ doc, selectedPath }: ToolbarProps) {
  const parentPath = selectedPath ?? '0';

  const addNode = (registeredId: string, kind: string) => {
    postMessage({
      type: 'addNode',
      treeId: doc.activeTreeId,
      parentPath,
      registeredId,
      kind,
    });
  };

  const byKind = new Map<string, { id: string; kind: string }[]>();
  for (const entry of doc.nodePalette) {
    const list = byKind.get(entry.kind) ?? [];
    list.push(entry);
    byKind.set(entry.kind, list);
  }

  const kindOrder = ['control', 'decorator', 'action', 'condition', 'subtree', 'script'];

  return (
    <div className="toolbar">
      <span className="toolbar-label">Add to {parentPath}:</span>
      {kindOrder.map((kind) => {
        const entries = byKind.get(kind);
        if (!entries?.length) {
          return null;
        }
        return (
          <span key={kind} className="toolbar-group">
            <span className="toolbar-group-label">{KIND_LABELS[kind] ?? kind}:</span>
            {entries.map((entry) => (
              <button key={entry.id} onClick={() => addNode(entry.id, entry.kind)}>
                {entry.id}
              </button>
            ))}
          </span>
        );
      })}
    </div>
  );
}
