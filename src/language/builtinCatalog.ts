import type { FormatVersion, NodeKind } from '../btcpp/types';
import { SCRIPT_DIRECTIVES } from '../btcpp/types';
import {
  getBuiltinControls,
  getBuiltinDecorators,
  isV3OnlyNode,
  isV4OnlyNode,
} from '../btcpp/nodeRegistry';

export interface PortInfo {
  name: string;
  direction: 'input' | 'output' | 'inout';
  type?: string;
  defaultValue?: string;
  description?: string;
}

export interface BuiltinNode {
  id: string;
  kind: NodeKind;
  description: string;
  ports: PortInfo[];
  versions: FormatVersion[];
}

const BOTH: FormatVersion[] = [3, 4];

const DESCRIPTIONS: Record<string, string> = {
  Sequence: 'Ticks children in order; fails as soon as one child fails.',
  Fallback: 'Ticks children in order until one succeeds.',
  Parallel: 'Ticks all children concurrently; succeeds/fails on configurable thresholds.',
  ReactiveSequence: 'Sequence that re-ticks earlier children every tick.',
  ReactiveFallback: 'Fallback that re-ticks earlier children every tick.',
  SequenceStar: 'Sequence with memory (v3 name of SequenceWithMemory).',
  SequenceWithMemory: 'Sequence that does not re-tick children that already succeeded.',
  IfThenElse: 'Ticks the 2nd child if the 1st succeeds, otherwise the 3rd.',
  WhileDoElse: 'Reactive IfThenElse: re-evaluates the condition every tick.',
  Switch: 'Selects a child by comparing `variable` against `case_N` values.',
  AsyncSequence: 'Sequence that yields RUNNING between children.',
  AsyncFallback: 'Fallback that yields RUNNING between children.',
  Inverter: 'Inverts SUCCESS/FAILURE of its child.',
  Retry: 'Re-ticks a failing child up to `num_attempts` times.',
  Repeat: 'Re-ticks a succeeding child `num_cycles` times.',
  Timeout: 'Halts the child and fails after `msec` milliseconds.',
  ForceSuccess: 'Returns SUCCESS whatever the child returns (except RUNNING).',
  ForceFailure: 'Returns FAILURE whatever the child returns (except RUNNING).',
  Delay: 'Waits `delay_msec` milliseconds before ticking the child.',
  RunOnce: 'Ticks the child only once.',
  Script: 'Executes a script expression (v4).',
  SetBlackboard: 'Writes `value` into the blackboard entry `output_key`.',
  SubTree: 'Instantiates another `<BehaviorTree>` by ID.',
  SubTreePlus: 'SubTree with port remapping (v3).',
  AlwaysSuccess: 'Always returns SUCCESS.',
  AlwaysFailure: 'Always returns FAILURE.',
};

const PORTS: Record<string, (v: FormatVersion) => PortInfo[]> = {
  Parallel: (v) =>
    v === 4
      ? [
          {
            name: 'success_count',
            direction: 'input',
            type: 'int',
            defaultValue: '-1',
            description: 'Children that must succeed (-1 = all).',
          },
          {
            name: 'failure_count',
            direction: 'input',
            type: 'int',
            defaultValue: '1',
            description: 'Children that must fail to fail the node.',
          },
        ]
      : [
          {
            name: 'success_threshold',
            direction: 'input',
            type: 'int',
            description: 'Children that must succeed.',
          },
          {
            name: 'failure_threshold',
            direction: 'input',
            type: 'int',
            defaultValue: '1',
            description: 'Children that must fail to fail the node.',
          },
        ],
  Switch: () => [
    { name: 'variable', direction: 'input', description: 'Value compared against each case.' },
  ],
  Retry: () => [
    {
      name: 'num_attempts',
      direction: 'input',
      type: 'int',
      description: 'Attempts before giving up (-1 = infinite).',
    },
  ],
  Repeat: () => [
    {
      name: 'num_cycles',
      direction: 'input',
      type: 'int',
      description: 'Repetitions (-1 = infinite).',
    },
  ],
  Timeout: () => [
    {
      name: 'msec',
      direction: 'input',
      type: 'unsigned',
      description: 'Timeout in milliseconds.',
    },
  ],
  Delay: () => [
    {
      name: 'delay_msec',
      direction: 'input',
      type: 'unsigned',
      description: 'Delay in milliseconds.',
    },
  ],
  RunOnce: () => [
    {
      name: 'then_skip',
      direction: 'input',
      type: 'bool',
      defaultValue: 'true',
      description:
        'If true, return SKIPPED after the first execution; otherwise repeat its status.',
    },
  ],
  Script: () => [
    { name: 'code', direction: 'input', type: 'string', description: 'Script to execute.' },
  ],
  SetBlackboard: () => [
    { name: 'value', direction: 'input', description: 'Value to write.' },
    { name: 'output_key', direction: 'inout', description: 'Blackboard entry to write.' },
  ],
  SubTree: (v) =>
    v === 4
      ? [
          {
            name: '_autoremap',
            direction: 'input',
            type: 'bool',
            defaultValue: 'false',
            description: 'Remap every port with the same name automatically.',
          },
        ]
      : [
          {
            name: '__shared_blackboard',
            direction: 'input',
            type: 'bool',
            defaultValue: 'false',
            description: 'Share the parent blackboard (v3).',
          },
        ],
  SubTreePlus: () => [
    {
      name: '__autoremap',
      direction: 'input',
      type: 'bool',
      defaultValue: 'false',
      description: 'Remap every port with the same name automatically.',
    },
  ],
};

