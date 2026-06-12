import { describe, expect, it } from 'vitest';
import { inferNodeKind, buildNodePalette, rawTagForNewNode } from '../../btcpp/nodeRegistry';
import { parseDocument } from '../../btcpp/parser';
import { parseTreeNodesModel } from '../../btcpp/parseModels';
import { xmlParser, findRootElements } from '../../btcpp/xmlUtils';

describe('inferNodeKind with nodeTypeMap', () => {
  it('uses user map before built-in inference', () => {
    const map = { NavigateToGoal: 'action' as const };
    expect(inferNodeKind('NavigateToGoal', undefined, map)).toBe('action');
  });

  it('user map overrides built-in control name', () => {
    const map = { Sequence: 'decorator' as const };
    expect(inferNodeKind('Sequence', undefined, map)).toBe('decorator');
  });

  it('explicit Action wrapper still wins for unmapped IDs', () => {
    expect(inferNodeKind('MyAction', 'Action')).toBe('action');
  });

  it('explicit Control wrapper sets control kind', () => {
    expect(inferNodeKind('CustomControl', 'Control')).toBe('control');
  });
});

describe('buildNodePalette', () => {
  it('includes builtins and custom mapped nodes', () => {
    const palette = buildNodePalette(4, { PickItem: 'action' });
    expect(palette.some((e) => e.id === 'Sequence' && e.kind === 'control')).toBe(true);
    expect(palette.some((e) => e.id === 'PickItem' && e.kind === 'action')).toBe(true);
    expect(palette.some((e) => e.id === 'Script' && e.kind === 'script')).toBe(true);
  });
});

describe('rawTagForNewNode', () => {
  it('uses Action wrapper for actions', () => {
    expect(rawTagForNewNode('action', 'Navigate')).toBe('Action');
  });

  it('uses compact tag for controls', () => {
    expect(rawTagForNewNode('control', 'Sequence')).toBe('Sequence');
  });
});

describe('parseTreeNodesModel explicit wrappers', () => {
  it('infers action kind from Action model element', () => {
    const xml = `<?xml version="1.0"?>
<root>
  <TreeNodesModel>
    <Action ID="MyAction"/>
  </TreeNodesModel>
</root>`;
    const parsed = xmlParser.parse(xml) as import('../../btcpp/xmlUtils').XmlElement[];
    const root = findRootElements(parsed)!;
    const models = parseTreeNodesModel(root);
    expect(models.get('MyAction')?.kind).toBe('action');
  });
});

describe('parseDocument with nodeTypeMap', () => {
  it('classifies compact custom tags via user map', () => {
    const xml = `<?xml version="1.0"?>
<root main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence>
      <NavigateToGoal/>
    </Sequence>
  </BehaviorTree>
</root>`;
    const doc = parseDocument(xml, { nodeTypeMap: { NavigateToGoal: 'action' } });
    const child = doc.trees[0].root?.children[0];
    expect(child?.registeredId).toBe('NavigateToGoal');
    expect(child?.kind).toBe('action');
  });
});
