import type { SerializedDocument } from '../types';

interface ModelPort {
  name: string;
  direction: 'input' | 'output' | 'inout';
  type?: string;
  defaultValue?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kindTag(kind: string): string {
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

export function serializeModelSnippet(
  model: { id: string; kind: string; ports: ModelPort[] },
  indent = '  ',
): string {
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
    lines.push(`${indent}  <${portTag} ${attrs.join(' ')}/>`);
  }
  lines.push(`${indent}</${tag}>`);
  return lines.join('\n');
}

export function formatPortTooltip(
  model: SerializedDocument['models'][number] | undefined,
): string | undefined {
  if (!model?.ports.length) {
    return undefined;
  }
  return model.ports
    .map((p) => {
      const arrow = p.direction === 'output' ? '→' : p.direction === 'inout' ? '↔' : '←';
      const type = p.type ? ` (${p.type})` : '';
      return `${arrow} ${p.name}${type}`;
    })
    .join('\n');
}
