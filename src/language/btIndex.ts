import type { FormatVersion, NodeKind } from '../btcpp/types';
import { inferNodeKind } from '../btcpp/nodeRegistry';
import {
  getAttribute,
  getAttributeValue,
  getTextContent,
  offsetToPosition,
  scanXml,
  type XmlAttribute,
  type XmlNode,
  type XmlScanResult,
} from './xmlScanner';
import {
  getBuiltinNodes,
  MODEL_WRAPPER_TAGS,
  PORT_TAGS,
  WRAPPER_TAGS,
  type PortInfo,
} from './builtinCatalog';

/** A location in the current document (`uri` undefined) or in another file. */
export interface SourceLocation {
  uri?: string;
  start: number;
  end: number;
  /** Zero-based line/character positions; always set for other files. */
  startPos?: { line: number; character: number };
  endPos?: { line: number; character: number };
}

export interface TreeEntry {
  id: string;
  element: XmlNode;
  idAttr?: XmlAttribute;
}

export interface ModelPort extends PortInfo {
  element: XmlNode;
}

export interface ModelEntry {
  id: string;
  kind: NodeKind;
  element: XmlNode;
  idAttr?: XmlAttribute;
  ports: ModelPort[];
  description?: string;
}

export interface IncludeEntry {
  element: XmlNode;
  pathAttr?: XmlAttribute;
  path?: string;
  rosPkg?: string;
}

export type NodeSource = 'builtin' | 'model' | 'include' | 'workspace' | 'setting';

export interface NodeDefinition {
  id: string;
  kind: NodeKind;
  ports: PortInfo[];
  description?: string;
  source: NodeSource;
  /** Human-readable source, e.g. an include path. */
  sourceLabel?: string;
  location?: SourceLocation;
}

export interface ExternalTree {
  id: string;
  sourceLabel: string;
  location: SourceLocation;
}

/** Definitions that live outside the current document (resolved by the host). */
export interface ExternalDefinitions {
  /** Models from included files, in include order. */
  includeModels: NodeDefinition[];
  /** Models from the workspace models file (`btview.customModelsInclude`). */
  workspaceModels: NodeDefinition[];
  /** Trees defined in included files. */
  includeTrees: ExternalTree[];
  /** Include key (see {@link includeKey}) → resolved absolute path. */
  includeTargets: Record<string, string>;
  nodeTypeMap: Record<string, NodeKind>;
}

export const EMPTY_EXTERNALS: ExternalDefinitions = {
  includeModels: [],
  workspaceModels: [],
  includeTrees: [],
  includeTargets: {},
  nodeTypeMap: {},
};

export function includeKey(path: string, rosPkg?: string): string {
  return `${rosPkg ?? ''}|${path}`;
}

export type BlackboardAccess = 'read' | 'write' | 'readwrite' | 'remap' | 'unknown';

export interface BlackboardUsage {
  key: string;
  element: XmlNode;
  attribute: XmlAttribute;
  /** Offsets of the `{key}` token, braces included. */
  start: number;
  end: number;
  access: BlackboardAccess;
  treeId?: string;
}

export interface IndexOptions {
  /** `btview.defaultFormatVersion` — used when `BTCPP_format` is absent. */
  defaultFormatVersion?: 'auto' | '3' | '4';
  fileName?: string;
  externals?: ExternalDefinitions;
}

/** Heuristic used to decide whether a text XML document should get BT language features. */
export function isBtDocumentText(text: string, fileName?: string): boolean {
  if (fileName && /\.bt\.xml$/i.test(fileName)) {
    return true;
  }
  return /<root\b/.test(text) && (/<BehaviorTree\b/.test(text) || /<TreeNodesModel\b/.test(text));
}

export class BtIndex {
  readonly scan: XmlScanResult;
  readonly root?: XmlNode;
  readonly formatVersion: FormatVersion;
  readonly trees: TreeEntry[] = [];
  readonly models: ModelEntry[] = [];
  readonly includes: IncludeEntry[] = [];
  readonly modelsSections: XmlNode[] = [];
  readonly externals: ExternalDefinitions;
  private blackboardCache?: BlackboardUsage[];
  private definitionCache?: Map<string, NodeDefinition>;
  private readonly treeByElement = new Map<XmlNode, TreeEntry>();

  constructor(
    readonly text: string,
    options: IndexOptions = {},
  ) {
    this.scan = scanXml(text);
    this.externals = options.externals ?? EMPTY_EXTERNALS;
    this.root = this.scan.roots.find((r) => r.name === 'root');
    this.formatVersion = detectVersion(this.root, options.defaultFormatVersion);

    for (const child of this.root?.children ?? []) {
      if (child.name === 'BehaviorTree') {
        const idAttr = getAttribute(child, 'ID');
        const entry: TreeEntry = { id: idAttr?.value ?? '', element: child, idAttr };
        this.trees.push(entry);
        this.treeByElement.set(child, entry);
      } else if (child.name === 'TreeNodesModel') {
        this.modelsSections.push(child);
        for (const modelEl of child.children) {
          const model = parseModelEntry(this.scan, modelEl, this.externals.nodeTypeMap);
          if (model) {
            this.models.push(model);
          }
        }
      } else if (child.name === 'include') {
        const pathAttr = getAttribute(child, 'path');
        this.includes.push({
          element: child,
          pathAttr,
          path: pathAttr?.value,
          rosPkg: getAttributeValue(child, 'ros_pkg'),
        });
      }
    }
  }

