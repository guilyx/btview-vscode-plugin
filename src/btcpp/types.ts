export type FormatVersion = 3 | 4;

export type NodeKind =
  'control' | 'decorator' | 'action' | 'condition' | 'subtree' | 'script' | 'unknown';

export interface PortModel {
  name: string;
  direction: 'input' | 'output' | 'inout';
  type?: string;
  defaultValue?: string;
}

export interface NodeModel {
  id: string;
  kind: NodeKind;
  ports: PortModel[];
  /** Set when the model comes from an `<include>`d file rather than the document itself. */
  sourceUri?: string;
}

export interface BtNode {
  path: string;
  kind: NodeKind;
  registeredId: string;
  instanceName?: string;
  attributes: Record<string, string>;
  children: BtNode[];
  rawTag?: string;
  legacyTag?: string;
}

export interface BtTree {
  id: string;
  root: BtNode | null;
  sourceUri?: string;
}

export interface IncludeRef {
  path: string;
  rosPkg?: string;
  resolvedUri?: string;
  error?: string;
}

export interface BtDocument {
  formatVersion: FormatVersion;
  /**
   * Raw `BTCPP_format` attribute on `<root>` as written in the file (`''` when absent).
   * Left `undefined` for documents built in code, which carry no source to check against.
   */
  declaredFormat?: string;
  mainTreeToExecute?: string;
  trees: BtTree[];
  models: Map<string, NodeModel>;
  includes: IncludeRef[];
  sourceUri?: string;
  warnings: string[];
}

export interface ParseOptions {
  defaultFormatVersion?: 'auto' | '3' | '4';
  sourceUri?: string;
  /** User-defined map of node registered IDs to kinds (from `btview.nodeTypeMap`). */
  nodeTypeMap?: Record<string, NodeKind>;
}

export const SCRIPT_DIRECTIVES = [
  '_successIf',
  '_failureIf',
  '_skipIf',
  '_while',
  '_onSuccess',
  '_onFailure',
  '_onHalted',
  '_post',
] as const;

export const EXPLICIT_WRAPPER_TAGS = new Set([
  'Action',
  'Condition',
  'Control',
  'Decorator',
  'SubTree',
]);
