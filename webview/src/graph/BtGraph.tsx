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
import { buildFlowGraph, type FlowNodeData } from './layout';
import { BtFlowNode } from '../nodes/BtNode';
import type { BtNodeData } from '../types';
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

const nodeTypes = { btNode: BtFlowNode };

interface BtGraphProps {
  root: BtNodeData | null;
  treeId: string;
  onNodeSelect: (node: FlowNodeData | null) => void;
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
): { nodes: Node<FlowNodeData>[]; edges: ReturnType<typeof buildFlowGraph>['edges'] } {
  const tree = buildFlowGraph(root);
  return {
    nodes: [...tree.nodes, ...staged.map(stagedToFlowNode)],
    edges: tree.edges,
  };
}

function FitViewOnFirstLoad({ treeId }: { treeId: string }) {
  const { fitView } = useReactFlow();
  const fittedTree = useRef<string | null>(null);

  useEffect(() => {
    if (fittedTree.current !== treeId) {
      fittedTree.current = treeId;
      void fitView({ padding: 0.2, duration: 200 });
    }
  }, [treeId, fitView]);

  return null;
}

function BtGraphInner({ root, treeId, onNodeSelect }: BtGraphProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [stagedNodes, setStagedNodes] = useState<StagedNode[]>(() => loadStagedNodes(treeId));
  const initial = useMemo(() => mergeGraphWithStaged(root, stagedNodes), [root, stagedNodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStagedNodes(loadStagedNodes(treeId));
  }, [treeId]);

  useEffect(() => {
    const refresh = () => setStagedNodes(loadStagedNodes(treeId));
    window.addEventListener(STAGED_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(STAGED_CHANGED_EVENT, refresh);
  }, [treeId]);

  useEffect(() => {
    const { nodes: n, edges: e } = mergeGraphWithStaged(root, stagedNodes);
    setNodes(n);
    setEdges(e);
  }, [root, stagedNodes, setNodes, setEdges]);

  const flowPositionFromClient = useCallback(
    (clientX: number, clientY: number) => {
      return screenToFlowPosition({ x: clientX, y: clientY });
    },
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
        position,
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

  const onNodeDrag = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      const target = findReparentTarget(node, nodes as Node<FlowNodeData>[]);
      setDragTarget(target?.id ?? null);
    },
    [nodes, findReparentTarget],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      setDragTarget(null);

      if (isStagedId(node.id)) {
        setStagedNodes((prev) => {
          const next = prev.map((s) => (s.id === node.id ? { ...s, position: node.position } : s));
          mergeStagedIntoState(treeId, () => next);
          return next;
        });
        return;
      }

      if (!node.id || node.id === '0') {
        return;
      }
      const target = findReparentTarget(node, nodes as Node<FlowNodeData>[]);
      if (target) {
        postMessage({
          type: 'reparentNode',
          treeId,
          sourcePath: node.id,
          targetPath: target.id,
        });
      }
    },
    [nodes, treeId, findReparentTarget],
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
            n.id === dragTarget ? 'drop-target' : '',
            (n.data as FlowNodeData).staged ? 'staged-node' : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        selected: n.selected,
      })),
    [nodes, dragTarget],
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
        <FitViewOnFirstLoad treeId={treeId} />
        <Background gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
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