  get mainTreeAttr(): XmlAttribute | undefined {
    return this.root ? getAttribute(this.root, 'main_tree_to_execute') : undefined;
  }

  /** The `<BehaviorTree>` entry that contains the element (or is the element). */
  treeOf(el: XmlNode | undefined): TreeEntry | undefined {
    let cur = el;
    while (cur) {
      const tree = this.treeByElement.get(cur);
      if (tree) {
        return tree;
      }
      cur = cur.parent;
    }
    return undefined;
  }

  /** True if the element is a tree node (a descendant of a `<BehaviorTree>`). */
  isTreeNode(el: XmlNode): boolean {
    return el.name !== 'BehaviorTree' && this.treeOf(el) !== undefined;
  }

  isInModels(el: XmlNode | undefined): boolean {
    let cur = el;
    while (cur) {
      if (cur.name === 'TreeNodesModel' && cur.parent === this.root) {
        return true;
      }
      cur = cur.parent;
    }
    return false;
  }

  /** Registered node ID for a tree-node element (`<Action ID="X">` → X, `<X/>` → X). */
  registeredIdOf(el: XmlNode): string {
    if (el.name in WRAPPER_TAGS) {
      if (el.name === 'SubTree' || el.name === 'SubTreePlus') {
        return el.name;
      }
      return getAttributeValue(el, 'ID') ?? el.name;
    }
    return el.name;
  }

  /** All trees visible from this document: local first, then includes. */
  allTreeIds(): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const t of this.trees) {
      if (t.id && !seen.has(t.id)) {
        seen.add(t.id);
        ids.push(t.id);
      }
    }
    for (const t of this.externals.includeTrees) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        ids.push(t.id);
      }
    }
    return ids;
  }

  findTree(id: string): { local?: TreeEntry; external?: ExternalTree } | undefined {
    const local = this.trees.find((t) => t.id === id);
    if (local) {
      return { local };
    }
    const external = this.externals.includeTrees.find((t) => t.id === id);
    return external ? { external } : undefined;
  }

  /** Every node definition visible from this document, highest priority first per ID. */
  allNodeDefinitions(): NodeDefinition[] {
    return [...this.definitionMap().values()];
  }

  private definitionMap(): Map<string, NodeDefinition> {
    if (this.definitionCache) {
      return this.definitionCache;
    }
    const out = new Map<string, NodeDefinition>();
    const add = (def: NodeDefinition) => {
      if (!out.has(def.id)) {
        out.set(def.id, def);
      }
    };
    for (const m of this.models) {
      add(this.localModelDefinition(m));
    }
    this.externals.includeModels.forEach(add);
    this.externals.workspaceModels.forEach(add);
    for (const b of getBuiltinNodes(this.formatVersion)) {
      add({
        id: b.id,
        kind: b.kind,
        ports: b.ports,
        description: b.description,
        source: 'builtin',
      });
    }
    for (const [id, kind] of Object.entries(this.externals.nodeTypeMap)) {
      add({ id, kind, ports: [], source: 'setting', sourceLabel: 'btview.nodeTypeMap' });
    }
    this.definitionCache = out;
    return out;
  }

  findNodeDefinition(id: string): NodeDefinition | undefined {
    return this.definitionMap().get(id);
  }

  localModelDefinition(m: ModelEntry): NodeDefinition {
    const target = m.idAttr ?? { valueStart: m.element.nameStart, valueEnd: m.element.nameEnd };
    return {
      id: m.id,
      kind: m.kind,
      ports: m.ports.map((p) => ({
        name: p.name,
        direction: p.direction,
        type: p.type,
        defaultValue: p.defaultValue,
        description: p.description,
      })),
      description: m.description,
      source: 'model',
      sourceLabel: 'TreeNodesModel',
      location: {
        start: target.valueStart ?? m.element.start,
        end: target.valueEnd ?? m.element.end,
      },
    };
  }

  /** Kind of a tree-node element, using definitions and `btview.nodeTypeMap`. */
  kindOf(el: XmlNode): NodeKind {
    if (el.name === 'SubTree' || el.name === 'SubTreePlus') {
      return 'subtree';
    }
    const id = this.registeredIdOf(el);
    const def = this.findNodeDefinition(id);
    if (def && def.kind !== 'unknown') {
      return def.kind;
    }
    const wrapper = el.name in WRAPPER_TAGS ? el.name : undefined;
    return inferNodeKind(id, wrapper, this.externals.nodeTypeMap);
  }

  /** Ports declared for a tree-node element, if its definition is known. */
  portsOf(el: XmlNode): PortInfo[] {
    return this.findNodeDefinition(this.registeredIdOf(el))?.ports ?? [];
  }

  /** Tree-node elements under a `<BehaviorTree>`, in document order. */
  treeNodes(tree?: TreeEntry): XmlNode[] {
    const out: XmlNode[] = [];
    const walk = (el: XmlNode) => {
      for (const c of el.children) {
        out.push(c);
        walk(c);
      }
    };
    for (const t of tree ? [tree] : this.trees) {
      walk(t.element);
    }
    return out;
  }

  /** `{key}` references in tree-node attribute values. */
  blackboardUsages(): BlackboardUsage[] {
    if (this.blackboardCache) {
      return this.blackboardCache;
    }
    const usages: BlackboardUsage[] = [];
    for (const tree of this.trees) {
      for (const el of this.treeNodes(tree)) {
        const ports = this.portsOf(el);
        const isSubTree = el.name === 'SubTree' || el.name === 'SubTreePlus';
        for (const attr of el.attributes) {
          if (attr.value === undefined || attr.valueStart === undefined) {
            continue;
          }
          const re = /\{([^{}\s]+)\}/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(attr.value)) !== null) {
            const port = ports.find((p) => p.name === attr.name);
            let access: BlackboardAccess = 'unknown';
            if (isSubTree && attr.name !== 'ID') {
              access = 'remap';
            } else if (port) {
              access =
                port.direction === 'input'
                  ? 'read'
                  : port.direction === 'output'
                    ? 'write'
                    : 'readwrite';
            }
            usages.push({
              key: m[1],
              element: el,
              attribute: attr,
              start: attr.valueStart + m.index,
              end: attr.valueStart + m.index + m[0].length,
              access,
              treeId: tree.id,
            });
          }
        }
      }
    }
    this.blackboardCache = usages;
    return usages;
  }

  blackboardKeys(): string[] {
    return [...new Set(this.blackboardUsages().map((u) => u.key))].sort();
  }

  location(start: number, end: number): SourceLocation {
    return { start, end };
  }
}

