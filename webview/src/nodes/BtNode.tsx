import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../graph/layout';

const kindColors: Record<string, string> = {
  control: '#4a9eff',
  decorator: '#a78bfa',
  action: '#4ade80',
  condition: '#facc15',
  subtree: '#fb923c',
  script: '#f472b6',
  unknown: '#94a3b8',
};

function BtFlowNodeInner({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const color = kindColors[d.kind] ?? kindColors.unknown;
  const staged = Boolean(d.staged);

  return (
    <div
      className={`bt-node ${selected ? 'selected' : ''} ${staged ? 'staged' : ''}`}
      style={{ borderColor: color }}
      aria-selected={selected}
      tabIndex={0}
    >
      <Handle type="target" position={Position.Top} />
      {staged && <div className="bt-node-staged-label">staged</div>}
      <div className="bt-node-kind" style={{ color }}>
        {d.kind}
      </div>
      <div className="bt-node-label">{d.label}</div>
      <div className="bt-node-id">{d.registeredId}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const BtFlowNode = memo(BtFlowNodeInner);
