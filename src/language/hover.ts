import type { BlackboardUsage, BtIndex } from './btIndex';
import { getCursorContext, offsetToPosition, type XmlNode } from './xmlScanner';
import { getCommonAttributes, WRAPPER_TAGS } from './builtinCatalog';
import { escapeMd, kindLabel, nodeMarkdown, portMarkdown } from './markdown';

export interface BtHover {
  markdown: string;
  start: number;
  end: number;
}

const ACCESS_LABEL: Record<BlackboardUsage['access'], string> = {
  read: 'reads',
  write: 'writes',
  readwrite: 'reads/writes',
  remap: 'remaps',
  unknown: 'uses',
};

export function getHover(index: BtIndex, offset: number): BtHover | null {
  const ctx = getCursorContext(index.scan, offset);

  if (ctx.kind === 'elementName' || ctx.kind === 'closeTagName') {
    const el = ctx.element;
    if (!el) {
      return null;
    }
    const range =
      ctx.kind === 'elementName'
        ? { start: el.nameStart, end: el.nameEnd }
        : { start: el.closeNameStart!, end: el.closeNameStart! + el.name.length };
    const md = elementHover(index, el);
    return md ? { markdown: md, ...range } : null;
  }

  if (ctx.kind === 'attributeName') {
    const attr = ctx.attribute;
    if (!attr) {
      return null;
    }
    const md = attributeNameHover(index, ctx.element, attr.name);
    return md ? { markdown: md, start: attr.nameStart, end: attr.nameEnd } : null;
  }

  if (ctx.kind === 'attributeValue') {
    const { element, attribute } = ctx;
    const valueStart = attribute.valueStart!;
    const valueEnd = attribute.valueEnd!;

    const usage = index
      .blackboardUsages()
      .find((u) => u.attribute === attribute && offset >= u.start && offset <= u.end);
    if (usage) {
      return { markdown: blackboardHover(index, usage.key), start: usage.start, end: usage.end };
    }

    const value = attribute.value ?? '';
    const isTreeRef =
      (attribute.name === 'ID' &&
        (element.name === 'SubTree' ||
          element.name === 'SubTreePlus' ||
          element.name === 'BehaviorTree')) ||
      (element === index.root && attribute.name === 'main_tree_to_execute');
    if (isTreeRef && value) {
      return { markdown: treeHover(index, value), start: valueStart, end: valueEnd };
    }
    if (attribute.name === 'ID' && element.name in WRAPPER_TAGS && index.isTreeNode(element)) {
      const def = index.findNodeDefinition(value);
      return def
        ? { markdown: nodeMarkdown(def), start: valueStart, end: valueEnd }
        : {
            markdown: `**${escapeMd(value)}** — not declared in any TreeNodesModel, include, or \`btview.nodeTypeMap\`.`,
            start: valueStart,
            end: valueEnd,
          };
    }
    if (attribute.name === 'ID' && index.isInModels(element)) {
      const def = index.findNodeDefinition(value);
      return def ? { markdown: nodeMarkdown(def), start: valueStart, end: valueEnd } : null;
    }
  }
  return null;
}

function elementHover(index: BtIndex, el: XmlNode): string | null {
  if (index.isTreeNode(el)) {
    if (el.name === 'SubTree' || el.name === 'SubTreePlus') {
      const id = el.attributes.find((a) => a.name === 'ID')?.value;
      return id ? treeHover(index, id) : `**${el.name}** — subtree`;
    }
    const id = index.registeredIdOf(el);
    const def = index.findNodeDefinition(id);
    if (def) {
      return nodeMarkdown(def);
    }
    return `**${escapeMd(id)}** — ${kindLabel(index.kindOf(el))}\n\nNot declared in any TreeNodesModel, include, or \`btview.nodeTypeMap\`.`;
  }
  if (index.isInModels(el) && el.parent?.name === 'TreeNodesModel') {
    const id = el.attributes.find((a) => a.name === 'ID')?.value ?? el.name;
    const def = index.findNodeDefinition(id);
    return def ? nodeMarkdown(def) : null;
  }
  if (el.name === 'BehaviorTree') {
    const id = el.attributes.find((a) => a.name === 'ID')?.value;
    return id ? treeHover(index, id) : null;
  }
  return null;
}

function attributeNameHover(index: BtIndex, el: XmlNode, name: string): string | null {
  if (!index.isTreeNode(el)) {
    return null;
  }
  const nodeId = index.registeredIdOf(el);
  let port = index.portsOf(el).find((p) => p.name === name);
  if (!port && (el.name === 'SubTree' || el.name === 'SubTreePlus')) {
    const subId = el.attributes.find((a) => a.name === 'ID')?.value;
    port = subId ? index.findNodeDefinition(subId)?.ports.find((p) => p.name === name) : undefined;
  }
  if (port) {
    return portMarkdown(nodeId, port);
  }
  const common = getCommonAttributes(index.formatVersion).find((a) => a.name === name);
  if (common) {
    return `**${escapeMd(name)}**\n\n${common.description}`;
  }
  if (name === 'ID') {
    return el.name.startsWith('SubTree')
      ? '**ID** — ID of the `<BehaviorTree>` to instantiate.'
      : '**ID** — registered node ID.';
  }
  const def = index.findNodeDefinition(nodeId);
  if (def && def.source !== 'setting') {
    return `**${escapeMd(name)}** — not a declared port of \`${nodeId}\`.`;
  }
  return null;
}

function treeHover(index: BtIndex, id: string): string {
  const found = index.findTree(id);
  if (!found) {
    return `**${escapeMd(id)}** — BehaviorTree not found in this file or its includes.`;
  }
  const refs = index.scan.elements.filter(
    (el) =>
      (el.name === 'SubTree' || el.name === 'SubTreePlus') &&
      el.attributes.some((a) => a.name === 'ID' && a.value === id),
  ).length;
  const lines = [`**${escapeMd(id)}** — BehaviorTree`, ''];
  if (found.local) {
    const pos = offsetToPosition(index.text, found.local.element.start);
    const nodes = index.treeNodes(found.local).length;
    lines.push(
      `Defined in this file (line ${pos.line + 1}) · ${nodes} node${nodes === 1 ? '' : 's'}`,
    );
  } else if (found.external) {
    const line = (found.external.location.startPos?.line ?? 0) + 1;
    lines.push(`Defined in \`${found.external.sourceLabel}\` (line ${line})`);
  }
  lines.push('', `Referenced by ${refs} SubTree node${refs === 1 ? '' : 's'} in this file.`);
  if (index.mainTreeAttr?.value === id) {
    lines.push('', 'Main tree (`main_tree_to_execute`).');
  }
  return lines.join('\n');
}

function blackboardHover(index: BtIndex, key: string): string {
  const usages = index.blackboardUsages().filter((u) => u.key === key);
  const lines = [`**{${escapeMd(key)}}** — blackboard entry`, ''];
  for (const u of usages) {
    const line = offsetToPosition(index.text, u.start).line + 1;
    const nodeId = index.registeredIdOf(u.element);
    const name = u.element.attributes.find((a) => a.name === 'name')?.value;
    const who = name && name !== nodeId ? `${nodeId} "${name}"` : nodeId;
    lines.push(
      `- line ${line}: \`${who.replace(/`/g, "'")}\` ${ACCESS_LABEL[u.access]} via \`${u.attribute.name}\`${u.treeId ? ` (${escapeMd(u.treeId)})` : ''}`,
    );
  }
  return lines.join('\n');
}