function detectVersion(
  root: XmlNode | undefined,
  defaultFormatVersion: IndexOptions['defaultFormatVersion'],
): FormatVersion {
  if (defaultFormatVersion === '3') {
    return 3;
  }
  if (defaultFormatVersion === '4') {
    return 4;
  }
  const format = root ? getAttributeValue(root, 'BTCPP_format') : undefined;
  return format !== undefined ? 4 : 3;
}

function parseModelEntry(
  scan: XmlScanResult,
  el: XmlNode,
  nodeTypeMap: Record<string, NodeKind>,
): ModelEntry | null {
  const idAttr = getAttribute(el, 'ID');
  const id = idAttr?.value ?? el.name;
  if (!id) {
    return null;
  }
  const wrapper = MODEL_WRAPPER_TAGS.includes(el.name) ? el.name : undefined;
  const ports: ModelPort[] = [];
  let description = getAttributeValue(el, 'description');
  for (const child of el.children) {
    const direction = PORT_TAGS[child.name];
    if (direction) {
      const name = getAttributeValue(child, 'name');
      if (name) {
        ports.push({
          name,
          direction,
          type: getAttributeValue(child, 'type'),
          defaultValue: getAttributeValue(child, 'default'),
          description:
            getAttributeValue(child, 'description') || getTextContent(scan, child) || undefined,
          element: child,
        });
      }
    } else if (child.name === 'description') {
      description = getTextContent(scan, child) || description;
    }
  }
  return {
    id,
    kind: inferNodeKind(id, wrapper, nodeTypeMap),
    element: el,
    idAttr,
    ports,
    description,
  };
}

/**
 * Indexes an included / workspace file so its trees and models can be referenced
 * from another document. Locations carry line/character positions.
 */
export function collectFileDefinitions(
  text: string,
  uri: string,
  sourceLabel: string,
  source: NodeSource,
  nodeTypeMap: Record<string, NodeKind> = {},
): { models: NodeDefinition[]; trees: ExternalTree[]; includes: IncludeEntry[] } {
  const index = new BtIndex(text, {
    externals: { ...EMPTY_EXTERNALS, nodeTypeMap },
  });
  const loc = (start: number, end: number): SourceLocation => ({
    uri,
    start,
    end,
    startPos: offsetToPosition(text, start),
    endPos: offsetToPosition(text, end),
  });
  const models = index.models.map((m) => {
    const def = index.localModelDefinition(m);
    return {
      ...def,
      source,
      sourceLabel,
      location: loc(def.location!.start, def.location!.end),
    };
  });
  const trees = index.trees
    .filter((t) => t.id)
    .map((t) => ({
      id: t.id,
      sourceLabel,
      location: loc(
        t.idAttr?.valueStart ?? t.element.nameStart,
        t.idAttr?.valueEnd ?? t.element.nameEnd,
      ),
    }));
  return { models, trees, includes: index.includes };
}

/** `<include>` elements of a document (path / ros_pkg only). */
export function scanIncludes(text: string): Array<{ path?: string; rosPkg?: string }> {
  return new BtIndex(text).includes.map((i) => ({ path: i.path, rosPkg: i.rosPkg }));
}
