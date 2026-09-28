import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  BtIndex,
  getCodeLensInfo,
  getCompletions,
  getDefinition,
  getDocumentSymbols,
  getHover,
  getReferences,
  getRenameEdits,
  isBtDocumentText,
  loadExternalDefinitions,
  prepareRename,
  type ExternalDefinitions,
} from '../../language';

const fixtures = join(__dirname, '../../../fixtures');
const read = (rel: string) => readFileSync(join(fixtures, rel), 'utf8');

function at(textWithCursor: string): { text: string; offset: number } {
  const offset = textWithCursor.indexOf('|');
  return { text: textWithCursor.replace('|', ''), offset };
}

function indexAt(textWithCursor: string, externals?: ExternalDefinitions) {
  const { text, offset } = at(textWithCursor);
  return { index: new BtIndex(text, { externals }), offset, text };
}

const labels = (items: Array<{ label: string }>) => items.map((i) => i.label);

const V4_MODELS = `<?xml version="1.0"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence name="root_seq">
      <ComputePath goal="{goal}" path="{path}"/>
      <FollowPath path="{path}"/>
      <SubTree ID="Recovery" target="{goal}"/>
    </Sequence>
  </BehaviorTree>
  <BehaviorTree ID="Recovery">
    <Action ID="Spin" spin_dist="1.57"/>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="ComputePath">
      <input_port name="goal" type="Pose">Goal pose</input_port>
      <output_port name="path" type="Path"/>
      <input_port name="planner_id" default="GridBased"/>
    </Action>
    <Action ID="FollowPath">
      <input_port name="path" type="Path"/>
    </Action>
    <Action ID="Spin">
      <input_port name="spin_dist" type="double" description="Radians to spin"/>
    </Action>
    <Condition ID="IsStuck"/>
  </TreeNodesModel>
</root>
`;

function withCursor(text: string, needle: string, delta = 0): string {
  const i = text.indexOf(needle);
  if (i === -1) {
    throw new Error(`needle not found: ${needle}`);
  }
  return text.slice(0, i + delta) + '|' + text.slice(i + delta);
}

describe('isBtDocumentText', () => {
  it('recognises BT documents and ignores other XML', () => {
    expect(isBtDocumentText(read('v4/simple_sequence.xml'))).toBe(true);
    expect(isBtDocumentText('<root><TreeNodesModel/></root>')).toBe(true);
    expect(isBtDocumentText('<project><dependencies/></project>')).toBe(false);
    expect(isBtDocumentText('<anything/>', '/tmp/x.bt.xml')).toBe(true);
  });
});

describe('BtIndex', () => {
  it('indexes trees, models, includes and version', () => {
    const index = new BtIndex(V4_MODELS);
    expect(index.formatVersion).toBe(4);
    expect(index.trees.map((t) => t.id)).toEqual(['MainTree', 'Recovery']);
    expect(index.models.map((m) => m.id)).toEqual(['ComputePath', 'FollowPath', 'Spin', 'IsStuck']);
    const compute = index.models[0];
    expect(compute.ports[0]).toMatchObject({
      name: 'goal',
      type: 'Pose',
      description: 'Goal pose',
    });
    expect(index.models[2].ports[0].description).toBe('Radians to spin');
    expect(new BtIndex(read('v3/subtree_plus.xml')).formatVersion).toBe(3);
    expect(new BtIndex(read('includes_relative.xml')).includes[0].path).toBe(
      './subtrees/child_v4.xml',
    );
  });

  it('collects blackboard usages with access direction', () => {
    const index = new BtIndex(V4_MODELS);
    const path = index.blackboardUsages().filter((u) => u.key === 'path');
    expect(path.map((u) => u.access)).toEqual(['write', 'read']);
    const goal = index.blackboardUsages().filter((u) => u.key === 'goal');
    expect(goal.map((u) => u.access)).toEqual(['read', 'remap']);
    expect(index.blackboardKeys()).toEqual(['goal', 'path']);
  });
});

