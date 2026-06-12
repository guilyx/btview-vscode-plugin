import { describe, expect, it } from 'vitest';
import { buildNewTreeXml } from '../../btcpp/treeTemplate';
import { parseDocument } from '../../btcpp/parser';

describe('buildNewTreeXml', () => {
  it('creates v4 tree with root control', () => {
    const xml = buildNewTreeXml({
      formatVersion: 4,
      treeId: 'MainTree',
      rootControl: 'Sequence',
    });
    expect(xml).toContain('BTCPP_format="4"');
    expect(xml).toContain('<Sequence/>');
    const doc = parseDocument(xml);
    expect(doc.trees[0]?.root?.registeredId).toBe('Sequence');
  });

  it('creates empty canvas tree without root node', () => {
    const xml = buildNewTreeXml({
      formatVersion: 4,
      treeId: 'MainTree',
      emptyCanvas: true,
    });
    const doc = parseDocument(xml);
    expect(doc.trees[0]?.root).toBeNull();
  });

  it('creates v3 tree', () => {
    const xml = buildNewTreeXml({
      formatVersion: 3,
      treeId: 'MyTree',
      rootControl: 'Fallback',
    });
    expect(xml).not.toContain('BTCPP_format');
    expect(xml).toContain('<Fallback/>');
  });
});
