import { describe, expect, it } from 'vitest';
import {
  addNodeModel,
  deleteNodeModel,
  serializeModelSnippet,
} from '../../btcpp/modelEditOperations';
import type { BtDocument } from '../../btcpp/types';

const emptyDoc = (): BtDocument => ({
  formatVersion: 4,
  trees: [{ id: 'Main', root: null }],
  models: new Map([
    [
      'SayHello',
      {
        id: 'SayHello',
        kind: 'action',
        ports: [{ name: 'message', direction: 'input', type: 'string' }],
      },
    ],
  ]),
  includes: [],
  warnings: [],
});

describe('addNodeModel', () => {
  it('adds a new empty model', () => {
    const result = addNodeModel(emptyDoc(), 'MyAction', 'action');
    expect(result.success).toBe(true);
    expect(result.document?.models.get('MyAction')?.kind).toBe('action');
  });

  it('rejects duplicate ids', () => {
    const result = addNodeModel(emptyDoc(), 'SayHello', 'action');
    expect(result.success).toBe(false);
  });

  it('rejects invalid ids', () => {
    const result = addNodeModel(emptyDoc(), 'bad-id', 'action');
    expect(result.success).toBe(false);
  });
});

describe('deleteNodeModel', () => {
  it('removes model by id', () => {
    const doc = deleteNodeModel(emptyDoc(), 'SayHello');
    expect(doc.models.has('SayHello')).toBe(false);
  });
});

describe('serializeModelSnippet', () => {
  it('renders ports with direction tags', () => {
    const model = emptyDoc().models.get('SayHello')!;
    const xml = serializeModelSnippet(model);
    expect(xml).toContain('<Action ID="SayHello">');
    expect(xml).toContain('<input_port name="message" type="string"/>');
    expect(xml).toContain('</Action>');
  });
});
