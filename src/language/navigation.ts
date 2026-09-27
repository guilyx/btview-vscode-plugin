import { includeKey, type BtIndex, type SourceLocation } from './btIndex';
import { getCursorContext, type XmlAttribute, type XmlNode } from './xmlScanner';
import { WRAPPER_TAGS } from './builtinCatalog';

/** What a cursor position refers to, for navigation purposes. */
export type BtSymbolRef =
  | { kind: 'tree'; id: string; start: number; end: number }
  | { kind: 'node'; id: string; start: number; end: number }
  | { kind: 'blackboard'; key: string; start: number; end: number }
  | { kind: 'include'; path: string; rosPkg?: string; start: number; end: number };

function isSubTreeTag(el: XmlNode): boolean {
  return el.name === 'SubTree' || el.name === 'SubTreePlus';
}

function valueRange(attr: XmlAttribute): { start: number; end: number } {
  return { start: attr.valueStart!, end: attr.valueEnd! };
}

export function getSymbolRefAt(index: BtIndex, offset: number): BtSymbolRef | null {
  const ctx = getCursorContext(index.scan, offset);

  if (ctx.kind === 'elementName' || ctx.kind === 'closeTagName') {
    const el = ctx.element;
    if (!el) {
      return null;
    }
    const start = ctx.kind === 'elementName' ? el.nameStart : el.closeNameStart!;
    const end = start + el.name.length;
    if (index.isTreeNode(el)) {
      if (isSubTreeTag(el)) {
        const id = el.attributes.find((a) => a.name === 'ID')?.value;
        return id ? { kind: 'tree', id, start, end } : null;
      }
      if (el.name in WRAPPER_TAGS) {
        const id = el.attributes.find((a) => a.name === 'ID')?.value;
        return id ? { kind: 'node', id, start, end } : null;
      }
      return { kind: 'node', id: el.name, start, end };
    }
    return null;
  }

  if (ctx.kind !== 'attributeValue') {
    return null;
  }
  const { element, attribute } = ctx;
  const value = attribute.value ?? '';

  const usage = index
    .blackboardUsages()
    .find((u) => u.attribute === attribute && offset >= u.start && offset <= u.end);
  if (usage) {
    return { kind: 'blackboard', key: usage.key, start: usage.start, end: usage.end };
  }
  if (!value) {
    return null;
  }
  if (element === index.root && attribute.name === 'main_tree_to_execute') {
    return { kind: 'tree', id: value, ...valueRange(attribute) };
  }
  if (element.parent === index.root && element.name === 'BehaviorTree' && attribute.name === 'ID') {
    return { kind: 'tree', id: value, ...valueRange(attribute) };
  }
  if (element.parent === index.root && element.name === 'include' && attribute.name === 'path') {
    const rosPkg = element.attributes.find((a) => a.name === 'ros_pkg')?.value;
    return { kind: 'include', path: value, rosPkg, ...valueRange(attribute) };
  }
  if (attribute.name === 'ID' && index.isTreeNode(element)) {
    if (isSubTreeTag(element)) {
      return { kind: 'tree', id: value, ...valueRange(attribute) };
    }
    if (element.name in WRAPPER_TAGS) {
      return { kind: 'node', id: value, ...valueRange(attribute) };
    }
  }
  if (
    attribute.name === 'ID' &&
    index.isInModels(element) &&
    element.parent?.name === 'TreeNodesModel'
  ) {
    return { kind: 'node', id: value, ...valueRange(attribute) };
  }
  return null;
}

function treeDefinition(index: BtIndex, id: string): SourceLocation[] {
  const found = index.findTree(id);
  if (found?.local) {
    const t = found.local;
    return [
      t.idAttr ? valueRange(t.idAttr) : { start: t.element.nameStart, end: t.element.nameEnd },
    ];
  }
  if (found?.external) {
    return [found.external.location];
  }
  return [];
}

