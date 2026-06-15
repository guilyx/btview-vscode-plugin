import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlowNodeData } from '../graph/layout';
import { removeStagedNode, updateStagedNode } from '../graph/stagedNodes';
import { postMessage } from '../vscodeApi';

const NODE_KINDS = [
  'control',
  'decorator',
  'action',
  'condition',
  'subtree',
  'script',
  'unknown',
] as const;

interface InspectorProps {
  node: FlowNodeData | null;
  treeId: string;
  formatVersion: 3 | 4;
  hasRoot: boolean;
  nodePalette: { id: string; kind: string }[];
}

export function Inspector({ node, treeId, formatVersion, hasRoot, nodePalette }: InspectorProps) {
  const [draftName, setDraftName] = useState('');
  const [draftKind, setDraftKind] = useState<string>('action');
  const [draftTypeId, setDraftTypeId] = useState('');
  const [draftAttrs, setDraftAttrs] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (node) {
      setDraftName(node.instanceName ?? '');
      setDraftKind(node.kind);
      setDraftTypeId(node.registeredId);
      if (!node.staged) {
        setDraftAttrs({ ...node.attributes });
      }
    }
  }, [
    node?.path,
    node?.instanceName,
    node?.kind,
    node?.registeredId,
    node?.attributes,
    node?.staged,
  ]);

  const typeSuggestions = useMemo(() => {
    const filtered = nodePalette.filter((e) => e.kind === draftKind).map((e) => e.id);
    if (draftTypeId && !filtered.includes(draftTypeId)) {
      return [draftTypeId, ...filtered];
    }
    return filtered;
  }, [nodePalette, draftKind, draftTypeId]);

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

  const commitDefinition = (kind: string, registeredId: string) => {
    if (!node || node.staged) {
      return;
    }
    if (kind === node.kind && registeredId === node.registeredId) {
      return;
    }
    postMessage({
      type: 'changeNodeType',
      treeId,
      path: node.path,
      kind,
      registeredId,
    });
  };

  const applyStagedDefinition = (kind: string, registeredId: string) => {
    if (!node?.staged) {
      return;
    }
    updateStagedNode(treeId, node.path, { kind, registeredId });
  };

  const scheduleDefinition = (kind: string, registeredId: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => commitDefinition(kind, registeredId), 400);
  };

  if (!node) {
    return (
      <div className="inspector empty" role="complementary" aria-label="Node inspector">
        <p className="inspector-empty-title">Node inspector</p>
        <p className="inspector-hint">
          Click a node on the canvas to edit its type, name, and ports.
        </p>
      </div>
    );
  }

  const definitionFields = (
    <>
      <label htmlFor="btview-node-kind">
        Kind
        <select
          id="btview-node-kind"
          value={draftKind}
          onChange={(e) => {
            const kind = e.target.value;
            setDraftKind(kind);
            if (node.staged) {
              applyStagedDefinition(kind, draftTypeId);
            } else {
              commitDefinition(kind, draftTypeId);
            }
          }}
        >
          {NODE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="btview-node-type">
        Type (registered ID)
        <input
          id="btview-node-type"
          list="btview-type-suggestions"
          value={draftTypeId}
          onChange={(e) => {
            setDraftTypeId(e.target.value);
            if (node.staged) {
              applyStagedDefinition(draftKind, e.target.value);
            } else {
              scheduleDefinition(draftKind, e.target.value);
            }
          }}
          onBlur={(e) => {
            if (node.staged) {
              applyStagedDefinition(draftKind, e.target.value);
            } else {
              commitDefinition(draftKind, e.target.value);
            }
          }}
        />
        <datalist id="btview-type-suggestions">
          {typeSuggestions.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
      </label>
    </>
  );

  if (node.staged) {
    const canBeRoot = !hasRoot && draftKind === 'control';
    return (
      <div className="inspector" role="complementary" aria-label="Node inspector">
        <h3>{draftTypeId || node.registeredId}</h3>
        <p className="meta staged-badge">Staged · not in XML yet</p>
        {definitionFields}
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
                registeredId: draftTypeId,
                kind: draftKind,
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
      <h3>{draftTypeId || node.registeredId}</h3>
      <p className="meta">BTCpp v{formatVersion}</p>

      {definitionFields}

      <label htmlFor="btview-node-name">
        Instance name
        <input
          id="btview-node-name"
          value={draftName}
          placeholder="(optional)"
          onChange={(e) => {
            setDraftName(e.target.value);
            scheduleEdit('name', e.target.value);
          }}
          onBlur={(e) => commitEdit('name', e.target.value)}
        />
      </label>

      {Object.keys(draftAttrs).length > 0 && <p className="inspector-section-label">Ports</p>}
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
