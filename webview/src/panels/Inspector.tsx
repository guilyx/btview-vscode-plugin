import type { FlowNodeData } from '../graph/layout';
import { postMessage } from '../vscodeApi';

interface InspectorProps {
  node: FlowNodeData | null;
  treeId: string;
  formatVersion: 3 | 4;
}

export function Inspector({ node, treeId, formatVersion }: InspectorProps) {
  if (!node) {
    return <div className="inspector empty">Select a node to inspect</div>;
  }

  const onAttrChange = (attr: string, value: string) => {
    postMessage({
      type: 'editNode',
      treeId,
      path: node.path,
      attr,
      value,
    });
  };

  return (
    <div className="inspector">
      <h3>{node.registeredId}</h3>
      <p className="meta">
        {node.kind} · BTCpp v{formatVersion}
      </p>

      <label>
        name
        <input
          value={node.instanceName ?? ''}
          onChange={(e) => onAttrChange('name', e.target.value)}
        />
      </label>

      {Object.entries(node.attributes).map(([key, value]) => (
        <label key={key}>
          {key}
          <input value={value} onChange={(e) => onAttrChange(key, e.target.value)} />
        </label>
      ))}

      <button
        className="danger"
        onClick={() => postMessage({ type: 'deleteNode', treeId, path: node.path })}
      >
        Delete node
      </button>
    </div>
  );
}
