import { XMLParser } from 'fast-xml-parser';
import type { BtNode, NodeKind } from './types';
import { EXPLICIT_WRAPPER_TAGS } from './types';
import { inferNodeKind } from './nodeRegistry';

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  commentPropName: '#comment',
  textNodeName: '#text',
  trimValues: true,
});

export type XmlElement = {
  ':@'?: Record<string, string>;
  [key: string]: unknown;
};

export function getTagName(el: XmlElement): string {
  const key = Object.keys(el).find((k) => !k.startsWith(':') && k !== '#text' && k !== '#comment');
  return key ?? '';
}

export function getAttrs(el: XmlElement): Record<string, string> {
  const raw = el[':@'] ?? {};
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    attrs[k.replace(/^@_/, '')] = v;
  }
  return attrs;
}

export function getChildren(el: XmlElement): XmlElement[] {
  const tag = getTagName(el);
  const child = el[tag];
  if (!child) {
    return [];
  }
  return Array.isArray(child) ? (child as XmlElement[]) : [child as XmlElement];
}

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function findRootElements(doc: XmlElement[]): XmlElement | null {
  for (const el of doc) {
    if (getTagName(el) === 'root') {
      return el;
    }
  }
  return null;
}

export function findChildElements(root: XmlElement, tagName: string): XmlElement[] {
  return getChildren(root).filter((c) => getTagName(c) === tagName);
}

export function parseNodeElement(el: XmlElement, path: string): BtNode | null {
  const tag = getTagName(el);
  if (!tag || tag === 'root' || tag === 'BehaviorTree' || tag === 'TreeNodesModel') {
    return null;
  }

  const attrs = getAttrs(el);
  let registeredId = tag;
  let legacyTag: string | undefined;
  let kind: NodeKind = 'unknown';

  if (EXPLICIT_WRAPPER_TAGS.has(tag)) {
    registeredId = attrs.ID ?? tag;
    kind = inferNodeKind(registeredId, tag);
    if (tag === 'SubTree') {
      legacyTag = undefined;
    }
  } else if (tag === 'SubTreePlus') {
    registeredId = 'SubTree';
    legacyTag = 'SubTreePlus';
    kind = 'subtree';
  } else {
    kind = inferNodeKind(registeredId);
  }

  const instanceName = attrs.name;
  const nodeAttrs = { ...attrs };
  delete nodeAttrs.ID;
  delete nodeAttrs.name;

  const childEls = getChildren(el).filter((c) => {
    const t = getTagName(c);
    return t && t !== '#comment';
  });

  const children: BtNode[] = [];
  childEls.forEach((childEl, index) => {
    const childPath = `${path}-${index}`;
    const child = parseNodeElement(childEl, childPath);
    if (child) {
      children.push(child);
    }
  });

  return {
    path,
    kind,
    registeredId,
    instanceName,
    attributes: nodeAttrs,
    children,
    rawTag: tag,
    legacyTag,
  };
}

export function assignPaths(node: BtNode, path = '0'): BtNode {
  node.path = path;
  node.children.forEach((child, i) => assignPaths(child, `${path}-${i}`));
  return node;
}

export function findNodeByPath(root: BtNode | null, path: string): BtNode | null {
  if (!root) {
    return null;
  }
  if (root.path === path) {
    return root;
  }
  for (const child of root.children) {
    const found = findNodeByPath(child, path);
    if (found) {
      return found;
    }
  }
  return null;
}

export function findParentOfPath(root: BtNode, path: string): BtNode | null {
  for (const child of root.children) {
    if (child.path === path) {
      return root;
    }
    const found = findParentOfPath(child, path);
    if (found) {
      return found;
    }
  }
  return null;
}

export function cloneNode(node: BtNode): BtNode {
  return {
    ...node,
    attributes: { ...node.attributes },
    children: node.children.map(cloneNode),
  };
}
