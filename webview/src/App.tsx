import { useCallback, useEffect, useState } from 'react';
import type { SerializedDocument } from './types';
import { BtGraph } from './graph/BtGraph';
import { Inspector } from './panels/Inspector';
import { Toolbar } from './panels/Toolbar';
import { NodePicker } from './panels/NodePicker';
import { WarningsPanel } from './panels/WarningsPanel';
import { ViewSwitcher } from './panels/ViewSwitcher';
import type { FlowNodeData } from './graph/layout';
import { postMessage } from './vscodeApi';

export function App() {
  const [doc, setDoc] = useState<SerializedDocument | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'loadDocument') {
        setDoc(msg.document);
        setError(null);
        setValidationError(null);
        setSaving(false);
      } else if (msg.type === 'documentChanged') {
        setDoc(msg.document);
        setSaving(false);
      } else if (msg.type === 'error') {
        setError(msg.message);
        setSaving(false);
      } else if (msg.type === 'validationError') {
        setValidationError(msg.message);
        setSaving(false);
      }
    };

    window.addEventListener('message', handler);
    postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, []);

  const onNodeSelect = useCallback((node: FlowNodeData | null) => {
    setSelectedNode(node);
  }, []);

  if (error) {
    return (
      <div className="error-banner" role="alert" aria-live="assertive">
        {error}
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="loading" role="status" aria-live="polite">
        Loading behavior tree…
      </div>
    );
  }

  const activeTree = doc.trees.find((t) => t.id === doc.activeTreeId) ?? doc.trees[0];
  const parentPath = selectedNode?.path ?? '0';

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="format-badge">BTCpp v{doc.formatVersion}</span>
          <select
            aria-label="Active behavior tree"
            value={doc.activeTreeId}
            onChange={(e) => {
              setSaving(true);
              postMessage({ type: 'selectTree', treeId: e.target.value });
            }}
          >
            {doc.trees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}
                {doc.mainTreeToExecute === t.id ? ' (main)' : ''}
              </option>
            ))}
          </select>
          {doc.mainTreeToExecute && (
            <span className="main-tree-badge" title="main_tree_to_execute">
              Entry: {doc.mainTreeToExecute}
            </span>
          )}
        </div>
        <div className="header-right">
          <ViewSwitcher />
          {saving && (
            <span className="saving-indicator" aria-live="polite">
              Saving…
            </span>
          )}
          {validationError && (
            <span className="validation-error" role="alert">
              {validationError}
            </span>
          )}
        </div>
      </header>

      <WarningsPanel doc={doc} onSelectPath={() => undefined} />

      {doc.includes.length > 0 && (
        <div className="includes">
          {doc.includes.map((inc, i) => (
            <button
              key={i}
              type="button"
              className={inc.error ? 'include-error' : 'include-ok'}
              disabled={!inc.resolvedUri}
              onClick={() => postMessage({ type: 'openInclude', resolvedUri: inc.resolvedUri })}
              title={inc.error ?? inc.resolvedUri}
            >
              {inc.rosPkg ? `${inc.rosPkg}:` : ''}
              {inc.path}
            </button>
          ))}
        </div>
      )}

      <Toolbar doc={doc} selectedPath={parentPath} />
      <NodePicker doc={doc} parentPath={parentPath} />

      <div className="main">
        <BtGraph
          root={activeTree?.root ?? null}
          treeId={doc.activeTreeId}
          onNodeSelect={onNodeSelect}
        />
        <Inspector
          node={selectedNode}
          treeId={doc.activeTreeId}
          formatVersion={doc.formatVersion}
        />
      </div>
    </div>
  );
}
