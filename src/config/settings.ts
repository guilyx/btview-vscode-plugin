import * as vscode from 'vscode';
import type { RosResolverConfig } from '../ros/packageResolver';

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
