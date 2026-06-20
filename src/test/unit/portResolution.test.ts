import { describe, it, expect } from 'vitest';
import { resolveNodePorts, collectNodeTypeMap } from '../../btcpp/portResolution';
import type { BtDocument, NodeModel } from '../../btcpp/types';

describe('resolveNodePorts', () => {
  const models = new Map<string, NodeModel>([
    [
      'NavigateToGoal',
      {
        id: 'NavigateToGoal',
        kind: 'action',
        ports: [
          { name: 'goal', direction: 'input', type: 'PoseStamped' },
          { name: 'result', direction: 'output', type: 'bool' },
        ],
      },
    ],
  ]);

  it('joins model ports with instance attributes', () => {
    const resolved = resolveNodePorts(
      { registeredId: 'NavigateToGoal', attributes: { goal: '{x: 1}' } },
      models,
    );
    expect(resolved.inputs).toHaveLength(1);
    expect(resolved.inputs[0].value).toBe('{x: 1}');
    expect(resolved.outputs).toHaveLength(1);
    expect(resolved.outputs[0].value).toBeUndefined();
  });

  it('puts unknown attrs in custom', () => {
    const resolved = resolveNodePorts(
      { registeredId: 'NavigateToGoal', attributes: { extra: '1' } },
      models,
    );
    expect(resolved.custom).toHaveLength(1);
    expect(resolved.custom[0].name).toBe('extra');
  });
});

describe('collectNodeTypeMap', () => {
  it('collects from models and tree nodes', () => {
    const doc: BtDocument = {
      formatVersion: 4,
      trees: [
        {
          id: 'Main',
          root: {
            path: '0',
            kind: 'control',
            registeredId: 'Sequence',
            attributes: {},
            children: [
              {
                path: '0-0',
                kind: 'action',
                registeredId: 'MyAction',
                attributes: {},
                children: [],
              },
            ],
          },
        },
      ],
      models: new Map([['MyAction', { id: 'MyAction', kind: 'action', ports: [] }]]),
      includes: [],
      warnings: [],
    };
    const map = collectNodeTypeMap(doc);
    expect(map.Sequence).toBe('control');
    expect(map.MyAction).toBe('action');
  });
});
