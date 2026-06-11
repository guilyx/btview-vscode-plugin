import type { NodeKind, NodeModel, PortModel } from './types';

const BUILTIN_CONTROLS_V3 = [
  'Sequence',
  'Fallback',
  'Parallel',
  'ReactiveSequence',
  'ReactiveFallback',
  'SequenceStar',
  'IfThenElse',
  'WhileDoElse',
  'Switch',
];

const BUILTIN_CONTROLS_V4 = [
  ...BUILTIN_CONTROLS_V3.filter((n) => n !== 'SequenceStar'),
  'SequenceWithMemory',
  'AsyncSequence',
  'AsyncFallback',
];

const BUILTIN_DECORATORS = [
  'Inverter',
  'Retry',
  'Repeat',
  'Timeout',
  'ForceSuccess',
  'ForceFailure',
  'Delay',
  'RunOnce',
];

const V3_ONLY = new Set([
  'SetBlackboard',
  'BlackboardCheckInt',
  'BlackboardCheckBool',
  'BlackboardCheckDouble',
  'BlackboardCheckString',
  'SubTreePlus',
]);

const V4_ONLY = new Set(['Script', 'AsyncSequence', 'AsyncFallback']);

export function inferNodeKind(registeredId: string, explicitWrapper?: string): NodeKind {
  if (
    explicitWrapper === 'SubTree' ||
    registeredId === 'SubTree' ||
    registeredId === 'SubTreePlus'
  ) {
    return 'subtree';
  }
  if (registeredId === 'Script') {
    return 'script';
  }
  if (explicitWrapper === 'Action' || explicitWrapper === 'Condition') {
    return explicitWrapper === 'Action' ? 'action' : 'condition';
  }
  if (BUILTIN_CONTROLS_V3.includes(registeredId) || BUILTIN_CONTROLS_V4.includes(registeredId)) {
    return 'control';
  }
  if (BUILTIN_DECORATORS.includes(registeredId)) {
    return 'decorator';
  }
  if (registeredId.startsWith('BlackboardCheck')) {
    return 'decorator';
  }
  return 'unknown';
}

export function isV4OnlyNode(id: string): boolean {
  return V4_ONLY.has(id);
}

export function isV3OnlyNode(id: string): boolean {
  return V3_ONLY.has(id);
}

export function getBuiltinControls(formatVersion: 3 | 4): string[] {
  return formatVersion === 3 ? BUILTIN_CONTROLS_V3 : BUILTIN_CONTROLS_V4;
}

export function getBuiltinDecorators(): string[] {
  return BUILTIN_DECORATORS;
}

export function parsePortElement(el: Record<string, unknown>): PortModel | null {
  const attrs = el as { '@_name'?: string; '@_type'?: string; '@_default'?: string };
  const tag = (el as { '#name'?: string })['#name'];
  if (!attrs['@_name'] || !tag) {
    return null;
  }
  const direction = tag === 'input_port' ? 'input' : tag === 'output_port' ? 'output' : 'inout';
  return {
    name: attrs['@_name'],
    direction,
    type: attrs['@_type'],
    defaultValue: attrs['@_default'],
  };
}

export function mergeModels(
  base: Map<string, NodeModel>,
  extra: Map<string, NodeModel>,
): Map<string, NodeModel> {
  const merged = new Map(base);
  for (const [k, v] of extra) {
    merged.set(k, v);
  }
  return merged;
}
