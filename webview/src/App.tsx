import { useCallback, useEffect, useState } from 'react';
import type { SerializedDocument, BtNodeData, HostToWebviewMessage } from './types';
import { BtGraph } from './graph/BtGraph';
import { Inspector } from './panels/Inspector';
import { NodePaletteSidebar } from './panels/NodePaletteSidebar';
import { WarningsPanel } from './panels/WarningsPanel';
import { ViewSwitcher } from './panels/ViewSwitcher';
import { SimToolbar } from './panels/SimToolbar';
import { ModelEditor } from './panels/ModelEditor';
import type { FlowNodeData } from './graph/layout';
import { readBootstrapDocument } from './bootstrap';
import { LoadingScreen } from './components/LoadingScreen';
import { KindLegend } from './components/KindLegend';
import { NodeSearch } from './components/NodeSearch';
import { ShortcutHelp } from './components/ShortcutHelp';
import { signalReady, subscribeHostMessages } from './hostMessages';
import { postMessage } from './vscodeApi';
import { GraphContextProvider, useGraphContext } from './commands/graphContext';
import { useGraphHotkeys } from './commands/useGraphHotkeys';
import { resolveNodePorts } from './utils/portResolution';
import { issuesForNode } from './utils/issues';
import { canvasEmptyState } from './utils/onboarding';
import { LoadErrorState, NoTreesState, type LoadErrorInfo } from './components/EmptyStates';
import { FirstRunHint } from './components/FirstRunHint';
import { LiveAnnouncer } from './components/LiveAnnouncer';

function isHostMessage(data: unknown): data is { type: string } & Record<string, unknown> {
  return Boolean(data && typeof data === 'object' && 'type' in data);
}

function findNodeByPath(root: BtNodeData | null, path: string): BtNodeData | null {
  if (!root) {
    return null;
  }
  if (root.path === path) {
    return root;
  }
  for (const child of root.children) {
    const found = findNodeByPath(child, path);
    if (found) {
      return found;
    }
  }
  return null;
}

function toFlowNodeData(
  node: BtNodeData,
  doc: SerializedDocument,
  searchQuery: string,
  portsVisible: boolean,
): FlowNodeData {
  const q = searchQuery.trim().toLowerCase();
  const label = node.instanceName ?? node.registeredId;
  const matches =
    !q ||
    label.toLowerCase().includes(q) ||
    node.registeredId.toLowerCase().includes(q) ||
    node.kind.toLowerCase().includes(q);

  const resolved = resolveNodePorts(node, doc.models);
  const portSummary = portsVisible
    ? [...resolved.inputs, ...resolved.inouts, ...resolved.outputs, ...resolved.custom]
        .filter((p) => p.value)
        .map((p) => `${p.name}=${p.value}`)
        .slice(0, 3)
    : undefined;

  const hasWarning = issuesForNode(doc, doc.activeTreeId, node.path).length > 0;

  return {
    label,
    kind: node.kind,
    path: node.path,
    registeredId: node.registeredId,
    instanceName: node.instanceName,
    attributes: node.attributes,
    childCount: node.children.length,
    portSummary,
    hasWarning,
    dimmed: Boolean(q) && !matches,
  };
}