describe('completion', () => {
  it('suggests built-in and model nodes inside a BehaviorTree', () => {
    const { index, offset } = indexAt(withCursor(V4_MODELS, '<FollowPath', 1));
    const items = getCompletions(index, offset);
    const names = labels(items);
    expect(names).toEqual(
      expect.arrayContaining(['Sequence', 'Fallback', 'Script', 'ComputePath']),
    );
    expect(names).toContain('SequenceWithMemory');
    expect(names).not.toContain('SequenceStar');
    const compute = items.find((i) => i.label === 'ComputePath')!;
    expect(compute.detail).toContain('action');
    expect(compute.documentation).toContain('| `goal` | input | Pose |');
  });

  it('uses v3 built-ins for v3 files and inserts snippets for fresh tags', () => {
    const { index, offset } = indexAt(
      '<root main_tree_to_execute="M"><BehaviorTree ID="M"><Sequence>\n<|\n</Sequence></BehaviorTree></root>',
    );
    const items = getCompletions(index, offset);
    expect(labels(items)).toContain('SequenceStar');
    expect(labels(items)).toContain('SubTreePlus');
    expect(labels(items)).not.toContain('Script');
    const sub = items.find((i) => i.label === 'SubTree')!;
    expect(sub.isSnippet).toBe(true);
    expect(sub.insertText).toBe('SubTree ID="$1"');
  });

  it('suggests root children and model wrappers', () => {
    const root = indexAt('<root BTCPP_format="4">\n<|\n</root>');
    expect(labels(getCompletions(root.index, root.offset))).toEqual([
      'BehaviorTree',
      'TreeNodesModel',
      'include',
    ]);
    const models = indexAt('<root BTCPP_format="4"><TreeNodesModel><|</TreeNodesModel></root>');
    expect(labels(getCompletions(models.index, models.offset))).toContain('Condition');
    const ports = indexAt(
      '<root BTCPP_format="4"><TreeNodesModel><Action ID="A"><in|</Action></TreeNodesModel></root>',
    );
    expect(labels(getCompletions(ports.index, ports.offset))).toContain('input_port');
  });

  it('suggests ports and common attributes as attribute names', () => {
    const text = V4_MODELS.replace('path="{path}"/>', 'path="{path}" />');
    const { index, offset } = indexAt(withCursor(text, ' />', 1));
    const items = getCompletions(index, offset);
    const names = labels(items);
    expect(names).toContain('planner_id');
    expect(names).not.toContain('goal'); // already present
    expect(names).toEqual(expect.arrayContaining(['name', '_skipIf', '_onHalted']));
    const planner = items.find((i) => i.label === 'planner_id')!;
    expect(planner.detail).toBe('input = GridBased');
    expect(planner.insertText).toBe('planner_id="$1"');
  });

  it('suggests built-in ports (v3 has no script directives)', () => {
    const { index, offset } = indexAt(
      '<root><BehaviorTree ID="M"><Retry |><A/></Retry></BehaviorTree></root>',
    );
    const names = labels(getCompletions(index, offset));
    expect(names).toContain('num_attempts');
    expect(names).toContain('name');
    expect(names).not.toContain('_skipIf');
  });

  it('suggests SubTree IDs, main_tree_to_execute and wrapper IDs', () => {
    const sub = indexAt(withCursor(V4_MODELS, 'Recovery" target', 0));
    const subItems = getCompletions(sub.index, sub.offset);
    expect(labels(subItems)).toEqual(['Recovery']); // excludes the enclosing tree
    expect(subItems[0].replaceEnd - subItems[0].replaceStart).toBe('Recovery'.length);

    const main = indexAt(withCursor(V4_MODELS, 'MainTree">', 0));
    expect(labels(getCompletions(main.index, main.offset))).toEqual(['MainTree', 'Recovery']);

    const wrapper = indexAt(withCursor(V4_MODELS, 'Spin" spin_dist', 0));
    const wrapperNames = labels(getCompletions(wrapper.index, wrapper.offset));
    expect(wrapperNames).toContain('Spin');
    expect(wrapperNames).not.toContain('IsStuck'); // condition, not action
  });

  it('suggests blackboard keys inside braces and bool values', () => {
    const text = V4_MODELS.replace('<FollowPath path="{path}"/>', '<FollowPath path="{pa}"/>');
    const { index, offset } = indexAt(withCursor(text, 'pa}"', 2));
    const items = getCompletions(index, offset);
    expect(labels(items)).toEqual(expect.arrayContaining(['{goal}', '{path}']));
    const pathItem = items.find((i) => i.label === '{path}')!;
    expect(text.slice(pathItem.replaceStart, pathItem.replaceEnd)).toBe('{pa}');

    const bool = indexAt(
      '<root BTCPP_format="4"><BehaviorTree ID="M"><SubTree ID="X" _autoremap="|"/></BehaviorTree></root>',
    );
    expect(labels(getCompletions(bool.index, bool.offset))).toEqual(
      expect.arrayContaining(['true', 'false']),
    );
  });

  it('includes models from externals and the nodeTypeMap', async () => {
    const includes = read('includes_relative.xml');
    const externals = await loadExternalDefinitions(
      includes,
      join(fixtures, 'includes_relative.xml'),
      {
        nodeTypeMap: { MyMapped: 'condition' },
        workspaceModelsPath: join(fixtures, 'nav2/navigate_w_replanning_and_recovery.xml'),
      },
    );
    expect(externals.includeTrees.map((t) => t.id)).toEqual(['ChildTree']);
    expect(externals.workspaceModels.map((m) => m.id)).toContain('ComputePathToPose');
    const { index, offset } = indexAt(withCursor(includes, '<SubTree', 1), externals);
    const items = getCompletions(index, offset);
    expect(labels(items)).toEqual(expect.arrayContaining(['MyMapped', 'ComputePathToPose']));
    const ws = items.find((i) => i.label === 'ComputePathToPose')!;
    expect(ws.detail).toContain('workspace');

    const sub = indexAt(withCursor(includes, 'ChildTree"', 0), externals);
    const subItems = getCompletions(sub.index, sub.offset);
    expect(labels(subItems)).toEqual(['ChildTree']);
    expect(subItems[0].detail).toContain('subtrees/child_v4.xml');
  });

  it('returns nothing in comments or plain text', () => {
    const { index, offset } = indexAt('<root><!-- <Seq| --></root>');
    expect(getCompletions(index, offset)).toEqual([]);
  });
});

