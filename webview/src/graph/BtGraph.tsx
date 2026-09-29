import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildFlowGraph, snapToGrid, type FlowNodeData } from './layout';
import { BtFlowNode } from '../nodes/BtNode';
import type { BtNodeData, SerializedDocument } from '../types';
import { BTVIEW_NODE_DRAG, type PaletteDragPayload } from '../panels/NodePaletteSidebar';
import { getState, patchState, postMessage } from '../vscodeApi';
import {
  STAGED_CHANGED_EVENT,
  createStagedId,
  isStagedId,
  loadStagedNodes,
  mergeStagedIntoState,
  type StagedNode,
} from './stagedNodes';
import { STAGE_NODE_EVENT, type StageNodeEventDetail } from './stageNodeEvent';
import { useGraphContext } from '../commands/graphContext';
import { ContextMenu, type ContextTarget } from '../components/ContextMenu';
import { enrichNodeData, findInTree } from './enrichNodeData';
import { kindColor } from '../nodes/kindStyles';
import { EmptyTreeOverlay } from '../components/EmptyStates';
import { nodeAriaLabel } from '../utils/a11y';

const nodeTypes = { btNode: BtFlowNode };

function minimapNodeColor(node: Node): string {
  const kind = (node.data as FlowNodeData | undefined)?.kind;
  return kindColor(typeof kind === 'string' ? kind : 'unknown');
}

interface BtGraphProps {
  root: BtNodeData | null;
  treeId: string;
  doc: SerializedDocument;
  onNodeSelect: (node: FlowNodeData | null) => void;
}

function buildEnrichedFlowGraph(
  root: BtNodeData | null,
  doc: SerializedDocument,
  searchQuery: string,
  portsVisible: boolean,
  layoutPositions?: Record<string, { x: number; y: number }>,
  statuses?: Record<string, string>,
): { nodes: Node<FlowNodeData>[]; edges: ReturnType<typeof buildFlowGraph>['edges'] } {
  const tree = buildFlowGraph(root, layoutPositions);
  return {
    nodes: tree.nodes.map((n) => {
      const source = findInTree(root, n.id);
      return {
        ...n,
        data: source
          ? enrichNodeData(source, doc, searchQuery, portsVisible, statuses)
          : (n.data as FlowNodeData),
      };
    }),
    edges: tree.edges,
  };
}

function stagedToFlowNode(staged: StagedNode): Node<FlowNodeData> {
  return {
    id: staged.id,
    type: 'btNode',
    position: staged.position,
    data: {
      label: staged.registeredId,
      kind: staged.kind,
      path: staged.id,
      registeredId: staged.registeredId,
      attributes: {},
      childCount: 0,
      staged: true,
    },
  };
}

function mergeGraphWithStaged(
  root: BtNodeData | null,
  staged: StagedNode[],
  doc: SerializedDocument,
  searchQuery: string,
  portsVisible: boolean,
  layoutPositions?: Record<string, { x: number; y: number }>,
  statuses?: Record<string, string>,
): { nodes: Node<FlowNodeData>[]; edges: ReturnType<typeof buildFlowGraph>['edges'] } {
  const tree = buildEnrichedFlowGraph(
    root,
    doc,
    searchQuery,
    portsVisible,
    layoutPositions,
    statuses,
  );
  return {
    nodes: [...tree.nodes, ...staged.map(stagedToFlowNode)],
    edges: tree.edges,
  };
}

/** Viewport animation length, or 0 when the user prefers reduced motion. */
function animationMs(ms: number): number {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

function nodeElement(path: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(path)}"]`);
}

/**
 * Move keyboard focus to a node card so screen readers follow keyboard navigation —
 * unless the user is typing (search box Enter cycling must keep its focus).
 */
function focusNodeElement(path: string): void {
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')
  ) {
    return;
  }
  // Wait a frame so a freshly rendered node exists before focusing it.
  requestAnimationFrame(() => nodeElement(path)?.focus({ preventScroll: true }));
}

