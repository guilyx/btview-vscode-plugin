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
import { getState, postMessage, setState } from '../vscodeApi';
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

const nodeTypes = { btNode: BtFlowNode };

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

function FitViewBridge({
  treeId,
  fitViewRef,
}: {
  treeId: string;
  fitViewRef: React.MutableRefObject<(() => void) | null>;
}) {
  const { fitView } = useReactFlow();
  const fittedTree = useRef<string | null>(null);

  useEffect(() => {
    fitViewRef.current = () => {
      void fitView({ padding: 0.2, duration: 200 });
    };
  }, [fitView, fitViewRef]);

  useEffect(() => {
    if (fittedTree.current !== treeId) {
      fittedTree.current = treeId;
      void fitView({ padding: 0.2, duration: 200 });
    }
  }, [treeId, fitView]);

  return null;
}

function BtGraphInner({ root, treeId, doc, onNodeSelect }: BtGraphProps) {
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const { searchQuery, portsVisible, fitViewRef, simStatuses } = useGraphContext();
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

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
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
    setState({ viewport });
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
      })),
    [nodes, dragTarget, stagedDropTarget],
  );

  const showEmptyHint = !root && stagedNodes.length === 0;

  return (
    <div
      ref={graphRef}
      className="graph-container"
      role="application"
      aria-label="Behavior tree graph"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {showEmptyHint && (
        <div className="empty-canvas-overlay" aria-hidden="true">
          <p className="empty-canvas-title">Empty tree canvas</p>
          <p className="empty-canvas-desc">
            Drag nodes from the palette — they appear unconnected. Connect parent → child with edge
            handles, or set a control as root from the inspector.
          </p>
        </div>
      )}
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
        proOptions={{ hideAttribution: true }}
        defaultViewport={
          getState<{ viewport?: { x: number; y: number; zoom: number } }>()?.viewport
        }
      >
        <FitViewBridge treeId={treeId} fitViewRef={fitViewRef} />
        <Background gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          target={contextMenu.target}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
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
