import * as fs from 'fs/promises';
import * as path from 'path';
import type { NodeKind } from '../btcpp/types';
import { resolveIncludePath } from '../btcpp/includeResolver';
import type { RosResolverConfig } from '../ros/packageResolver';
import {
  collectFileDefinitions,
  includeKey,
  scanIncludes,
  type ExternalDefinitions,
} from './btIndex';

export interface ExternalLoadOptions {
  rosConfig?: RosResolverConfig;
  nodeTypeMap?: Record<string, NodeKind>;
  /** Absolute path of the workspace models file (`btview.customModelsInclude`), if any. */
  workspaceModelsPath?: string;
  maxDepth?: number;
  /** Injectable file reader (defaults to a small mtime-keyed cache over `fs`). */
  readFile?: (filePath: string) => Promise<string | null>;
}

const fileCache = new Map<string, { mtimeMs: number; text: string }>();

async function cachedReadFile(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    const cached = fileCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.text;
    }
    const text = await fs.readFile(filePath, 'utf8');
    fileCache.set(filePath, { mtimeMs: stat.mtimeMs, text });
    return text;
  } catch {
    return null;
  }
}

export function clearExternalFileCache(): void {
  fileCache.clear();
}

/**
 * Resolves includes (recursively, including `ros_pkg`) and the workspace models file,
 * and collects the trees and node models they define.
 */
export async function loadExternalDefinitions(
  text: string,
  filePath: string | undefined,
  options: ExternalLoadOptions = {},
): Promise<ExternalDefinitions> {
  const readFile = options.readFile ?? cachedReadFile;
  const nodeTypeMap = options.nodeTypeMap ?? {};
  const maxDepth = options.maxDepth ?? 10;
  const result: ExternalDefinitions = {
    includeModels: [],
    workspaceModels: [],
    includeTrees: [],
    includeTargets: {},
    nodeTypeMap,
  };
  const visited = new Set<string>();
  if (filePath) {
    visited.add(path.normalize(filePath));
  }

  const visit = async (
    includes: Array<{ path?: string; rosPkg?: string }>,
    baseDir: string | undefined,
    depth: number,
    topLevel: boolean,
  ): Promise<void> => {
    if (depth > maxDepth) {
      return;
    }
    for (const incl of includes) {
      if (!incl.path) {
        continue;
      }
      if (!baseDir && !path.isAbsolute(incl.path) && !incl.rosPkg) {
        continue;
      }
      const { resolvedPath } = await resolveIncludePath(
        { path: incl.path, rosPkg: incl.rosPkg },
        baseDir ?? '',
        options.rosConfig,
      );
      if (!resolvedPath) {
        continue;
      }
      if (topLevel) {
        result.includeTargets[includeKey(incl.path, incl.rosPkg)] = resolvedPath;
      }
      if (visited.has(resolvedPath)) {
        continue;
      }
      visited.add(resolvedPath);
      const includedText = await readFile(resolvedPath);
      if (includedText === null) {
        continue;
      }
      const label = incl.rosPkg ? `${incl.rosPkg}/${incl.path}` : incl.path;
      const defs = collectFileDefinitions(
        includedText,
        resolvedPath,
        label,
        'include',
        nodeTypeMap,
      );
      result.includeModels.push(...defs.models);
      result.includeTrees.push(...defs.trees);
      await visit(defs.includes, path.dirname(resolvedPath), depth + 1, false);
    }
  };

  await visit(scanIncludes(text), filePath ? path.dirname(filePath) : undefined, 0, true);

  const wsPath = options.workspaceModelsPath;
  if (wsPath && !visited.has(path.normalize(wsPath))) {
    const wsText = await readFile(wsPath);
    if (wsText !== null) {
      const label = path.basename(path.dirname(wsPath)) + '/' + path.basename(wsPath);
      result.workspaceModels = collectFileDefinitions(
        wsText,
        wsPath,
        label,
        'workspace',
        nodeTypeMap,
      ).models;
    }
  }

  return result;
}
