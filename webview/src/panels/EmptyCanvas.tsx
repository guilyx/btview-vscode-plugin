import type { SerializedDocument } from '../types';
import { postMessage } from '../vscodeApi';
import { BTVIEW_NODE_DRAG, type PaletteDragPayload } from './NodePaletteSidebar';

interface EmptyCanvasProps {
  doc: SerializedDocument;
}

const STARTER_CONTROLS = ['Sequence', 'Fallback', 'Parallel'];

export function EmptyCanvas({ doc }: EmptyCanvasProps) {
  const addRoot = (registeredId: string, kind = 'control') => {
    postMessage({
      type: 'addNode',
      treeId: doc.activeTreeId,
      parentPath: '0',
      registeredId,
      kind,
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(BTVIEW_NODE_DRAG)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData(BTVIEW_NODE_DRAG);
    if (!raw) {
      return;
    }
    e.preventDefault();
    try {
      const payload = JSON.parse(raw) as PaletteDragPayload;
      addRoot(payload.id, payload.kind);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="empty-canvas"
      role="region"
      aria-label="Empty behavior tree"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <p className="empty-canvas-title">Empty tree canvas</p>
      <p className="empty-canvas-desc">
        Drag a node from the palette or pick a root control to generate XML.
      </p>
      <div className="empty-canvas-actions">
        {STARTER_CONTROLS.map((id) => (
          <button key={id} type="button" onClick={() => addRoot(id)}>
            Add {id}
          </button>
        ))}
      </div>
    </div>
  );
}