for (const t of ['Int', 'Bool', 'Double', 'String']) {
  DESCRIPTIONS[`BlackboardCheck${t}`] = 'Ticks the child only if `value_A` equals `value_B` (v3).';
  PORTS[`BlackboardCheck${t}`] = () => [
    { name: 'value_A', direction: 'input', description: 'First value.' },
    { name: 'value_B', direction: 'input', description: 'Second value.' },
    {
      name: 'return_on_mismatch',
      direction: 'input',
      type: 'NodeStatus',
      description: 'Status returned when the values differ.',
    },
  ];
}

function versionsFor(id: string): FormatVersion[] {
  if (isV3OnlyNode(id)) {
    return [3];
  }
  if (isV4OnlyNode(id)) {
    return [4];
  }
  return BOTH;
}

function makeNode(id: string, kind: NodeKind): BuiltinNode {
  return {
    id,
    kind,
    description: DESCRIPTIONS[id] ?? '',
    ports: [],
    versions: versionsFor(id),
  };
}

function buildCatalog(version: FormatVersion): BuiltinNode[] {
  const nodes: BuiltinNode[] = [];
  for (const id of getBuiltinControls(version)) {
    nodes.push(makeNode(id, 'control'));
  }
  for (const id of getBuiltinDecorators()) {
    nodes.push(makeNode(id, 'decorator'));
  }
  if (version === 3) {
    for (const t of ['Int', 'Bool', 'Double', 'String']) {
      nodes.push(makeNode(`BlackboardCheck${t}`, 'decorator'));
    }
    nodes.push(makeNode('SetBlackboard', 'action'));
    nodes.push(makeNode('SubTreePlus', 'subtree'));
  } else {
    nodes.push(makeNode('Script', 'script'));
  }
  nodes.push(makeNode('AlwaysSuccess', 'action'));
  nodes.push(makeNode('AlwaysFailure', 'action'));
  nodes.push(makeNode('SubTree', 'subtree'));
  for (const node of nodes) {
    node.ports = PORTS[node.id]?.(version) ?? [];
  }
  return nodes.filter((n) => n.versions.includes(version));
}

const CATALOG_CACHE = new Map<FormatVersion, BuiltinNode[]>();

export function getBuiltinNodes(version: FormatVersion): BuiltinNode[] {
  let nodes = CATALOG_CACHE.get(version);
  if (!nodes) {
    nodes = buildCatalog(version);
    CATALOG_CACHE.set(version, nodes);
  }
  return nodes;
}

export interface CommonAttribute {
  name: string;
  description: string;
  versions: FormatVersion[];
}

const PRE_CONDITIONS: Record<string, string> = {
  _skipIf: 'Pre-condition: skip the node (SKIPPED) when the script is true.',
  _successIf: 'Pre-condition: return SUCCESS without ticking when the script is true.',
  _failureIf: 'Pre-condition: return FAILURE without ticking when the script is true.',
  _while: 'Pre-condition: tick while the script is true; halt and skip otherwise.',
  _onSuccess: 'Post-condition: script executed when the node returns SUCCESS.',
  _onFailure: 'Post-condition: script executed when the node returns FAILURE.',
  _post: 'Post-condition: script executed when the node returns SUCCESS or FAILURE.',
  _onHalted: 'Post-condition: script executed when the node is halted.',
};

export const COMMON_ATTRIBUTES: CommonAttribute[] = [
  { name: 'name', description: 'Instance name shown in logs and the graph.', versions: BOTH },
  ...SCRIPT_DIRECTIVES.map((name) => ({
    name,
    description: PRE_CONDITIONS[name] ?? 'Script directive.',
    versions: [4] as FormatVersion[],
  })),
];

export function getCommonAttributes(version: FormatVersion): CommonAttribute[] {
  return COMMON_ATTRIBUTES.filter((a) => a.versions.includes(version));
}

/** Tags that wrap a registered node ID in `ID="…"`. */
export const WRAPPER_TAGS: Record<string, NodeKind> = {
  Action: 'action',
  Condition: 'condition',
  Control: 'control',
  Decorator: 'decorator',
  SubTree: 'subtree',
  SubTreePlus: 'subtree',
};

export const MODEL_WRAPPER_TAGS = ['Action', 'Condition', 'Control', 'Decorator', 'SubTree'];

export const PORT_TAGS: Record<string, PortInfo['direction']> = {
  input_port: 'input',
  output_port: 'output',
  inout_port: 'inout',
};
