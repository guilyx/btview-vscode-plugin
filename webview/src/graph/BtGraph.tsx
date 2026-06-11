import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildFlowGraph, type FlowNodeData } from './layout';
import { BtFlowNode } from '../nodes/BtNode';
import type { BtNodeData } from '../types';
import { postMessage } from '../vscodeApi';

const nodeTypes = { btNode: BtFlowNode };

interface BtGraphProps {
  root: BtNodeData | null;
  treeId: string;
}

export function BtGraph({ root, treeId }: BtGraphProps) {
  const initial = useMemo(() => buildFlowGraph(root), [root]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    const { nodes: n, edges: e } = buildFlowGraph(root);
    setNodes(n);
    setEdges(e);
  }, [root, setNodes, setEdges]);

  const onNodeClick = useCallback((_: unknown, node: Node<FlowNodeData>) => {
    setSelectedPath(node.id);
    window.dispatchEvent(new CustomEvent('btview-select', { detail: { node: node.data } }));
  }, []);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      if (!node.id || node.id === '0') {
        return;
      }
      const target = nodes.find((n) => n.id !== node.id && n.position.y < node.position.y);
      if (target) {
        postMessage({
          type: 'reparentNode',
          treeId,
          sourcePath: node.id,
          targetPath: target.id,
        });
      }
    },
    [nodes, treeId],
  );

  return (
    <div className="graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