function FitViewBridge({
  treeId,
  fitViewRef,
  focusPathRef,
}: {
  treeId: string;
  fitViewRef: React.MutableRefObject<(() => void) | null>;
  focusPathRef: React.MutableRefObject<((path: string) => void) | null>;
}) {
  const { fitView, setCenter, getNode, getZoom } = useReactFlow();
  const fittedTree = useRef<string | null>(null);

  useEffect(() => {
    fitViewRef.current = () => {
      void fitView({ padding: 0.2, duration: animationMs(200) });
    };
  }, [fitView, fitViewRef]);

  useEffect(() => {
    focusPathRef.current = (path: string) => {
      const node = getNode(path);
      if (!node) {
        return;
      }
      const width = node.measured?.width ?? 180;
      const height = node.measured?.height ?? 56;
      void setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        zoom: Math.max(getZoom(), 0.75),
        duration: animationMs(250),
      });
      focusNodeElement(path);
    };
    return () => {
      focusPathRef.current = null;
    };
  }, [getNode, setCenter, getZoom, focusPathRef]);

  useEffect(() => {
    if (fittedTree.current !== treeId) {
      fittedTree.current = treeId;
      void fitView({ padding: 0.2, duration: animationMs(200) });
    }
  }, [treeId, fitView]);

  return null;
}

