import type { BtIndex, NodeDefinition } from './btIndex';
import { getCursorContext, type XmlAttribute, type XmlNode } from './xmlScanner';
import { getCommonAttributes, MODEL_WRAPPER_TAGS, PORT_TAGS, WRAPPER_TAGS } from './builtinCatalog';
import { kindLabel, nodeMarkdown, portMarkdown, sourceText } from './markdown';

export type BtCompletionKind =
  'node' | 'element' | 'attribute' | 'port' | 'value' | 'tree' | 'blackboard' | 'keyword';

export interface BtCompletion {
  label: string;
  kind: BtCompletionKind;
  detail?: string;
  /** Markdown documentation. */
  documentation?: string;
  /** Text to insert (a snippet when `isSnippet`); defaults to `label`. */
  insertText?: string;
  isSnippet?: boolean;
  replaceStart: number;
  replaceEnd: number;
  sortText?: string;
}

const NODE_STATUS_VALUES = ['SUCCESS', 'FAILURE', 'RUNNING', 'SKIPPED', 'IDLE'];

function sortKey(def: NodeDefinition): string {
  const order = { model: 0, include: 1, workspace: 2, setting: 3, builtin: 4 } as const;
  return `${order[def.source]}_${def.id}`;
}

export function getCompletions(index: BtIndex, offset: number): BtCompletion[] {
  const ctx = getCursorContext(index.scan, offset);
  switch (ctx.kind) {
    case 'elementName':
      return elementNameCompletions(
        index,
        ctx.parent,
        ctx.element,
        ctx.replaceStart,
        ctx.replaceEnd,
      );
    case 'attributeName':
      return attributeNameCompletions(
        index,
        ctx.element,
        ctx.attribute,
        ctx.replaceStart,
        ctx.replaceEnd,
      );
    case 'attributeValue':
      return attributeValueCompletions(index, ctx.element, ctx.attribute, offset);
    default:
      return [];
  }
}

