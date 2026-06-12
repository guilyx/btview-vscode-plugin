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
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildFlowGraph, type FlowNodeData } from './layout';
import { BtFlowNode } from '../nodes/BtNode';
import type { BtNodeData } from '../types';
import { BTVIEW_NODE_DRAG, type PaletteDragPayload } from '../panels/NodePaletteSidebar';
import { getState, setState } from '../vscodeApi';

const nodeTypes = { btNode: BtFlowNode };

interface BtGraphProps {
  root: BtNodeData | null;
  treeId: string;
  parentPath: string;
  onNodeSelect: (node: FlowNodeData | null) => void;
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

function BtGraphInner({ root, treeId, parentPath, onNodeSelect }: BtGraphProps) {
  const initial = useMemo(() => buildFlowGraph(root), [root]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  useEffect(() => {
    const { nodes: n, edges: e } = buildFlowGraph(root);
    setNodes(n);
    setEdges(e);
    const saved = getState<{ viewport?: { x: number; y: number; zoom: number } }>();
    if (saved?.viewport) {
      // viewport restored via defaultViewport below on next mount
    }
  }, [root, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      onNodeSelect(node.data);
    },
    [onNodeSelect],
  );

  const findReparentTarget = useCallback(
    (dragged: Node<FlowNodeData>, allNodes: Node<FlowNodeData>[]) => {
      return allNodes
        .filter((n) => n.id !== dragged.id && !dragged.id.startsWith(n.id + '-'))
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
        postMessage({
          type: 'addNode',
          treeId,
          parentPath,
          registeredId: payload.id,
          kind: payload.kind,
        });
      } catch {
        // ignore malformed drag payload
      }
    },
    [treeId, parentPath],
  );

  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        className: n.id === dragTarget ? 'drop-target' : undefined,
        selected: n.selected,
      })),
    [nodes, dragTarget],
  );

  return (
    <div
      className="graph-container"
      role="application"
      aria-label="Behavior tree graph"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable={false}
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
