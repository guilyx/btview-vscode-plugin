import type { NodeKind } from '../btcpp/types';
import type { BtIndex, SourceLocation } from './btIndex';
import type { XmlNode } from './xmlScanner';
import { treeReferences } from './navigation';

export type BtSymbolKind = 'tree' | 'node' | 'models' | 'model' | 'include';

export interface BtDocumentSymbol {
  name: string;
  detail?: string;
  kind: BtSymbolKind;
  nodeKind?: NodeKind;
  start: number;
  end: number;
  selectionStart: number;
  selectionEnd: number;
  children: BtDocumentSymbol[];
}

function attrValue(el: XmlNode, name: string): string | undefined {
  return el.attributes.find((a) => a.name === name)?.value;
}

function nodeSymbol(index: BtIndex, el: XmlNode): BtDocumentSymbol {
  const kind = index.kindOf(el);
  const isSubTree = el.name === 'SubTree' || el.name === 'SubTreePlus';
  const registeredId = isSubTree
    ? `SubTree → ${attrValue(el, 'ID') ?? '?'}`
    : index.registeredIdOf(el);
  const instanceName = attrValue(el, 'name');
  return {
    name: instanceName || registeredId,
    detail: instanceName && instanceName !== registeredId ? `${registeredId} · ${kind}` : kind,
    kind: 'node',
    nodeKind: kind,
    start: el.start,
    end: Math.max(el.end, el.openEnd),
    selectionStart: el.nameStart,
    selectionEnd: el.nameEnd,
    children: el.children.map((c) => nodeSymbol(index, c)),
  };
}

export function getDocumentSymbols(index: BtIndex): BtDocumentSymbol[] {
  const symbols: BtDocumentSymbol[] = [];
  for (const child of index.root?.children ?? []) {
    if (child.name === 'BehaviorTree') {
      const tree = index.trees.find((t) => t.element === child);
      const id = tree?.id || '(missing ID)';
      const sel = tree?.idAttr?.valueStart !== undefined ? tree.idAttr : undefined;
      symbols.push({
        name: id,
        detail: index.mainTreeAttr?.value === id ? 'BehaviorTree · main' : 'BehaviorTree',
        kind: 'tree',
        start: child.start,
        end: Math.max(child.end, child.openEnd),
        selectionStart: sel ? sel.valueStart! : child.nameStart,
        selectionEnd: sel ? sel.valueEnd! : child.nameEnd,
        children: child.children.map((c) => nodeSymbol(index, c)),
      });
    } else if (child.name === 'TreeNodesModel') {
      symbols.push({
        name: 'TreeNodesModel',
        detail: `${child.children.length} model${child.children.length === 1 ? '' : 's'}`,
        kind: 'models',
        start: child.start,
        end: Math.max(child.end, child.openEnd),
        selectionStart: child.nameStart,
        selectionEnd: child.nameEnd,
        children: index.models
          .filter((m) => m.element.parent === child)
          .map((m) => ({
            name: m.id,
            detail: `${m.kind} · ${m.ports.length} port${m.ports.length === 1 ? '' : 's'}`,
            kind: 'model' as const,
            nodeKind: m.kind,
            start: m.element.start,
            end: Math.max(m.element.end, m.element.openEnd),
            selectionStart: m.idAttr?.valueStart ?? m.element.nameStart,
            selectionEnd: m.idAttr?.valueEnd ?? m.element.nameEnd,
            children: [],
          })),
      });
    } else if (child.name === 'include') {
      const pathAttr = child.attributes.find((a) => a.name === 'path');
      const rosPkg = attrValue(child, 'ros_pkg');
      symbols.push({
        name: pathAttr?.value || 'include',
        detail: rosPkg ? `include · ros_pkg ${rosPkg}` : 'include',
        kind: 'include',
        start: child.start,
        end: Math.max(child.end, child.openEnd),
        selectionStart: pathAttr?.valueStart ?? child.nameStart,
        selectionEnd: pathAttr?.valueEnd ?? child.nameEnd,
        children: [],
      });
    }
  }
  return symbols;
}

export interface BtCodeLensInfo {
  treeId: string;
  /** Offset of the `<BehaviorTree` start tag. */
  start: number;
  nodeCount: number;
  isMain: boolean;
  references: SourceLocation[];
}

export function getCodeLensInfo(index: BtIndex): BtCodeLensInfo[] {
  return index.trees
    .filter((t) => t.id)
    .map((t) => ({
      treeId: t.id,
      start: t.element.start,
      nodeCount: index.treeNodes(t).length,
      isMain: index.mainTreeAttr?.value === t.id,
      references: treeReferences(index, t.id).filter(
        (r) => !(index.mainTreeAttr?.valueStart === r.start),
      ),
    }));
}