describe('hover', () => {
  it('shows node kind, source and ports on element names', () => {
    const { index, offset } = indexAt(withCursor(V4_MODELS, 'ComputePath goal', 3));
    const hover = getHover(index, offset)!;
    expect(hover.markdown).toContain('**ComputePath** — action');
    expect(hover.markdown).toContain('TreeNodesModel (this file)');
    expect(hover.markdown).toContain('| `planner_id` | input |  | GridBased |');
  });

  it('describes built-ins', () => {
    const { index, offset } = indexAt(withCursor(V4_MODELS, 'Sequence name', 2));
    const hover = getHover(index, offset)!;
    expect(hover.markdown).toContain('**Sequence** — control');
    expect(hover.markdown).toContain('built-in');
  });

  it('shows port details on attribute names', () => {
    const { index, offset } = indexAt(withCursor(V4_MODELS, 'goal="{goal}" path', 1));
    const hover = getHover(index, offset)!;
    expect(hover.markdown).toContain('input port of `ComputePath`');
    expect(hover.markdown).toContain('Type: `Pose`');
    expect(hover.markdown).toContain('Goal pose');
  });

  it('lists blackboard usages', () => {
    const { index, offset } = indexAt(withCursor(V4_MODELS, '{path}"/>', 2));
    const hover = getHover(index, offset)!;
    expect(hover.markdown).toContain('blackboard entry');
    expect(hover.markdown).toContain('`ComputePath` writes via `path`');
    expect(hover.markdown).toContain('`FollowPath` reads via `path`');
  });

  it('describes SubTree references and wrapper IDs', () => {
    const sub = indexAt(withCursor(V4_MODELS, 'Recovery" target', 2));
    const hover = getHover(sub.index, sub.offset)!;
    expect(hover.markdown).toContain('**Recovery** — BehaviorTree');
    expect(hover.markdown).toContain('Referenced by 1 SubTree node');

    const spin = indexAt(withCursor(V4_MODELS, 'Spin" spin_dist', 1));
    expect(getHover(spin.index, spin.offset)!.markdown).toContain('Radians to spin');
  });

  it('flags undeclared nodes', () => {
    const { index, offset } = indexAt(
      '<root BTCPP_format="4"><BehaviorTree ID="M"><Myst|ery/></BehaviorTree></root>',
    );
    expect(getHover(index, offset)!.markdown).toContain('Not declared');
  });
});

