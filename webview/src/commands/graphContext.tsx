import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { FlowNodeData } from '../graph/layout';
import type { BtNodeData, SerializedDocument } from '../types';
import { postMessage } from '../vscodeApi';
import { removeStagedNode } from '../graph/stagedNodes';
import { subscribeHostMessages } from '../hostMessages';
import { enrichNodeData } from '../graph/enrichNodeData';

export interface GraphContextValue {
  doc: SerializedDocument;
  treeId: string;
  selectedNode: FlowNodeData | null;
  setSelectedNode: (node: FlowNodeData | null) => void;
  findNodeSubtree: (path: string) => BtNodeData | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  legendVisible: boolean;
  setLegendVisible: (v: boolean) => void;
  portsVisible: boolean;
  setPortsVisible: (v: boolean) => void;
  renameRequestPath: string | null;
  requestRename: (path: string | null) => void;
  fitViewRef: React.MutableRefObject<(() => void) | null>;
  /** Centers the viewport on a node path; wired up by the graph canvas. */
  focusPathRef: React.MutableRefObject<((path: string) => void) | null>;
  /** Selects the node at `path` and centers the viewport on it. */
  selectPath: (path: string) => void;
  deleteSelected: () => void;
  clipboardSubtree: BtNodeData | null;
  setClipboardSubtree: (node: BtNodeData | null) => void;
  drillStack: string[];
  pushDrill: (treeId: string) => void;
  popDrill: () => void;
  /** Jump to a breadcrumb entry: -1 for the home tree, otherwise a drill stack index. */
  jumpDrill: (index: number) => void;
  shortcutHelpVisible: boolean;
  setShortcutHelpVisible: (v: boolean) => void;
  simpleMode: boolean;
}

const GraphContext = createContext<GraphContextValue | null>(null);

export function useGraphContext(): GraphContextValue {
  const ctx = useContext(GraphContext);
  if (!ctx) {
    throw new Error('useGraphContext must be used within GraphContextProvider');
  }
  return ctx;
}

interface GraphContextProviderProps {
  doc: SerializedDocument;
  selectedNode: FlowNodeData | null;
  setSelectedNode: (node: FlowNodeData | null) => void;
  findNodeSubtree: (path: string) => BtNodeData | null;
  children: ReactNode;
}

export function GraphContextProvider({
  doc,
  selectedNode,
  setSelectedNode,
  findNodeSubtree,
  children,
}: GraphContextProviderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [legendVisible, setLegendVisible] = useState(true);
  const [portsVisible, setPortsVisible] = useState(() => doc.showNodePorts ?? false);
  const [renameRequestPath, setRenameRequestPath] = useState<string | null>(null);
  const [clipboardSubtree, setClipboardSubtree] = useState<BtNodeData | null>(null);
  const [drillStack, setDrillStack] = useState<string[]>([]);
  const [shortcutHelpVisible, setShortcutHelpVisible] = useState(false);
  const fitViewRef = useRef<(() => void) | null>(null);
  const focusPathRef = useRef<((path: string) => void) | null>(null);

  const treeId = doc.activeTreeId;
  const simpleMode = doc.simpleMode ?? false;

  const selectPath = useCallback(
    (path: string) => {
      const node = findNodeSubtree(path);
      if (!node) {
        return;
      }
      setSelectedNode(enrichNodeData(node, doc, '', doc.showNodePorts ?? false));
      focusPathRef.current?.(path);
    },
    [findNodeSubtree, doc, setSelectedNode],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    if (selectedNode.staged) {
      removeStagedNode(treeId, selectedNode.path);
      setSelectedNode(null);
      return;
    }
    if (selectedNode.path === '0') {
      return;
    }
    if (
      (selectedNode.childCount ?? 0) > 0 &&
      !window.confirm('Delete this node and its subtree?')
    ) {
      return;
    }
    postMessage({ type: 'deleteNode', treeId, path: selectedNode.path });
    setSelectedNode(null);
  }, [selectedNode, treeId, setSelectedNode]);

  const requestRename = useCallback((path: string | null) => {
    setRenameRequestPath(path);
  }, []);

  const pushDrill = useCallback((id: string) => {
    setDrillStack((prev) => [...prev, id]);
    postMessage({ type: 'selectTree', treeId: id });
  }, []);

  const popDrill = useCallback(() => {
    setDrillStack((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const next = prev.slice(0, -1);
      const target = next[next.length - 1] ?? doc.trees[0]?.id;
      if (target) {
        postMessage({ type: 'selectTree', treeId: target });
      }
      return next;
    });
  }, [doc.trees]);

  const jumpDrill = useCallback(
    (index: number) => {
      setDrillStack((prev) => {
        const next = index < 0 ? [] : prev.slice(0, index + 1);
        const target = next[next.length - 1] ?? doc.trees[0]?.id;
        if (target) {
          postMessage({ type: 'selectTree', treeId: target });
        }
        return next;
      });
    },
    [doc.trees],
  );

  useEffect(() => {
    return subscribeHostMessages((raw) => {
      if (!raw || typeof raw !== 'object' || !('type' in raw)) {
        return;
      }
      const msg = raw as { type: string; action?: string };
      if (msg.type !== 'graphAction' || typeof msg.action !== 'string') {
        return;
      }
      switch (msg.action) {
        case 'fitView':
          fitViewRef.current?.();
          break;
        case 'toggleLegend':
          setLegendVisible((v) => !v);
          break;
        case 'togglePorts':
          setPortsVisible((v) => !v);
          break;
        case 'focusSearch': {
          const el = document.getElementById('btview-node-search') as HTMLInputElement | null;
          el?.focus();
          break;
        }
        case 'deleteNode':
          deleteSelected();
          break;
        case 'showShortcutHelp':
          setShortcutHelpVisible(true);
          break;
        default:
          break;
      }
    });
  }, [deleteSelected]);

  const value = useMemo(
    () => ({
      doc,
      treeId,
      selectedNode,
      setSelectedNode,
      findNodeSubtree,
      searchQuery,
      setSearchQuery,
      legendVisible,
      setLegendVisible,
      portsVisible,
      setPortsVisible,
      renameRequestPath,
      requestRename,
      fitViewRef,
      focusPathRef,
      selectPath,
      deleteSelected,
      clipboardSubtree,
      setClipboardSubtree,
      drillStack,
      pushDrill,
      popDrill,
      jumpDrill,
      shortcutHelpVisible,
      setShortcutHelpVisible,
      simpleMode,
    }),
    [
      doc,
      treeId,
      selectedNode,
      setSelectedNode,
      findNodeSubtree,
      searchQuery,
      legendVisible,
      portsVisible,
      renameRequestPath,
      requestRename,
      selectPath,
      deleteSelected,
      clipboardSubtree,
      drillStack,
      pushDrill,
      popDrill,
      jumpDrill,
      shortcutHelpVisible,
      simpleMode,
    ],
  );

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
}
