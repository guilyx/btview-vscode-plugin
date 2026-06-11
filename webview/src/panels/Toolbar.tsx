import { postMessage } from '../vscodeApi';

interface ToolbarProps {
  treeId: string;
  formatVersion: 3 | 4;
  selectedPath: string | null;
}

const CONTROLS_V3 = ['Sequence', 'Fallback', 'Parallel', 'ReactiveSequence', 'SequenceStar'];
const CONTROLS_V4 = [
  'Sequence',
  'Fallback',
  'Parallel',
  'ReactiveSequence',
  'SequenceWithMemory',
  'AsyncSequence',
  'AsyncFallback',
];
const DECORATORS = ['Inverter', 'Retry', 'Repeat', 'Timeout'];

export function Toolbar({ treeId, formatVersion, selectedPath }: ToolbarProps) {
  const controls = formatVersion === 3 ? CONTROLS_V3 : CONTROLS_V4;
  const parentPath = selectedPath ?? '0';

  const addNode = (registeredId: string, kind: string) => {
    postMessage({
      type: 'addNode',
      treeId,
      parentPath,
      registeredId,
      kind,
    });
  };

  return (
    <div className="toolbar">
      <span className="toolbar-label">Add to {parentPath}:</span>
      {controls.map((id) => (
        <button key={id} onClick={() => addNode(id, 'control')}>
          {id}
        </button>
      ))}
      {DECORATORS.map((id) => (
        <button key={id} onClick={() => addNode(id, 'decorator')}>
          {id}
        </button>
      ))}
      <button onClick={() => addNode('MyAction', 'action')}>Action</button>
      <button onClick={() => addNode('MyCondition', 'condition')}>Condition</button>
      {formatVersion === 4 && <button onClick={() => addNode('Script', 'script')}>Script</button>}
    </div>
  );
}
