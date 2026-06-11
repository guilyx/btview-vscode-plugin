import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { loadDocumentWithIncludes } from '../../btcpp/includeResolver';

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
