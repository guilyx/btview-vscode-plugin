import * as vscode from 'vscode';
import type { RosResolverConfig } from '../ros/packageResolver';
import type { NodeKind } from '../btcpp/types';

const VALID_NODE_KINDS = new Set<NodeKind>([
  'control',
  'decorator',
  'action',
  'condition',
  'subtree',
  'script',
  'unknown',
]);

export function getRosConfig(): RosResolverConfig {
  const config = vscode.workspace.getConfiguration('btview');
  return {
    rosDistro: config.get<string>('rosDistro') || undefined,
    rosWorkspaceSetup: config.get<string>('rosWorkspaceSetup') || undefined,
    packageShareOverrides: config.get<Record<string, string>>('rosPackageShareOverrides') ?? {},
  };
}

export function getDefaultFormatVersion(): 'auto' | '3' | '4' {
  const config = vscode.workspace.getConfiguration('btview');
  return config.get<'auto' | '3' | '4'>('defaultFormatVersion') ?? 'auto';
}

export function getSerializeNewFilesAs(): '3' | '4' {
  const config = vscode.workspace.getConfiguration('btview');
  return config.get<'3' | '4'>('serializeNewFilesAs') ?? '4';
}

export function getNodeTypeMap(): Record<string, NodeKind> {
  const config = vscode.workspace.getConfiguration('btview');
  const raw = config.get<Record<string, string>>('nodeTypeMap') ?? {};
  const map: Record<string, NodeKind> = {};
  for (const [id, kind] of Object.entries(raw)) {
    if (VALID_NODE_KINDS.has(kind as NodeKind) && kind !== 'unknown') {
      map[id] = kind as NodeKind;
    }
  }
  return map;
}
