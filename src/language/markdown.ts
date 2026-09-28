import type { NodeKind } from '../btcpp/types';
import type { PortInfo } from './builtinCatalog';
import type { NodeDefinition } from './btIndex';

export function escapeMd(text: string): string {
  return text.replace(/([\\`*_{}[\]<>|])/g, '\\$1');
}

function cell(text: string | undefined): string {
  return text ? escapeMd(text).replace(/\r?\n/g, ' ') : '';
}

export function kindLabel(kind: NodeKind): string {
  return kind === 'unknown' ? 'unknown kind' : kind;
}

export function sourceText(def: NodeDefinition): string {
  switch (def.source) {
    case 'builtin':
      return 'built-in';
    case 'model':
      return 'TreeNodesModel (this file)';
    case 'include':
      return `TreeNodesModel in \`${def.sourceLabel ?? 'include'}\``;
    case 'workspace':
      return `workspace models \`${def.sourceLabel ?? '.btview/models.xml'}\``;
    case 'setting':
      return '`btview.nodeTypeMap` setting (no ports declared)';
  }
}

export function portsTable(ports: PortInfo[]): string {
  if (ports.length === 0) {
    return '_No ports declared._';
  }
  const rows = ports.map(
    (p) =>
      `| \`${p.name}\` | ${p.direction} | ${cell(p.type)} | ${cell(p.defaultValue)} | ${cell(p.description)} |`,
  );
  return [
    '| Port | Direction | Type | Default | Description |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

export function nodeMarkdown(def: NodeDefinition): string {
  const lines = [
    `**${escapeMd(def.id)}** — ${kindLabel(def.kind)}`,
    '',
    `Source: ${sourceText(def)}`,
  ];
  if (def.description) {
    lines.push('', def.description);
  }
  lines.push('', portsTable(def.ports));
  return lines.join('\n');
}

export function portMarkdown(nodeId: string, port: PortInfo): string {
  const lines = [`**${escapeMd(port.name)}** — ${port.direction} port of \`${nodeId}\``, ''];
  if (port.type) {
    lines.push(`- Type: \`${port.type}\``);
  }
  if (port.defaultValue !== undefined) {
    lines.push(`- Default: \`${port.defaultValue}\``);
  }
  if (port.description) {
    lines.push('', port.description);
  }
  return lines.join('\n');
}
