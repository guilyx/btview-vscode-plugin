import type { SerializedDocument } from '../types';

interface ModelEditorProps {
  doc: SerializedDocument;
}

export function ModelEditor({ doc }: ModelEditorProps) {
  if (doc.models.length === 0) {
    return (
      <div className="model-editor empty">
        <p className="model-editor-title">Node models</p>
        <p className="inspector-hint">No TreeNodesModel entries in this file.</p>
      </div>
    );
  }

  return (
    <div className="model-editor" role="complementary" aria-label="Node models">
      <p className="model-editor-title">Node models ({doc.models.length})</p>
      <ul className="model-editor-list">
        {doc.models.map((model) => (
          <li key={model.id} className="model-editor-item">
            <span className="model-editor-kind">{model.kind}</span>
            <strong>{model.id}</strong>
            {model.ports.length > 0 && (
              <span
                className="model-editor-ports"
                title={model.ports.map((p) => p.name).join(', ')}
              >
                {model.ports.length} port{model.ports.length === 1 ? '' : 's'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
