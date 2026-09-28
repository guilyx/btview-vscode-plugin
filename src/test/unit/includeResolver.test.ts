import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { loadDocumentWithIncludes } from '../../btcpp/includeResolver';
import { localDocument, serializeDocument } from '../../btcpp/serializer';

const fixtures = join(__dirname, '../../../fixtures');

describe('includeResolver', () => {
  it('resolves relative includes', async () => {
    const xml = readFileSync(join(fixtures, 'includes_relative.xml'), 'utf8');
    const doc = await loadDocumentWithIncludes(xml, join(fixtures, 'includes_relative.xml'));
    expect(doc.trees.length).toBeGreaterThanOrEqual(2);
    const ids = doc.trees.map((t) => t.id);
    expect(ids).toContain('MainTree');
    expect(ids).toContain('ChildTree');
    expect(doc.includes[0].resolvedUri).toBeTruthy();
    expect(doc.includes[0].error).toBeUndefined();
  });
});

describe('serializing a document with includes', () => {
  async function loadWithIncludes() {
    const file = join(fixtures, 'includes_relative.xml');
    return loadDocumentWithIncludes(readFileSync(file, 'utf8'), file);
  }

  it('does not copy included trees into the including file', async () => {
    const xml = serializeDocument(await loadWithIncludes());
    expect(xml).toContain('<BehaviorTree ID="MainTree">');
    expect(xml).not.toContain('<BehaviorTree ID="ChildTree">');
    expect(xml).toContain('<include path="./subtrees/child_v4.xml"/>');
  });

  it('does not copy included models, and local models win over included ones', async () => {
    const doc = await loadWithIncludes();
    doc.models.set('Local', { id: 'Local', kind: 'action', ports: [] });
    doc.models.set('Remote', {
      id: 'Remote',
      kind: 'action',
      ports: [],
      sourceUri: '/elsewhere.xml',
    });
    const xml = serializeDocument(doc);
    expect(xml).toContain('ID="Local"');
    expect(xml).not.toContain('ID="Remote"');
  });

  it('keeps trees added in code that carry no source', async () => {
    const doc = await loadWithIncludes();
    doc.trees.push({ id: 'Added', root: null });
    expect(localDocument(doc).trees.map((t) => t.id)).toEqual(['MainTree', 'Added']);
  });
});