function GraphWorkspaceInner({
  doc,
  activeTree,
  hasRoot,
  selectedNode,
  setSelectedNode,
  saving,
}: {
  doc: SerializedDocument;
  activeTree: { id: string; root: BtNodeData | null };
  hasRoot: boolean;
  selectedNode: FlowNodeData | null;
  setSelectedNode: (node: FlowNodeData | null) => void;
  saving: boolean;
}) {
  useGraphHotkeys();
  const {
    legendVisible,
    setLegendVisible,
    drillStack,
    jumpDrill,
    selectPath,
    shortcutHelpVisible,
    setShortcutHelpVisible,
    simpleMode,
  } = useGraphContext();
  const simple = doc.simpleMode ?? simpleMode;
  const emptyState = canvasEmptyState(doc);

  return (
    <>
      {shortcutHelpVisible && <ShortcutHelp onClose={() => setShortcutHelpVisible(false)} />}
      <LiveAnnouncer />
      <header className="header">
        <div className="header-left">
          <span className="format-badge">BTCpp v{doc.formatVersion}</span>
          <select
            aria-label="Active behavior tree"
            value={doc.activeTreeId}
            onChange={(e) => {
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
          {drillStack.length > 0 && (
            <nav className="drill-breadcrumbs" aria-label="Subtree navigation">
              <button
                type="button"
                className="drill-crumb"
                onClick={() => jumpDrill(-1)}
                title="Back to main tree"
              >
                {doc.trees[0]?.id ?? 'root'}
              </button>
              {drillStack.map((id, i) => (
                <span key={`${id}-${i}`} className="drill-crumb-wrap">
                  <span className="drill-crumb-sep" aria-hidden="true">
                    ›
                  </span>
                  {i === drillStack.length - 1 ? (
                    <span className="drill-crumb current" aria-current="page">
                      {id}
                    </span>
                  ) : (
                    <button type="button" className="drill-crumb" onClick={() => jumpDrill(i)}>
                      {id}
                    </button>
                  )}
                </span>
              ))}
            </nav>
          )}
          <NodeSearch />
        </div>
        <div className="header-right" role="group" aria-label="Graph tools">
          <button
            type="button"
            className="header-btn"
            onClick={() => setLegendVisible(!legendVisible)}
            aria-pressed={legendVisible}
            title="Toggle color legend (Ctrl+Shift+G)"
          >
            Legend
          </button>
          <button
            type="button"
            className="header-btn"
            onClick={() => setShortcutHelpVisible(true)}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            aria-haspopup="dialog"
          >
            ?
          </button>
          {!simple && (
            <button
              type="button"
              className="header-btn"
              onClick={() => postMessage({ type: 'exportWorkspaceConfig' })}
              title="Export node types to workspace config"
            >
              Save types
            </button>
          )}
          <SimToolbar />
          <ViewSwitcher />
          {saving && (
            <span className="saving-indicator" aria-live="polite">
              Saving…
            </span>
          )}
        </div>
      </header>

      <div className="workspace">
        <NodePaletteSidebar doc={doc} />
        <div className="workspace-main">
          <WarningsPanel doc={doc} onSelectPath={selectPath} />

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
            <div className="graph-pane">
              {emptyState?.kind === 'noTrees' ? (
                <NoTreesState createTreeIssue={emptyState.createTreeIssue} />
              ) : (
                <BtGraph
                  root={activeTree?.root ?? null}
                  treeId={doc.activeTreeId}
                  doc={doc}
                  onNodeSelect={setSelectedNode}
                />
              )}
              <KindLegend
                visible={legendVisible && emptyState?.kind !== 'noTrees'}
                onToggle={() => setLegendVisible(!legendVisible)}
              />
              <FirstRunHint doc={doc} />
            </div>
            <div className="side-panels">
              <Inspector
                node={selectedNode}
                treeId={doc.activeTreeId}
                formatVersion={doc.formatVersion}
                hasRoot={hasRoot}
                nodePalette={doc.nodePalette}
                models={doc.models}
              />
              <ModelEditor doc={doc} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GraphWorkspace({
  doc,
  selectedNode,
  setSelectedNode,
  saving,
}: {
  doc: SerializedDocument;
  selectedNode: FlowNodeData | null;
  setSelectedNode: (node: FlowNodeData | null) => void;
  saving: boolean;
}) {
  const activeTree = doc.trees.find((t) => t.id === doc.activeTreeId) ?? doc.trees[0];
  const hasRoot = Boolean(activeTree?.root);

  const findNodeSubtree = useCallback(
    (path: string) => findNodeByPath(activeTree?.root ?? null, path),
    [activeTree?.root],
  );

  return (
    <GraphContextProvider
      doc={doc}
      selectedNode={selectedNode}
      setSelectedNode={setSelectedNode}
      findNodeSubtree={findNodeSubtree}
    >
      <GraphWorkspaceInner
        doc={doc}
        activeTree={activeTree ?? { id: doc.activeTreeId, root: null }}
        hasRoot={hasRoot}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        saving={saving}
      />
    </GraphContextProvider>
  );
}

export function App() {
  const [doc, setDoc] = useState<SerializedDocument | null>(() => readBootstrapDocument());
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<LoadErrorInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [waitingForHost, setWaitingForHost] = useState(() => !readBootstrapDocument());

  useEffect(() => {
    let documentReceived = Boolean(readBootstrapDocument());

    const applyHostMessage = (raw: unknown) => {
      if (!isHostMessage(raw)) {
        return;
      }
      const msg = raw as HostToWebviewMessage;
      if (msg.type === 'loadDocument') {
        documentReceived = true;
        setWaitingForHost(false);
        setDoc(msg.document);
        setError(null);
        setLoadError(null);
        setValidationError(null);
        setSaving(false);
      } else if (msg.type === 'documentChanged') {
        documentReceived = true;
        setWaitingForHost(false);
        setDoc(msg.document);
        setLoadError(null);
        setSaving(false);
      } else if (msg.type === 'loadError') {
        setWaitingForHost(false);
        setLoadError({ message: msg.message, line: msg.line, column: msg.column });
        setSelectedNode(null);
        setSaving(false);
      } else if (msg.type === 'error') {
        setWaitingForHost(false);
        setError(msg.message);
        setSaving(false);
      } else if (msg.type === 'validationError') {
        setValidationError(msg.message);
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

  useEffect(() => {
    if (!doc || !selectedNode?.path || selectedNode.staged) {
      return;
    }
    const tree = doc.trees.find((t) => t.id === doc.activeTreeId) ?? doc.trees[0];
    const payload = findNodeByPath(tree?.root ?? null, selectedNode.path);
    if (payload) {
      setSelectedNode(toFlowNodeData(payload, doc, '', doc.showNodePorts ?? false));
    }
  }, [doc, selectedNode?.path, selectedNode?.staged]);

  if (error) {
    return (
      <div className="error-banner" role="alert" aria-live="assertive">
        {error}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app">
        <LoadErrorState error={loadError} />
      </div>
    );
  }

  if (!doc) {
    return (
      <LoadingScreen subtitle={waitingForHost ? 'Connecting to editor…' : 'Preparing graph…'} />
    );
  }

  return (
    <div className="app">
      {validationError && (
        <div className="validation-error-banner" role="alert">
          {validationError}
        </div>
      )}
      <GraphWorkspace
        doc={doc}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        saving={saving}
      />
    </div>
  );
}
