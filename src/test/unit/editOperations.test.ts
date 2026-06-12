import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { parseDocument } from '../../btcpp/parser';
import { reparentNode, editNodeAttribute } from '../../btcpp/editOperations';

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
});
