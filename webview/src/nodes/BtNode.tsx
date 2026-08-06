import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../graph/layout';
import { kindColor, kindGlyph } from '../nodes/kindStyles';

function BtFlowNodeInner({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const color = kindColor(d.kind);
  const glyph = kindGlyph(d.kind, d.registeredId);
  const staged = Boolean(d.staged);
  const isSubtree = d.kind === 'subtree';
  const showId = d.instanceName && d.instanceName !== d.registeredId;

  return (
    <div
      className={`bt-node ${selected ? 'selected' : ''} ${staged ? 'staged' : ''} ${d.dimmed ? 'dimmed' : ''} ${d.hasWarning ? 'has-warning' : ''} ${isSubtree ? 'subtree' : ''}`}
      style={
        {
          '--kind-color': color,
          opacity: d.dimmed ? 0.3 : 1,
        } as React.CSSProperties
      }
      aria-selected={selected}
      tabIndex={0}
    >
      <Handle type="target" position={Position.Top} />
      {staged && <div className="bt-node-staged-label">staged</div>}
      {d.hasWarning && (
        <div className="bt-node-warning" title="Validation warning">
          ⚠
        </div>
      )}
      <div className="bt-node-head">
        <span className="bt-node-glyph" aria-hidden="true">
          {glyph}
        </span>
        <span className="bt-node-kind">{d.kind}</span>
        {d.childCount > 0 && (
          <span className="bt-node-child-count" title={`${d.childCount} child node(s)`}>
            {d.childCount}
          </span>
        )}
      </div>
      <div className="bt-node-label" title={d.label}>
        {d.label}
      </div>
      {showId && <div className="bt-node-id">{d.registeredId}</div>}
      {isSubtree && <div className="bt-node-subtree-hint">double-click to open</div>}
      {d.portSummary && d.portSummary.length > 0 && (
        <div className="bt-node-ports">
          {d.portSummary.map((p) => (
            <span key={p} className="bt-node-port-chip" title={p}>
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
