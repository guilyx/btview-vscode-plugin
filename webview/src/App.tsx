import { useCallback, useEffect, useState } from 'react';
import type { SerializedDocument } from './types';
import { BtGraph } from './graph/BtGraph';
import { Inspector } from './panels/Inspector';
import { NodePaletteSidebar } from './panels/NodePaletteSidebar';
import { WarningsPanel } from './panels/WarningsPanel';
import { ViewSwitcher } from './panels/ViewSwitcher';
import type { FlowNodeData } from './graph/layout';
import { readBootstrapDocument } from './bootstrap';
import { LoadingScreen } from './components/LoadingScreen';
import { signalReady, subscribeHostMessages } from './hostMessages';
import { postMessage } from './vscodeApi';

function isHostMessage(data: unknown): data is { type: string } {
  return Boolean(data && typeof data === 'object' && 'type' in data);
}

export function App() {
  const [doc, setDoc] = useState<SerializedDocument | null>(() => readBootstrapDocument());
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [waitingForHost, setWaitingForHost] = useState(() => !readBootstrapDocument());

  useEffect(() => {
    let documentReceived = Boolean(readBootstrapDocument());

    const applyHostMessage = (raw: unknown) => {
      if (!isHostMessage(raw)) {
        return;
      }
      const msg = raw;
      if (msg.type === 'loadDocument') {
        documentReceived = true;
        setWaitingForHost(false);
        setDoc((msg as { document: SerializedDocument }).document);
        setError(null);
        setValidationError(null);
        setSaving(false);
      } else if (msg.type === 'documentChanged') {
        documentReceived = true;
        setWaitingForHost(false);
        setDoc((msg as { document: SerializedDocument }).document);
        setSaving(false);
      } else if (msg.type === 'error') {
        setWaitingForHost(false);
        setError((msg as { message: string }).message);
        setSaving(false);
      } else if (msg.type === 'validationError') {
        setValidationError((msg as { message: string }).message);
        setSaving(false);
      }
    };

    const unsubscribe = subscribeHostMessages(applyHostMessage);

    if (documentReceived) {
      postMessage({ type: 'loaded' });
    }

    signalReady();

    const retryTimer = window.setTimeout(() => {
      if (!documentReceived) {
        signalReady();
      }
    }, 500);

    const retryTimer2 = window.setTimeout(() => {
      if (!documentReceived) {
        signalReady();
      }
    }, 2000);

    return () => {
      unsubscribe();
      window.clearTimeout(retryTimer);
      window.clearTimeout(retryTimer2);
    };
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
      <LoadingScreen subtitle={waitingForHost ? 'Connecting to editor…' : 'Preparing graph…'} />
    );
  }

  const activeTree = doc.trees.find((t) => t.id === doc.activeTreeId) ?? doc.trees[0];
  const hasRoot = Boolean(activeTree?.root);

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

      <div className="workspace">
        <NodePaletteSidebar doc={doc} />
        <div className="workspace-main">
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
              hasRoot={hasRoot}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
