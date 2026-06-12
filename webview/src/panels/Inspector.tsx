import { useEffect, useRef, useState } from 'react';
import type { FlowNodeData } from '../graph/layout';
import { postMessage } from '../vscodeApi';

interface InspectorProps {
  node: FlowNodeData | null;
  treeId: string;
  formatVersion: 3 | 4;
}

export function Inspector({ node, treeId, formatVersion }: InspectorProps) {
  const [draftName, setDraftName] = useState('');
  const [draftAttrs, setDraftAttrs] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (node) {
      setDraftName(node.instanceName ?? '');
      setDraftAttrs({ ...node.attributes });
    }
  }, [node?.path, node?.instanceName, node?.attributes]);

  const commitEdit = (attr: string, value: string) => {
    if (!node) {
      return;
    }
    postMessage({
      type: 'editNode',
      treeId,
      path: node.path,
      attr,
      value,
    });
  };

  const scheduleEdit = (attr: string, value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => commitEdit(attr, value), 300);
  };

  if (!node) {
    return (
      <div className="inspector empty" role="complementary" aria-label="Node inspector">
        Select a node to inspect
      </div>
    );
  }

  return (
    <div className="inspector" role="complementary" aria-label="Node inspector">
      <h3>{node.registeredId}</h3>
      <p className="meta">
        {node.kind} · BTCpp v{formatVersion}
      </p>

      <label htmlFor="btview-node-name">
        name
        <input
          id="btview-node-name"
          value={draftName}
          onChange={(e) => {
            setDraftName(e.target.value);
            scheduleEdit('name', e.target.value);
          }}
          onBlur={(e) => commitEdit('name', e.target.value)}
        />
      </label>

      {Object.keys(draftAttrs).map((key) => (
        <label key={key} htmlFor={`btview-attr-${key}`}>
          {key}
          <input
            id={`btview-attr-${key}`}
            value={draftAttrs[key] ?? ''}
            onChange={(e) => {
              setDraftAttrs((prev) => ({ ...prev, [key]: e.target.value }));
              scheduleEdit(key, e.target.value);
            }}
            onBlur={(e) => commitEdit(key, e.target.value)}
          />
        </label>
      ))}

      <button
        type="button"
        className="danger"
        onClick={() => {
          if ((node.childCount ?? 0) > 0 && !window.confirm('Delete this node and its subtree?')) {
            return;
          }
          postMessage({ type: 'deleteNode', treeId, path: node.path });
        }}
      >
        Delete node
      </button>
    </div>
  );
}
