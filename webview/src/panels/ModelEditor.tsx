import { useState } from 'react';
import type { SerializedDocument } from '../types';
import { postMessage } from '../vscodeApi';
import { formatPortTooltip, serializeModelSnippet } from '../utils/modelSnippet';

interface ModelEditorProps {
  doc: SerializedDocument;
}

const KIND_OPTIONS = ['action', 'condition', 'control', 'decorator', 'subtree'] as const;

export function ModelEditor({ doc }: ModelEditorProps) {
  const [newId, setNewId] = useState('');
  const [newKind, setNewKind] = useState<string>('action');
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const addModel = () => {
    const id = newId.trim();
    if (!id) {
      return;
    }
    postMessage({ type: 'addModel', id, kind: newKind });
    setNewId('');
  };

  const copySnippet = async (model: SerializedDocument['models'][number]) => {
    const snippet = serializeModelSnippet(model);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopyNotice(`Copied ${model.id}`);
      window.setTimeout(() => setCopyNotice(null), 2000);
    } catch {
      setCopyNotice('Clipboard unavailable');
    }
  };

  return (
    <div className="model-editor" role="complementary" aria-label="Node models">
      <p className="model-editor-title">Node models ({doc.models.length})</p>

      <div className="model-editor-add">
        <input
          type="text"
          className="model-editor-input"
          placeholder="New model ID"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          aria-label="New model ID"
        />
        <select
          className="model-editor-kind-select"
          value={newKind}
          onChange={(e) => setNewKind(e.target.value)}
          aria-label="New model kind"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="model-editor-btn"
          onClick={addModel}
          disabled={!newId.trim()}
        >
          Add
        </button>
      </div>

      {copyNotice && <p className="model-editor-notice">{copyNotice}</p>}

      {doc.models.length === 0 ? (
        <p className="inspector-hint">No TreeNodesModel entries in this file.</p>
      ) : (
        <ul className="model-editor-list">
          {doc.models.map((model) => (
            <li key={model.id} className="model-editor-item">
              <span className="model-editor-kind">{model.kind}</span>
              <strong>{model.id}</strong>
              {model.ports.length > 0 && (
                <span
                  className="model-editor-ports"
                  title={formatPortTooltip(model) ?? model.ports.map((p) => p.name).join(', ')}
                >
                  {model.ports.length} port{model.ports.length === 1 ? '' : 's'}
                </span>
              )}
              <div className="model-editor-actions">
                <button
                  type="button"
                  className="model-editor-btn subtle"
                  onClick={() => copySnippet(model)}
                  title="Copy XML snippet to clipboard"
                >
                  Copy XML
                </button>
                <button
                  type="button"
                  className="model-editor-btn subtle danger"
                  onClick={() => postMessage({ type: 'deleteModel', modelId: model.id })}
                  title="Remove model from file"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
