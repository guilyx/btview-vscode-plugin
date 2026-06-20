import type { BtDocument, NodeKind, NodeModel } from './types';
import type { ValidationError } from './validation';

export interface ModelEditResult {
  success: boolean;
  document?: BtDocument;
  error?: ValidationError;
}

const MODEL_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function cloneDocument(doc: BtDocument): BtDocument {
  return {
    ...doc,
    trees: doc.trees.map((t) => ({
      ...t,
      root: t.root ? structuredClone(t.root) : null,
    })),
    models: new Map(doc.models),
    includes: [...doc.includes],
    warnings: [...doc.warnings],
  };
}

export function addNodeModel(doc: BtDocument, id: string, kind: NodeKind): ModelEditResult {
  const trimmed = id.trim();
  if (!trimmed) {
    return { success: false, error: { path: '', message: 'Model ID is required.' } };
  }
  if (!MODEL_ID_PATTERN.test(trimmed)) {
    return {
      success: false,
      error: {
        path: '',
        message: 'Model ID must start with a letter and use only letters, digits, or underscores.',
      },
    };
  }
  if (doc.models.has(trimmed)) {
    return { success: false, error: { path: '', message: `Model "${trimmed}" already exists.` } };
  }

  const updated = cloneDocument(doc);
  updated.models.set(trimmed, { id: trimmed, kind, ports: [] });
  return { success: true, document: updated };
}

export function deleteNodeModel(doc: BtDocument, modelId: string): BtDocument {
  const updated = cloneDocument(doc);
  updated.models.delete(modelId);
  return updated;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kindTag(kind: NodeKind): string {
  if (kind === 'condition') {
    return 'Condition';
  }
  if (kind === 'decorator') {
    return 'Decorator';
  }
  if (kind === 'control') {
    return 'Control';
  }
  if (kind === 'subtree') {
    return 'SubTree';
  }
  return 'Action';
}

/** Serialize a single TreeNodesModel entry for clipboard / docs. */
export function serializeModelSnippet(model: NodeModel, indent = '  '): string {
  const tag = kindTag(model.kind);
  const lines: string[] = [`${indent}<${tag} ID="${escapeXml(model.id)}">`];
  for (const p of model.ports) {
    const portTag =
      p.direction === 'input'
        ? 'input_port'
        : p.direction === 'output'
          ? 'output_port'
          : 'inout_port';
    const attrs = [`name="${escapeXml(p.name)}"`];
    if (p.type) {
      attrs.push(`type="${escapeXml(p.type)}"`);
    }
    if (p.defaultValue) {
      attrs.push(`default="${escapeXml(p.defaultValue)}"`);
    }
    lines.push(`${indent}  <${portTag} ${attrs.join(' ')}/>`);
  }
  lines.push(`${indent}</${tag}>`);
  return lines.join('\n');
}
