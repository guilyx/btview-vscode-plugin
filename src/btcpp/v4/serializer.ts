import type { BtDocument, BtNode } from '../types';
import { serializeNodeId } from '../nodeAliases';
import { EXPLICIT_WRAPPER_TAGS } from '../types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeNode(node: BtNode, indent: string): string {
  const tag =
    node.rawTag && EXPLICIT_WRAPPER_TAGS.has(node.rawTag)
      ? node.rawTag
      : serializeNodeId(node.registeredId, 4, node.legacyTag);

  const attrs: string[] = [];

  if (EXPLICIT_WRAPPER_TAGS.has(tag) || tag === 'SubTree') {
    attrs.push(`ID="${escapeXml(node.registeredId)}"`);
  }

  if (node.instanceName) {
    attrs.push(`name="${escapeXml(node.instanceName)}"`);
  }

  for (const [key, value] of Object.entries(node.attributes)) {
    attrs.push(`${key}="${escapeXml(value)}"`);
  }

  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';

  if (node.children.length === 0) {
    return `${indent}<${tag}${attrStr}/>`;
  }

  const childXml = node.children.map((c) => serializeNode(c, indent + '  ')).join('\n');
  return `${indent}<${tag}${attrStr}>\n${childXml}\n${indent}</${tag}>`;
}

function serializeModels(doc: BtDocument, indent: string): string {
  if (doc.models.size === 0) {
    return '';
  }
  const lines: string[] = [`${indent}<TreeNodesModel>`];
  for (const model of doc.models.values()) {
    const kindTag =
      model.kind === 'condition'
        ? 'Condition'
        : model.kind === 'decorator'
          ? 'Decorator'
          : model.kind === 'control'
            ? 'Control'
            : model.kind === 'subtree'
              ? 'SubTree'
              : 'Action';
    lines.push(`${indent}  <${kindTag} ID="${escapeXml(model.id)}">`);
    for (const p of model.ports) {
      const tag =
        p.direction === 'input'
          ? 'input_port'
          : p.direction === 'output'
            ? 'output_port'
            : 'inout_port';
      const pAttrs = [`name="${escapeXml(p.name)}"`];
      if (p.type) {
        pAttrs.push(`type="${escapeXml(p.type)}"`);
      }
      lines.push(`${indent}    <${tag} ${pAttrs.join(' ')}/>`);
    }
    lines.push(`${indent}  </${kindTag}>`);
  }
  lines.push(`${indent}</TreeNodesModel>`);
  return lines.join('\n');
}

export function serializeV4Document(doc: BtDocument): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];

  const rootAttrs: string[] = ['BTCPP_format="4"'];
  if (doc.mainTreeToExecute) {
    rootAttrs.push(`main_tree_to_execute="${escapeXml(doc.mainTreeToExecute)}"`);
  }
  lines.push(`<root ${rootAttrs.join(' ')}>`);

  for (const incl of doc.includes) {
    if (incl.rosPkg) {
      lines.push(`  <include ros_pkg="${escapeXml(incl.rosPkg)}" path="${escapeXml(incl.path)}"/>`);
    } else {
      lines.push(`  <include path="${escapeXml(incl.path)}"/>`);
    }
  }

  for (const tree of doc.trees) {
    lines.push(`  <BehaviorTree ID="${escapeXml(tree.id)}">`);
    if (tree.root) {
      lines.push(serializeNode(tree.root, '    '));
    }
    lines.push('  </BehaviorTree>');
  }

  const modelsXml = serializeModels(doc, '  ');
  if (modelsXml) {
    lines.push(modelsXml);
  }

  lines.push('</root>');
  return lines.join('\n');
}
