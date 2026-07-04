import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../graph/layout';
import { kindColor } from '../nodes/kindStyles';

const STATUS_COLORS: Record<string, string> = {
  RUNNING: '#f0ad4e',
  SUCCESS: '#4ade80',
  FAILURE: '#f87171',
  SKIPPED: '#9ca3af',
};

function BtFlowNodeInner({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const color = kindColor(d.kind);
  const staged = Boolean(d.staged);
  const status = d.status && d.status !== 'IDLE' ? d.status : undefined;
  const statusColor = status ? STATUS_COLORS[status] : undefined;

  return (
    <div
      className={`bt-node ${selected ? 'selected' : ''} ${staged ? 'staged' : ''} ${d.dimmed ? 'dimmed' : ''} ${d.hasWarning ? 'has-warning' : ''} ${status ? `status-${status}` : ''}`}
      style={{
        borderColor: statusColor ?? color,
        opacity: d.dimmed ? 0.35 : 1,
        boxShadow: statusColor ? `0 0 0 2px ${statusColor}` : undefined,
      }}
      aria-selected={selected}
      tabIndex={0}
    >
      <Handle type="target" position={Position.Top} />
      {status && (
        <div
          className="bt-node-status"
          style={{ background: statusColor }}
          title={`Status: ${status}`}
        >
          {status}
        </div>
      )}
      {staged && <div className="bt-node-staged-label">staged</div>}
      {d.hasWarning && (
        <div className="bt-node-warning" title="Validation warning">
          !
        </div>
      )}
      <div className="bt-node-kind" style={{ color }}>
        {d.kind}
      </div>
      <div className="bt-node-label">{d.label}</div>
      <div className="bt-node-id">{d.registeredId}</div>
      {d.portSummary && d.portSummary.length > 0 && (
        <div className="bt-node-ports">
          {d.portSummary.map((p) => (
            <span key={p} className="bt-node-port-chip">
              {p}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const BtFlowNode = memo(BtFlowNodeInner);
