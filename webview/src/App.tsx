import { useEffect, useState } from 'react';
import type { SerializedDocument } from './types';
import { BtGraph } from './graph/BtGraph';
import { Inspector } from './panels/Inspector';
import { Toolbar } from './panels/Toolbar';
import type { FlowNodeData } from './graph/layout';
import { postMessage } from './vscodeApi';

export function App() {
  const [doc, setDoc] = useState<SerializedDocument | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'loadDocument' || msg.type === 'documentChanged') {
        setDoc(msg.document);
        setError(null);
      } else if (msg.type === 'error') {
        setError(msg.message);
      }
    };

    window.addEventListener('message', handler);
    postMessage({ type: 'ready' });

    const selectHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { node: FlowNodeData };
      setSelectedNode(detail.node);
    };
    window.addEventListener('btview-select', selectHandler);

    return () => {
      window.removeEventListener('message', handler);
      window.removeEventListener('btview-select', selectHandler);
    };
  }, []);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (!doc) {
    return <div className="loading">Loading behavior tree…</div>;
  }

  const activeTree = doc.trees.find((t) => t.id === doc.activeTreeId) ?? doc.trees[0];

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="format-badge">BTCpp v{doc.formatVersion}</span>
          <select
            value={doc.activeTreeId}
            onChange={(e) => postMessage({ type: 'selectTree', treeId: e.target.value })}
          >
            {doc.trees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}
              </option>
            ))}
          </select>
        </div>
        {doc.warnings.length > 0 && (
          <span className="warnings" title={doc.warnings.join('\n')}>
            {doc.warnings.length} warning(s)
          </span>
        )}
      </header>

      {doc.includes.length > 0 && (
        <div className="includes">
          {doc.includes.map((inc, i) => (
            <button
              key={i}
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

      <Toolbar
        treeId={doc.activeTreeId}
        formatVersion={doc.formatVersion}
        selectedPath={selectedNode?.path ?? null}
      />

      <div className="main">
        <BtGraph root={activeTree?.root ?? null} treeId={doc.activeTreeId} />
        <Inspector
          node={selectedNode}
          treeId={doc.activeTreeId}
          formatVersion={doc.formatVersion}
        />
      </div>
    </div>
  );
}
