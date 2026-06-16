import * as fs from 'fs';
import * as path from 'path';

export interface LayoutPositions {
  [nodePath: string]: { x: number; y: number };
}

export interface TreeLayout {
  trees: Record<string, LayoutPositions>;
}

function layoutPathForUri(fileUri: string, workspaceRoot?: string): string | null {
  if (!workspaceRoot) {
    return null;
  }
  const base = path.basename(fileUri);
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = path.join(workspaceRoot, '.btview', 'layouts');
  return path.join(dir, `${safe}.json`);
}

export function loadLayout(fileUri: string, workspaceRoot?: string): TreeLayout | null {
  const layoutPath = layoutPathForUri(fileUri, workspaceRoot);
  if (!layoutPath || !fs.existsSync(layoutPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(layoutPath, 'utf8')) as TreeLayout;
  } catch {
    return null;
  }
}

export function saveLayout(
  fileUri: string,
  workspaceRoot: string | undefined,
  layout: TreeLayout,
): void {
  const layoutPath = layoutPathForUri(fileUri, workspaceRoot);
  if (!layoutPath) {
    return;
  }
  fs.mkdirSync(path.dirname(layoutPath), { recursive: true });
  fs.writeFileSync(layoutPath, JSON.stringify(layout, null, 2), 'utf8');
}

export function clearLayout(fileUri: string, workspaceRoot?: string): void {
  const layoutPath = layoutPathForUri(fileUri, workspaceRoot);
  if (layoutPath && fs.existsSync(layoutPath)) {
    fs.unlinkSync(layoutPath);
  }
}

export function getLayoutForTree(
  fileUri: string,
  treeId: string,
  workspaceRoot?: string,
): LayoutPositions | undefined {
  const layout = loadLayout(fileUri, workspaceRoot);
  return layout?.trees[treeId];
}
