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
  const tag = node.legacyTag ?? serializeNodeId(node.registeredId, 3, node.rawTag);
  const useExplicit =
    node.rawTag && EXPLICIT_WRAPPER_TAGS.has(node.rawTag) && node.rawTag !== 'SubTree';

  let tagName = tag;
  const attrs: string[] = [];

  if (useExplicit) {
    tagName = node.rawTag!;
    attrs.push(`ID="${escapeXml(node.registeredId)}"`);
  } else if (node.rawTag === 'SubTree' || node.kind === 'subtree') {
    tagName = node.legacyTag === 'SubTreePlus' ? 'SubTreePlus' : 'SubTree';
    if (useExplicit || node.rawTag === 'SubTree') {
      tagName = node.legacyTag ?? (node.rawTag === 'SubTree' ? 'SubTree' : tag);
      if (node.rawTag === 'SubTree') {
        tagName = 'SubTree';
        attrs.push(`ID="${escapeXml(node.registeredId)}"`);
      }
    }
  }

  if (node.instanceName) {
    attrs.push(`name="${escapeXml(node.instanceName)}"`);
  }

  for (const [key, value] of Object.entries(node.attributes)) {
    attrs.push(`${key}="${escapeXml(value)}"`);
  }

  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';

  if (node.children.length === 0) {
    return `${indent}<${tagName}${attrStr}/>`;
  }

  const childXml = node.children.map((c) => serializeNode(c, indent + '  ')).join('\n');
  return `${indent}<${tagName}${attrStr}>\n${childXml}\n${indent}</${tagName}>`;
}

function serializeModels(doc: BtDocument, indent: string): string {
  if (doc.models.size === 0) {
    return '';
  }
  const lines: string[] = [`${indent}<TreeNodesModel>`];
  for (const model of doc.models.values()) {
    const ports = model.ports
      .map((p) => {
        const attrs = [`name="${escapeXml(p.name)}"`];
        if (p.type) {
          attrs.push(`type="${escapeXml(p.type)}"`);
        }
        const tag =
          p.direction === 'input'
            ? 'input_port'
            : p.direction === 'output'
              ? 'output_port'
              : 'inout_port';
        return `${indent}    <${tag} ${attrs.join(' ')}/>`;
      })
      .join('\n');
    lines.push(`${indent}  <Action ID="${escapeXml(model.id)}">`);
    if (ports) {
      lines.push(ports);
    }
    lines.push(`${indent}  </Action>`);
  }
  lines.push(`${indent}</TreeNodesModel>`);
  return lines.join('\n');
}

export function serializeV3Document(doc: BtDocument): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];

  const rootAttrs: string[] = [];
  if (doc.mainTreeToExecute) {
    rootAttrs.push(`main_tree_to_execute="${escapeXml(doc.mainTreeToExecute)}"`);
  }
  const rootAttrStr = rootAttrs.length ? ' ' + rootAttrs.join(' ') : '';
  lines.push(`<root${rootAttrStr}>`);

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
