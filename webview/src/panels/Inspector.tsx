import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlowNodeData } from '../graph/layout';
import { removeStagedNode, updateStagedNode } from '../graph/stagedNodes';
import { postMessage } from '../vscodeApi';
import { resolveNodePorts, type ResolvedPort } from '../utils/portResolution';
import { useGraphContext } from '../commands/graphContext';

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
  models: {
    id: string;
    kind: string;
    ports: { name: string; direction: string; type?: string; defaultValue?: string }[];
  }[];
}

function portBadge(direction: string): string {
  if (direction === 'output') {
    return '→';
  }
  if (direction === 'inout') {
    return '↔';
  }
  return '←';
}

function PortField({
  port,
  value,
  onChange,
  onRemove,
}: {
  port: ResolvedPort;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
}) {
  const hint = port.type ? ` (${port.type})` : '';
  return (
    <label htmlFor={`btview-port-${port.name}`} className="port-field">
      <span className="port-field-label">
        <span className="port-badge" title={port.direction}>
          {portBadge(port.direction)}
        </span>
        {port.name}
        {hint}
      </span>
      <input
        id={`btview-port-${port.name}`}
        value={value}
        placeholder={port.defaultValue ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {onRemove && (
        <button
          type="button"
          className="port-remove"
          onClick={onRemove}
          aria-label={`Remove ${port.name}`}
        >
          ×
        </button>
      )}
    </label>
  );
}

export function Inspector({
  node,
  treeId,
  formatVersion,
  hasRoot,
  nodePalette,
  models,
}: InspectorProps) {
  const { renameRequestPath, requestRename } = useGraphContext();
  const nameInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (renameRequestPath && node?.path === renameRequestPath && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      requestRename(null);
    }
  }, [renameRequestPath, node?.path, requestRename]);

  const resolvedPorts = useMemo(() => {
    if (!node || node.staged) {
      return null;
    }
    return resolveNodePorts(node, models);
  }, [node, models]);

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
          ref={nameInputRef}
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

      {resolvedPorts && (
        <>
          {resolvedPorts.inputs.length > 0 && (
            <>
              <p className="inspector-section-label">Inputs</p>
              {resolvedPorts.inputs.map((port) => (
                <PortField
                  key={port.name}
                  port={port}
                  value={draftAttrs[port.name] ?? ''}
                  onChange={(v) => {
                    setDraftAttrs((prev) => ({ ...prev, [port.name]: v }));
                    scheduleEdit(port.name, v);
                  }}
                  onRemove={
                    port.name in draftAttrs
                      ? () => {
                          postMessage({
                            type: 'removePort',
                            treeId,
                            path: node.path,
                            attr: port.name,
                          });
                          setDraftAttrs((prev) => {
                            const next = { ...prev };
                            delete next[port.name];
                            return next;
                          });
                        }
                      : undefined
                  }
                />
              ))}
            </>
          )}
          {resolvedPorts.inouts.length > 0 && (
            <>
              <p className="inspector-section-label">In / Out</p>
              {resolvedPorts.inouts.map((port) => (
                <PortField
                  key={port.name}
                  port={port}
                  value={draftAttrs[port.name] ?? ''}
                  onChange={(v) => {
                    setDraftAttrs((prev) => ({ ...prev, [port.name]: v }));
                    scheduleEdit(port.name, v);
                  }}
                />
              ))}
            </>
          )}
          {resolvedPorts.outputs.length > 0 && (
            <>
              <p className="inspector-section-label">Outputs</p>
              {resolvedPorts.outputs.map((port) => (
                <PortField
                  key={port.name}
                  port={port}
                  value={draftAttrs[port.name] ?? ''}
                  onChange={(v) => {
                    setDraftAttrs((prev) => ({ ...prev, [port.name]: v }));
                    scheduleEdit(port.name, v);
                  }}
                />
              ))}
            </>
          )}
          {resolvedPorts.custom.length > 0 && (
            <>
              <p className="inspector-section-label">Custom attributes</p>
              {resolvedPorts.custom.map((port) => (
                <PortField
                  key={port.name}
                  port={port}
                  value={draftAttrs[port.name] ?? ''}
                  onChange={(v) => {
                    setDraftAttrs((prev) => ({ ...prev, [port.name]: v }));
                    scheduleEdit(port.name, v);
                  }}
                  onRemove={() => {
                    postMessage({ type: 'removePort', treeId, path: node.path, attr: port.name });
                    setDraftAttrs((prev) => {
                      const next = { ...prev };
                      delete next[port.name];
                      return next;
                    });
                  }}
                />
              ))}
            </>
          )}
        </>
      )}

      {!resolvedPorts &&
        Object.keys(draftAttrs).map((key) => (
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
