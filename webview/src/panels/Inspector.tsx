import { useEffect, useRef, useState } from 'react';
import type { FlowNodeData } from '../graph/layout';
import { removeStagedNode } from '../graph/stagedNodes';
import { postMessage } from '../vscodeApi';

interface InspectorProps {
  node: FlowNodeData | null;
  treeId: string;
  formatVersion: 3 | 4;
  hasRoot: boolean;
}

export function Inspector({ node, treeId, formatVersion, hasRoot }: InspectorProps) {
  const [draftName, setDraftName] = useState('');
  const [draftAttrs, setDraftAttrs] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (node && !node.staged) {
      setDraftName(node.instanceName ?? '');
      setDraftAttrs({ ...node.attributes });
    }
  }, [node?.path, node?.instanceName, node?.attributes, node?.staged]);

  const commitEdit = (attr: string, value: string) => {
    if (!node || node.staged) {
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

  if (node.staged) {
    const canBeRoot = !hasRoot && node.kind === 'control';
    return (
      <div className="inspector" role="complementary" aria-label="Node inspector">
        <h3>{node.registeredId}</h3>
        <p className="meta staged-badge">Staged · not in XML yet</p>
        <p className="inspector-hint">
          Connect from a parent&apos;s bottom handle to this node&apos;s top handle, or set as tree
          root below.
        </p>
        {canBeRoot && (
          <button
            type="button"
            onClick={() => {
              postMessage({
                type: 'addNode',
                treeId,
                parentPath: '0',
                registeredId: node.registeredId,
                kind: node.kind,
              });
              removeStagedNode(treeId, node.path);
            }}
          >
            Set as tree root
          </button>
        )}
        <button
          type="button"
          className="danger"
          onClick={() => {
            removeStagedNode(treeId, node.path);
          }}
        >
          Remove staged node
        </button>
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