function BtGraphInner({ root, treeId, doc, onNodeSelect }: BtGraphProps) {
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const { searchQuery, portsVisible, fitViewRef, focusPathRef, simStatuses, selectedNode } =
    useGraphContext();
  const [stagedNodes, setStagedNodes] = useState<StagedNode[]>(() => loadStagedNodes(treeId));
  const layoutPositions = doc.layoutPositions;
  const initial = useMemo(
    () =>
      mergeGraphWithStaged(
        root,
        stagedNodes,
        doc,
        searchQuery,
        portsVisible,
        layoutPositions,
        simStatuses,
      ),
    [root, stagedNodes, doc, searchQuery, portsVisible, layoutPositions, simStatuses],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [stagedDropTarget, setStagedDropTarget] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    target: ContextTarget;
    x: number;
    y: number;
  } | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const layoutSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStagedNodes(loadStagedNodes(treeId));
  }, [treeId]);

  useEffect(() => {
    const refresh = () => setStagedNodes(loadStagedNodes(treeId));
    window.addEventListener(STAGED_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(STAGED_CHANGED_EVENT, refresh);
  }, [treeId]);

  useEffect(() => {
    const { nodes: n, edges: e } = mergeGraphWithStaged(
      root,
      stagedNodes,
      doc,
      searchQuery,
      portsVisible,
      layoutPositions,
      simStatuses,
    );
    setNodes(n);
    setEdges(e);
  }, [
    root,
    stagedNodes,
    doc,
    searchQuery,
    portsVisible,
    layoutPositions,
    simStatuses,
    setNodes,
    setEdges,
  ]);

  const saveLayout = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of getNodes()) {
      if (!isStagedId(n.id)) {
        positions[n.id] = { x: n.position.x, y: n.position.y };
      }
    }
    postMessage({ type: 'saveLayout', treeId, positions });
  }, [getNodes, treeId]);

  const scheduleLayoutSave = useCallback(() => {
    if (layoutSaveTimer.current) {
      clearTimeout(layoutSaveTimer.current);
    }
    layoutSaveTimer.current = setTimeout(saveLayout, 400);
  }, [saveLayout]);

  const flowPositionFromClient = useCallback(
    (clientX: number, clientY: number) => screenToFlowPosition({ x: clientX, y: clientY }),
    [screenToFlowPosition],
  );

  const canvasCenterPosition = useCallback(() => {
    const el = graphRef.current;
    if (!el) {
      return { x: 0, y: 0 };
    }
    const rect = el.getBoundingClientRect();
    return flowPositionFromClient(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [flowPositionFromClient]);

  const addStagedNode = useCallback(
    (registeredId: string, kind: string, position: { x: number; y: number }) => {
      const entry: StagedNode = {
        id: createStagedId(),
        registeredId,
        kind,
        position: { x: snapToGrid(position.x), y: snapToGrid(position.y) },
      };
      setStagedNodes((prev) => {
        const next = [...prev, entry];
        mergeStagedIntoState(treeId, () => next);
        return next;
      });
    },
    [treeId],
  );

  useEffect(() => {
    const onStage = (event: Event) => {
      const detail = (event as CustomEvent<StageNodeEventDetail>).detail;
      if (!detail?.id) {
        return;
      }
      const position =
        detail.clientX != null && detail.clientY != null
          ? flowPositionFromClient(detail.clientX, detail.clientY)
          : canvasCenterPosition();
      addStagedNode(detail.id, detail.kind, position);
    };

    window.addEventListener(STAGE_NODE_EVENT, onStage);
    return () => window.removeEventListener(STAGE_NODE_EVENT, onStage);
  }, [addStagedNode, canvasCenterPosition, flowPositionFromClient]);

  const removeStaged = useCallback(
    (stagedId: string) => {
      setStagedNodes((prev) => {
        const next = prev.filter((s) => s.id !== stagedId);
        mergeStagedIntoState(treeId, () => next);
        return next;
      });
    },
    [treeId],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      onNodeSelect(node.data);
    },
    [onNodeSelect],
  );

  const onNodeDoubleClick = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      if (!isStagedId(node.id) && node.data.kind === 'subtree') {
        const treeMatch = doc.trees.find((t) => t.id === node.data.registeredId);
        if (treeMatch) {
          postMessage({ type: 'selectTree', treeId: treeMatch.id });
        }
      }
    },
    [doc.trees],
  );

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node<FlowNodeData>) => {
    e.preventDefault();
    const target: ContextTarget = (node.data as FlowNodeData).staged
      ? { kind: 'staged', node: node.data as FlowNodeData }
      : { kind: 'node', node: node.data as FlowNodeData };
    setContextMenu({ target, x: e.clientX, y: e.clientY });
  }, []);

  const onPaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ target: { kind: 'canvas' }, x: e.clientX, y: e.clientY });
  }, []);

  const findReparentTarget = useCallback(
    (dragged: Node<FlowNodeData>, allNodes: Node<FlowNodeData>[]) => {
      if (isStagedId(dragged.id)) {
        return undefined;
      }
      return allNodes
        .filter(
          (n) => n.id !== dragged.id && !isStagedId(n.id) && !dragged.id.startsWith(n.id + '-'),
        )
        .filter((n) => {
          const dy = dragged.position.y - n.position.y;
          const dx = Math.abs(dragged.position.x - n.position.x);
          return dy > 15 && dx < 100;
        })
        .sort((a, b) => b.position.y - a.position.y)[0];
    },
    [],
  );

  const findStagedDropParent = useCallback(
    (stagedNode: Node<FlowNodeData>, allNodes: Node<FlowNodeData>[]) => {
      return allNodes
        .filter((n) => !isStagedId(n.id) && (n.data as FlowNodeData).kind !== 'action')
        .filter((n) => {
          const dy = stagedNode.position.y - n.position.y;
          const dx = Math.abs(stagedNode.position.x - n.position.x);
          return dy > 10 && dx < 120;
        })
        .sort((a, b) => b.position.y - a.position.y)[0];
    },
    [],
  );

  const onNodeDrag = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      if (isStagedId(node.id)) {
        const target = findStagedDropParent(node, nodes as Node<FlowNodeData>[]);
        setStagedDropTarget(target?.id ?? null);
        return;
      }
      const target = findReparentTarget(node, nodes as Node<FlowNodeData>[]);
      setDragTarget(target?.id ?? null);
    },
    [nodes, findReparentTarget, findStagedDropParent],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      setDragTarget(null);
      setStagedDropTarget(null);

      if (isStagedId(node.id)) {
        setStagedNodes((prev) => {
          const next = prev.map((s) =>
            s.id === node.id
              ? {
                  ...s,
                  position: { x: snapToGrid(node.position.x), y: snapToGrid(node.position.y) },
                }
              : s,
          );
          mergeStagedIntoState(treeId, () => next);
          return next;
        });
        return;
      }

      const snapped = {
        ...node,
        position: { x: snapToGrid(node.position.x), y: snapToGrid(node.position.y) },
      };
      setNodes((nds) =>
        nds.map((n) => (n.id === node.id ? { ...n, position: snapped.position } : n)),
      );
      scheduleLayoutSave();

      if (!node.id || node.id === '0') {
        return;
      }
      const target = findReparentTarget(
        snapped as Node<FlowNodeData>,
        nodes as Node<FlowNodeData>[],
      );
      if (target) {
        postMessage({
          type: 'reparentNode',
          treeId,
          sourcePath: node.id,
          targetPath: target.id,
        });
      }
    },
    [nodes, treeId, findReparentTarget, scheduleLayoutSave, setNodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, target } = connection;
      if (!source || !target || source === target) {
        return;
      }

      if (isStagedId(target) && !isStagedId(source)) {
        const staged = stagedNodes.find((s) => s.id === target);
        if (!staged) {
          return;
        }
        postMessage({
          type: 'addNode',
          treeId,
          parentPath: source,
          registeredId: staged.registeredId,
          kind: staged.kind,
        });
        removeStaged(staged.id);
        return;
      }

      if (!isStagedId(source) && !isStagedId(target)) {
        postMessage({
          type: 'reparentNode',
          treeId,
          sourcePath: target,
          targetPath: source,
        });
      }
    },
    [stagedNodes, treeId, removeStaged],
  );

  const onMoveEnd = useCallback((_: unknown, viewport: { x: number; y: number; zoom: number }) => {
    patchState({ viewport });
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(BTVIEW_NODE_DRAG)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const raw = e.dataTransfer.getData(BTVIEW_NODE_DRAG);
      if (!raw) {
        return;
      }
      e.preventDefault();
      try {
        const payload = JSON.parse(raw) as PaletteDragPayload;
        const position = flowPositionFromClient(e.clientX, e.clientY);
        addStagedNode(payload.id, payload.kind, position);
      } catch {
        // ignore malformed drag payload
      }
    },
    [addStagedNode, flowPositionFromClient],
  );

  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        className:
          [
            n.id === dragTarget || n.id === stagedDropTarget ? 'drop-target' : '',
            (n.data as FlowNodeData).staged ? 'staged-node' : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        selected: n.selected,
        ariaLabel: nodeAriaLabel(n.data as FlowNodeData),
      })),
    [nodes, dragTarget, stagedDropTarget],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Focus follows selection: tabbing onto a node card selects it (and announces it).
  const onGraphFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const el = e.target instanceof HTMLElement ? e.target.closest('.react-flow__node') : null;
      const id = el?.getAttribute('data-id');
      if (!id || id === selectedNode?.path) {
        return;
      }
      const node = nodes.find((n) => n.id === id);
      if (node) {
        onNodeSelect(node.data as FlowNodeData);
      }
    },
    [nodes, selectedNode?.path, onNodeSelect],
  );

  // Shift+F10 / the Menu key open the context menu for the selection (or the canvas).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMenuKey = e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey);
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!isMenuKey || (target && target.closest('input, textarea, select, .context-menu'))) {
        return;
      }
      e.preventDefault();
      const anchor = selectedNode ? nodeElement(selectedNode.path) : graphRef.current;
      const rect = anchor?.getBoundingClientRect();
      const x = rect ? rect.left + Math.min(rect.width / 2, 40) : 0;
      const y = rect ? (selectedNode ? rect.bottom : rect.top + rect.height / 2) : 0;
      setContextMenu({
        target: selectedNode
          ? { kind: selectedNode.staged ? 'staged' : 'node', node: selectedNode }
          : { kind: 'canvas' },
        x,
        y,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNode]);

  const showEmptyHint = !root && stagedNodes.length === 0;

  return (
    <div
      ref={graphRef}
      className="graph-container"
      role="region"
      aria-label="Behavior tree graph"
      aria-describedby="btview-graph-help"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onFocus={onGraphFocus}
    >
      <p id="btview-graph-help" className="sr-only">
        Tab or arrow keys move between nodes: up to the parent, down to the first child, left and
        right to siblings. Enter edits the selected node in the inspector, F2 renames, Delete
        removes, Shift+F10 opens the context menu, and question mark lists every shortcut.
      </p>
      {showEmptyHint && <EmptyTreeOverlay treeId={treeId} />}
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable
        connectOnClick={false}
        // Arrow keys walk the tree (useGraphHotkeys) instead of nudging selected nodes.
        disableKeyboardA11y
        proOptions={{ hideAttribution: true }}
        defaultViewport={
          getState<{ viewport?: { x: number; y: number; zoom: number } }>()?.viewport
        }
      >
        <FitViewBridge treeId={treeId} fitViewRef={fitViewRef} focusPathRef={focusPathRef} />
        <Background gap={16} />
        <Controls />
        <MiniMap pannable zoomable nodeColor={minimapNodeColor} nodeStrokeWidth={2} />
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          target={contextMenu.target}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

export function BtGraph(props: BtGraphProps) {
  return (
    <ReactFlowProvider>
      <BtGraphInner {...props} />
    </ReactFlowProvider>
  );
}
