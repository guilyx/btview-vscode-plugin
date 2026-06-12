import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import type { BtDocument, IncludeRef } from './types';
import { parseDocument } from './parser';
import { mergeModels } from './nodeRegistry';
import { resolveRosPackageShare, type RosResolverConfig } from '../ros/packageResolver';

export interface ResolvedInclude {
  ref: IncludeRef;
  document?: BtDocument;
  resolvedPath?: string;
}

export async function resolveIncludePath(
  incl: IncludeRef,
  currentFileDir: string,
  config?: RosResolverConfig,
): Promise<{ resolvedPath: string | null; error?: string }> {
  let filePath = incl.path;

  if (path.isAbsolute(filePath) && incl.rosPkg) {
    // ros_pkg ignored for absolute paths per BTCpp spec
  } else if (incl.rosPkg) {
    const shareDir = await resolveRosPackageShare(incl.rosPkg, config);
    if (!shareDir) {
      return {
        resolvedPath: null,
        error: `ROS package "${incl.rosPkg}" not found. Source your workspace or set btview.rosPackageShareOverrides.`,
      };
    }
    filePath = path.join(shareDir, incl.path);
  } else if (!path.isAbsolute(filePath)) {
    filePath = path.join(currentFileDir, filePath);
  }

  const normalized = path.normalize(filePath);
  if (!existsSync(normalized)) {
    return { resolvedPath: null, error: `Include file not found: ${normalized}` };
  }

  return { resolvedPath: normalized };
}

export async function loadDocumentWithIncludes(
  xmlText: string,
  sourcePath: string,
  options: {
    defaultFormatVersion?: 'auto' | '3' | '4';
    rosConfig?: RosResolverConfig;
    maxDepth?: number;
  } = {},
): Promise<BtDocument> {
  const maxDepth = options.maxDepth ?? 10;
  const visited = new Set<string>();

  async function loadRecursive(text: string, filePath: string, depth: number): Promise<BtDocument> {
    const doc = parseDocument(text, {
      defaultFormatVersion: options.defaultFormatVersion,
      sourceUri: filePath,
    });

    if (depth >= maxDepth) {
      doc.warnings.push('Maximum include depth reached.');
      return doc;
    }

    const currentDir = path.dirname(filePath);
    const resolvedIncludes: IncludeRef[] = [];

    for (const incl of doc.includes) {
      const { resolvedPath, error } = await resolveIncludePath(incl, currentDir, options.rosConfig);

      const ref: IncludeRef = {
        ...incl,
        resolvedUri: resolvedPath ?? undefined,
        error,
      };
      resolvedIncludes.push(ref);

      if (!resolvedPath || visited.has(resolvedPath)) {
        continue;
      }
      visited.add(resolvedPath);

      const includedText = await fs.readFile(resolvedPath, 'utf8');
      const includedDoc = await loadRecursive(includedText, resolvedPath, depth + 1);

      const existingIds = new Set(doc.trees.map((t) => t.id));
      for (const tree of includedDoc.trees) {
        if (!existingIds.has(tree.id)) {
          doc.trees.push({ ...tree, sourceUri: resolvedPath });
          existingIds.add(tree.id);
        }
      }

      doc.models = mergeModels(doc.models, includedDoc.models);
      doc.warnings.push(...includedDoc.warnings);
    }

    doc.includes = resolvedIncludes;
    return doc;
  }

  return loadRecursive(xmlText, sourcePath, 0);
}
