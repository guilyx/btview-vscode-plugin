import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../graph/layout';
import { kindColor } from '../nodes/kindStyles';

function BtFlowNodeInner({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const color = kindColor(d.kind);
  const staged = Boolean(d.staged);

  return (
    <div
      className={`bt-node ${selected ? 'selected' : ''} ${staged ? 'staged' : ''} ${d.dimmed ? 'dimmed' : ''} ${d.hasWarning ? 'has-warning' : ''}`}
      style={{ borderColor: color, opacity: d.dimmed ? 0.35 : 1 }}
      aria-selected={selected}
      tabIndex={0}
    >
      <Handle type="target" position={Position.Top} />
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