describe('definition and references', () => {
  it('jumps from SubTree ID to the BehaviorTree', () => {
    const { index, offset, text } = indexAt(withCursor(V4_MODELS, 'Recovery" target', 2));
    const [loc] = getDefinition(index, offset);
    expect(loc.uri).toBeUndefined();
    expect(text.slice(loc.start, loc.end)).toBe('Recovery');
    expect(loc.start).toBe(text.indexOf('<BehaviorTree ID="Recovery"') + 18);
  });

  it('jumps from a custom node to its TreeNodesModel entry', () => {
    const { index, offset, text } = indexAt(withCursor(V4_MODELS, '<FollowPath', 3));
    const [loc] = getDefinition(index, offset);
    expect(text.slice(loc.start, loc.end)).toBe('FollowPath');
    expect(loc.start).toBe(text.indexOf('ID="FollowPath"') + 4);
  });

  it('jumps to included trees, models and include files', async () => {
    const includes = read('includes_relative.xml');
    const file = join(fixtures, 'includes_relative.xml');
    const externals = await loadExternalDefinitions(includes, file);

    const sub = indexAt(withCursor(includes, 'ChildTree"', 1), externals);
    const [treeLoc] = getDefinition(sub.index, sub.offset);
    expect(treeLoc.uri).toBe(join(fixtures, 'subtrees/child_v4.xml'));
    expect(treeLoc.startPos).toEqual({ line: 2, character: 20 });

    const incl = indexAt(withCursor(includes, './subtrees', 2), externals);
    const [fileLoc] = getDefinition(incl.index, incl.offset);
    expect(fileLoc.uri).toBe(join(fixtures, 'subtrees/child_v4.xml'));
  });

  it('finds tree references including main_tree_to_execute', () => {
    const { index, offset, text } = indexAt(withCursor(V4_MODELS, 'MainTree">', 2));
    const refs = getReferences(index, offset, true);
    expect(refs.map((r) => text.slice(r.start, r.end))).toEqual(['MainTree', 'MainTree']);

    const rec = indexAt(withCursor(V4_MODELS, 'Recovery">', 2));
    expect(getReferences(rec.index, rec.offset, false)).toHaveLength(1);
    expect(getReferences(rec.index, rec.offset, true)).toHaveLength(2);
  });

  it('finds node and blackboard references', () => {
    const { index, offset } = indexAt(withCursor(V4_MODELS, 'ID="Spin">', 5));
    expect(getReferences(index, offset, true)).toHaveLength(2);
    const bb = indexAt(withCursor(V4_MODELS, '{goal}"', 2));
    expect(getReferences(bb.index, bb.offset, true)).toHaveLength(2);
  });
});

describe('rename', () => {
  it('renames a BehaviorTree with its SubTree and main_tree_to_execute references', () => {
    const text = read('v3/subtree_plus.xml');
    const { index, offset } = indexAt(withCursor(text, 'GraspObject">', 1));
    const prep = prepareRename(index, offset);
    expect(prep).toMatchObject({ placeholder: 'GraspObject' });
    const edits = getRenameEdits(index, offset, 'Grasp');
    expect(Array.isArray(edits)).toBe(true);
    expect((edits as unknown[]).length).toBe(2);

    const main = indexAt(withCursor(text, 'MainTree">', 1));
    expect(getRenameEdits(main.index, main.offset, 'Root')).toHaveLength(2);
  });

  it('rejects invalid renames', () => {
    const text = read('v3/subtree_plus.xml');
    const { index, offset } = indexAt(withCursor(text, 'GraspObject">', 1));
    expect(getRenameEdits(index, offset, 'MainTree')).toMatchObject({ error: expect.any(String) });
    expect(getRenameEdits(index, offset, 'has space')).toMatchObject({ error: expect.any(String) });
    const node = indexAt(withCursor(text, 'SaySomething', 1));
    expect(prepareRename(node.index, node.offset)).toMatchObject({ error: expect.any(String) });
  });
});

describe('document symbols and code lenses', () => {
  it('builds an outline of trees, nested nodes, includes and models', () => {
    const symbols = getDocumentSymbols(new BtIndex(V4_MODELS));
    expect(symbols.map((s) => `${s.kind}:${s.name}`)).toEqual([
      'tree:MainTree',
      'tree:Recovery',
      'models:TreeNodesModel',
    ]);
    const main = symbols[0];
    expect(main.detail).toBe('BehaviorTree · main');
    const seq = main.children[0];
    expect(seq.name).toBe('root_seq');
    expect(seq.detail).toBe('Sequence · control');
    expect(seq.children.map((c) => c.name)).toEqual([
      'ComputePath',
      'FollowPath',
      'SubTree → Recovery',
    ]);
    expect(symbols[2].children.map((c) => c.name)).toEqual([
      'ComputePath',
      'FollowPath',
      'Spin',
      'IsStuck',
    ]);

    const incl = getDocumentSymbols(new BtIndex(read('includes_relative.xml')));
    expect(incl[0]).toMatchObject({ kind: 'include', name: './subtrees/child_v4.xml' });
  });

  it('handles the nav2 fixture', () => {
    const index = new BtIndex(read('nav2/navigate_w_replanning_and_recovery.xml'));
    const [main] = getDocumentSymbols(index);
    expect(main.name).toBe('MainTree');
    expect(main.children[0].name).toBe('NavigateRecovery');
    const lens = getCodeLensInfo(index);
    expect(lens[0]).toMatchObject({ treeId: 'MainTree', isMain: true });
    expect(lens[0].nodeCount).toBeGreaterThan(10);
  });

  it('computes code lens info per tree', () => {
    const lenses = getCodeLensInfo(new BtIndex(V4_MODELS));
    expect(lenses.map((l) => [l.treeId, l.nodeCount, l.references.length, l.isMain])).toEqual([
      ['MainTree', 4, 0, true],
      ['Recovery', 1, 1, false],
    ]);
  });
});