export function getDefinition(index: BtIndex, offset: number): SourceLocation[] {
  const ref = getSymbolRefAt(index, offset);
  if (!ref) {
    return [];
  }
  switch (ref.kind) {
    case 'tree':
      return treeDefinition(index, ref.id);
    case 'node': {
      const def = index.findNodeDefinition(ref.id);
      return def?.location ? [def.location] : [];
    }
    case 'include': {
      const target = index.externals.includeTargets[includeKey(ref.path, ref.rosPkg)];
      return target
        ? [
            {
              uri: target,
              start: 0,
              end: 0,
              startPos: { line: 0, character: 0 },
              endPos: { line: 0, character: 0 },
            },
          ]
        : [];
    }
    case 'blackboard': {
      const usages = index.blackboardUsages().filter((u) => u.key === ref.key);
      const writes = usages.filter((u) => u.access === 'write' || u.access === 'readwrite');
      return (writes.length > 0 ? writes : usages.slice(0, 1)).map((u) => ({
        start: u.start,
        end: u.end,
      }));
    }
  }
}

/** Every `ID` reference to a tree in this document (SubTree nodes and `main_tree_to_execute`). */
export function treeReferences(index: BtIndex, id: string): SourceLocation[] {
  const refs: SourceLocation[] = [];
  const main = index.mainTreeAttr;
  if (main?.value === id && main.valueStart !== undefined) {
    refs.push(valueRange(main));
  }
  for (const el of index.scan.elements) {
    if (isSubTreeTag(el) && index.isTreeNode(el)) {
      const attr = el.attributes.find((a) => a.name === 'ID');
      if (attr?.value === id && attr.valueStart !== undefined) {
        refs.push(valueRange(attr));
      }
    }
  }
  return refs.sort((a, b) => a.start - b.start);
}

export function getReferences(
  index: BtIndex,
  offset: number,
  includeDeclaration: boolean,
): SourceLocation[] {
  const ref = getSymbolRefAt(index, offset);
  if (!ref) {
    return [];
  }
  switch (ref.kind) {
    case 'tree': {
      const refs = treeReferences(index, ref.id);
      if (includeDeclaration) {
        refs.unshift(...treeDefinition(index, ref.id));
      }
      return refs;
    }
    case 'node': {
      const refs: SourceLocation[] = [];
      for (const el of index.treeNodes()) {
        if (isSubTreeTag(el) || index.registeredIdOf(el) !== ref.id) {
          continue;
        }
        const idAttr =
          el.name in WRAPPER_TAGS ? el.attributes.find((a) => a.name === 'ID') : undefined;
        refs.push(idAttr ? valueRange(idAttr) : { start: el.nameStart, end: el.nameEnd });
      }
      if (includeDeclaration) {
        const def = index.findNodeDefinition(ref.id);
        if (def?.location) {
          refs.unshift(def.location);
        }
      }
      return refs;
    }
    case 'blackboard':
      return index
        .blackboardUsages()
        .filter((u) => u.key === ref.key)
        .map((u) => ({ start: u.start, end: u.end }));
    case 'include':
      return [];
  }
}

export interface TextEdit {
  start: number;
  end: number;
  newText: string;
}

export type PrepareRenameResult =
  { start: number; end: number; placeholder: string } | { error: string };

export function prepareRename(index: BtIndex, offset: number): PrepareRenameResult | null {
  const ref = getSymbolRefAt(index, offset);
  if (!ref || ref.kind !== 'tree') {
    return { error: 'Only BehaviorTree IDs can be renamed.' };
  }
  const found = index.findTree(ref.id);
  if (!found?.local) {
    return {
      error: found?.external
        ? `"${ref.id}" is defined in ${found.external.sourceLabel}; rename it there.`
        : `BehaviorTree "${ref.id}" is not defined in this file.`,
    };
  }
  if (ref.start === ref.end || index.text.slice(ref.start, ref.end) !== ref.id) {
    return { error: 'Place the cursor on a BehaviorTree ID value.' };
  }
  return { start: ref.start, end: ref.end, placeholder: ref.id };
}

export function getRenameEdits(
  index: BtIndex,
  offset: number,
  newName: string,
): TextEdit[] | { error: string } {
  const prep = prepareRename(index, offset);
  if (!prep || 'error' in prep) {
    return prep ?? { error: 'Nothing to rename.' };
  }
  if (!/^[^\s"'<>&]+$/.test(newName)) {
    return { error: `"${newName}" is not a valid BehaviorTree ID.` };
  }
  const oldId = prep.placeholder;
  if (newName !== oldId && index.trees.some((t) => t.id === newName)) {
    return { error: `A BehaviorTree with ID "${newName}" already exists.` };
  }
  return getReferences(index, prep.start, true).map((loc) => ({
    start: loc.start,
    end: loc.end,
    newText: newName,
  }));
}
