import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parseDocument } from '../../btcpp/parser';
import {
  reparentNode,
  editNodeAttribute,
  addNode,
  changeNodeDefinition,
} from '../../btcpp/editOperations';

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, '../../../fixtures/v4', name), 'utf8');

describe('editOperations', () => {
  it('edits node attribute', () => {
    const doc = parseDocument(fixture('simple_sequence.xml'));
    const treeId = doc.trees[0]!.id;
    const updated = editNodeAttribute(doc, treeId, '0', 'name', 'Renamed');
    const tree = updated.trees.find((t) => t.id === treeId);
    expect(tree?.root?.instanceName).toBe('Renamed');
  });

  it('reparentNode returns error for invalid target', () => {
    const doc = parseDocument(fixture('simple_sequence.xml'));
    const treeId = doc.trees[0]!.id;
    const result = reparentNode(doc, treeId, '0', '0-0');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('addNode creates root on empty tree', () => {
    const xml = `<?xml version="1.0"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree"/>
</root>`;
    const doc = parseDocument(xml);
    const treeId = doc.trees[0]!.id;
    expect(doc.trees[0]?.root).toBeNull();

    const updated = addNode(doc, treeId, '0', 'Sequence', 'control');
    expect(updated.trees[0]?.root?.registeredId).toBe('Sequence');
    expect(updated.trees[0]?.root?.path).toBe('0');
  });

  it('changeNodeDefinition updates kind and registered id', () => {
    const doc = parseDocument(fixture('simple_sequence.xml'));
    const treeId = doc.trees[0]!.id;
    const leafPath = doc.trees[0]!.root!.children[0]!.path;

    const result = changeNodeDefinition(doc, treeId, leafPath, 'action', 'CustomAction');
    expect(result.success).toBe(true);
    const node = result.document.trees[0]?.root?.children[0];
    expect(node?.kind).toBe('action');
    expect(node?.registeredId).toBe('CustomAction');
    expect(node?.rawTag).toBe('Action');
  });

  it('changeNodeDefinition rejects leaf kind with children', () => {
    const doc = parseDocument(fixture('simple_sequence.xml'));
    const treeId = doc.trees[0]!.id;

    const result = changeNodeDefinition(doc, treeId, '0', 'action', 'BadAction');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('cannot have children');
  });
});
