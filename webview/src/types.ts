export interface BtNodeData {
  path: string;
  kind: string;
  registeredId: string;
  instanceName?: string;
  attributes: Record<string, string>;
  children: BtNodeData[];
  rawTag?: string;
  legacyTag?: string;
}

export interface SerializedDocument {
  formatVersion: 3 | 4;
  mainTreeToExecute?: string;
  activeTreeId: string;
  trees: { id: string; root: BtNodeData | null }[];
  models: { id: string; kind: string; ports: { name: string; direction: string }[] }[];
  includes: { path: string; rosPkg?: string; resolvedUri?: string; error?: string }[];
  warnings: string[];
}