function elementNameCompletions(
  index: BtIndex,
  parent: XmlNode | undefined,
  element: XmlNode | undefined,
  replaceStart: number,
  replaceEnd: number,
): BtCompletion[] {
  const range = { replaceStart, replaceEnd };
  const fresh = !element || element.attributes.length === 0;
  const tag = (label: string, snippetAttr?: string, detail?: string): BtCompletion => ({
    label,
    kind: 'element',
    detail,
    insertText: fresh && snippetAttr ? `${label} ${snippetAttr}="$1"` : label,
    isSnippet: fresh && !!snippetAttr,
    ...range,
  });

  if (!parent) {
    return index.root ? [] : [tag('root', index.formatVersion === 4 ? 'BTCPP_format' : undefined)];
  }
  if (parent === index.root) {
    return [
      tag('BehaviorTree', 'ID', 'Behavior tree definition'),
      tag('TreeNodesModel', undefined, 'Custom node declarations'),
      tag('include', 'path', 'Include another BT XML file'),
    ];
  }
  if (parent.name === 'TreeNodesModel' && parent.parent === index.root) {
    return MODEL_WRAPPER_TAGS.map((t) => tag(t, 'ID', `Declare a custom ${t.toLowerCase()}`));
  }
  if (index.isInModels(parent) && parent.parent?.name === 'TreeNodesModel') {
    return [
      ...Object.keys(PORT_TAGS).map((t) => tag(t, 'name', 'Port declaration')),
      tag('description', undefined, 'Node description'),
    ];
  }
  if (parent.name !== 'BehaviorTree' && !index.isTreeNode(parent)) {
    return [];
  }

  const items: BtCompletion[] = [];
  for (const def of index.allNodeDefinitions()) {
    if (def.id === 'SubTreePlus' && index.formatVersion === 4) {
      continue;
    }
    let insertText = def.id;
    let isSnippet = false;
    if (fresh) {
      if (def.id === 'SubTree' || def.id === 'SubTreePlus') {
        insertText = `${def.id} ID="$1"`;
        isSnippet = true;
      } else {
        const required = def.ports.filter(
          (p) =>
            p.direction !== 'output' && p.defaultValue === undefined && !p.name.startsWith('_'),
        );
        if (required.length > 0 && def.source !== 'builtin') {
          insertText = [def.id, ...required.map((p, i) => `${p.name}="$${i + 1}"`)].join(' ');
          isSnippet = true;
        }
      }
    }
    items.push({
      label: def.id,
      kind: 'node',
      detail: `${kindLabel(def.kind)} · ${sourceText(def).replace(/`/g, '')}`,
      documentation: nodeMarkdown(def),
      insertText,
      isSnippet,
      sortText: sortKey(def),
      ...range,
    });
  }
  for (const wrapper of ['Action', 'Condition', 'Control', 'Decorator']) {
    items.push({
      ...tag(wrapper, 'ID', `Explicit ${wrapper.toLowerCase()} wrapper`),
      sortText: `9_${wrapper}`,
    });
  }
  return items;
}

function attributeNameCompletions(
  index: BtIndex,
  element: XmlNode,
  current: XmlAttribute | undefined,
  replaceStart: number,
  replaceEnd: number,
): BtCompletion[] {
  const present = new Set(element.attributes.filter((a) => a !== current).map((a) => a.name));
  const hasValue = current?.value !== undefined;
  const make = (
    name: string,
    kind: BtCompletionKind,
    detail?: string,
    documentation?: string,
    sortText?: string,
  ): BtCompletion => ({
    label: name,
    kind,
    detail,
    documentation,
    insertText: hasValue ? name : `${name}="$1"`,
    isSnippet: !hasValue,
    replaceStart,
    replaceEnd,
    sortText,
  });
  const fixed = (names: Array<[string, string]>): BtCompletion[] =>
    names.filter(([n]) => !present.has(n)).map(([n, d]) => make(n, 'attribute', d));

  if (element === index.root) {
    return fixed([
      ['BTCPP_format', 'BehaviorTree.CPP XML format version'],
      ['main_tree_to_execute', 'ID of the tree to run'],
    ]);
  }
  if (element.parent === index.root) {
    if (element.name === 'BehaviorTree') {
      return fixed([['ID', 'Tree identifier']]);
    }
    if (element.name === 'include') {
      return fixed([
        ['path', 'File path (relative to this file, or to ros_pkg share)'],
        ['ros_pkg', 'ROS package whose share directory contains path'],
      ]);
    }
    return [];
  }
  if (index.isInModels(element)) {
    if (element.name in PORT_TAGS) {
      return fixed([
        ['name', 'Port name'],
        ['type', 'Port type'],
        ['default', 'Default value'],
        ['description', 'Port description'],
      ]);
    }
    if (element.parent?.name === 'TreeNodesModel') {
      return fixed([['ID', 'Registered node ID']]);
    }
    return [];
  }
  if (!index.isTreeNode(element)) {
    return [];
  }

  const items: BtCompletion[] = [];
  if (element.name in WRAPPER_TAGS && !present.has('ID')) {
    items.push(
      make(
        'ID',
        'attribute',
        element.name.startsWith('SubTree') ? 'BehaviorTree to instantiate' : 'Registered node ID',
        undefined,
        '0_ID',
      ),
    );
  }
  const nodeId = index.registeredIdOf(element);
  const ports = [...index.portsOf(element)];
  if (element.name === 'SubTree' || element.name === 'SubTreePlus') {
    const subId = element.attributes.find((a) => a.name === 'ID')?.value;
    const subDef = subId ? index.findNodeDefinition(subId) : undefined;
    for (const p of subDef?.ports ?? []) {
      if (!ports.some((q) => q.name === p.name)) {
        ports.push(p);
      }
    }
  }
  for (const port of ports) {
    if (present.has(port.name)) {
      continue;
    }
    items.push(
      make(
        port.name,
        'port',
        [port.direction, port.type, port.defaultValue !== undefined ? `= ${port.defaultValue}` : '']
          .filter(Boolean)
          .join(' '),
        portMarkdown(nodeId, port),
        `1_${port.name}`,
      ),
    );
  }
  for (const attr of getCommonAttributes(index.formatVersion)) {
    if (!present.has(attr.name)) {
      items.push(make(attr.name, 'attribute', attr.description, undefined, `2_${attr.name}`));
    }
  }
  return items;
}

function attributeValueCompletions(
  index: BtIndex,
  element: XmlNode,
  attr: XmlAttribute,
  offset: number,
): BtCompletion[] {
  const valueStart = attr.valueStart ?? offset;
  const valueEnd = attr.valueEnd ?? offset;
  const whole = { replaceStart: valueStart, replaceEnd: valueEnd };
  const currentTree = index.treeOf(element)?.id;

  const treeItems = (exclude?: string): BtCompletion[] =>
    index
      .allTreeIds()
      .filter((id) => id !== exclude)
      .map((id) => {
        const found = index.findTree(id);
        return {
          label: id,
          kind: 'tree' as const,
          detail: found?.external
            ? `BehaviorTree in ${found.external.sourceLabel}`
            : 'BehaviorTree',
          ...whole,
        };
      });

  if (element === index.root) {
    if (attr.name === 'main_tree_to_execute') {
      return treeItems();
    }
    if (attr.name === 'BTCPP_format') {
      return [{ label: '4', kind: 'keyword', ...whole }];
    }
    return [];
  }

  if (!index.isTreeNode(element)) {
    return [];
  }

  if (attr.name === 'ID' && (element.name === 'SubTree' || element.name === 'SubTreePlus')) {
    return treeItems(currentTree);
  }
  if (attr.name === 'ID' && element.name in WRAPPER_TAGS) {
    const kind = WRAPPER_TAGS[element.name];
    return index
      .allNodeDefinitions()
      .filter((d) => d.source !== 'builtin' && (d.kind === kind || d.kind === 'unknown'))
      .map((d) => ({
        label: d.id,
        kind: 'node' as const,
        detail: `${kindLabel(d.kind)} · ${sourceText(d).replace(/`/g, '')}`,
        documentation: nodeMarkdown(d),
        ...whole,
      }));
  }

  // Blackboard `{key}` suggestions.
  const prefix = attr.value?.slice(0, offset - valueStart) ?? '';
  const open = prefix.lastIndexOf('{');
  const inBraces = open !== -1 && prefix.indexOf('}', open) === -1;
  const items: BtCompletion[] = [];
  if (inBraces || prefix.trim() === '') {
    let replaceStart = valueStart;
    let replaceEnd = valueEnd;
    if (inBraces) {
      replaceStart = valueStart + open;
      const rest = attr.value?.slice(offset - valueStart) ?? '';
      const tokenEnd = rest.match(/^[^{}\s]*\}?/)?.[0].length ?? 0;
      replaceEnd = offset + tokenEnd;
    }
    const usages = index.blackboardUsages();
    for (const key of index.blackboardKeys()) {
      const count = usages.filter((u) => u.key === key).length;
      items.push({
        label: `{${key}}`,
        kind: 'blackboard',
        detail: `blackboard entry · ${count} use${count === 1 ? '' : 's'}`,
        replaceStart,
        replaceEnd,
        sortText: `0_${key}`,
      });
    }
  }

  if (prefix.trim() === '' || !inBraces) {
    const port = [...index.portsOf(element)].find((p) => p.name === attr.name);
    const type = port?.type?.toLowerCase();
    const isBool =
      type === 'bool' ||
      attr.name === '_autoremap' ||
      attr.name === '__autoremap' ||
      attr.name === '__shared_blackboard';
    const values = isBool ? ['true', 'false'] : type === 'nodestatus' ? NODE_STATUS_VALUES : [];
    for (const v of values) {
      items.push({ label: v, kind: 'value', ...whole, sortText: `1_${v}` });
    }
    if (port?.defaultValue !== undefined && !values.includes(port.defaultValue)) {
      items.push({
        label: port.defaultValue,
        kind: 'value',
        detail: 'default value',
        ...whole,
        sortText: `1_${port.defaultValue}`,
      });
    }
  }
  return items;
}
