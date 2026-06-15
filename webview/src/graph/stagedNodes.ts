import { getState, setState } from '../vscodeApi';

export const STAGED_PREFIX = 'staged:';

export interface StagedNode {
  id: string;
  registeredId: string;
  kind: string;
  position: { x: number; y: number };
}

export function isStagedId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith(STAGED_PREFIX));
}

export function createStagedId(): string {
  return `${STAGED_PREFIX}${crypto.randomUUID()}`;
}

function stateKey(treeId: string): string {
  return `stagedNodes:${treeId}`;
}

export function loadStagedNodes(treeId: string): StagedNode[] {
  const all = getState<Record<string, StagedNode[]>>();
  return all?.[stateKey(treeId)] ?? [];
}

export function saveStagedNodes(treeId: string, nodes: StagedNode[]): void {
  const key = stateKey(treeId);
  const all = getState<Record<string, StagedNode[]>>() ?? {};
  if (nodes.length === 0) {
    const next = { ...all };
    delete next[key];
    setState(Object.keys(next).length > 0 ? next : undefined);
    return;
  }
  setState({ ...all, [key]: nodes });
}

export function mergeStagedIntoState(
  treeId: string,
  updater: (current: StagedNode[]) => StagedNode[],
): StagedNode[] {
  const next = updater(loadStagedNodes(treeId));
  saveStagedNodes(treeId, next);
  return next;
}

export const STAGED_CHANGED_EVENT = 'btview:staged-changed';

export function removeStagedNode(treeId: string, stagedId: string): void {
  mergeStagedIntoState(treeId, (cur) => cur.filter((s) => s.id !== stagedId));
  window.dispatchEvent(new CustomEvent(STAGED_CHANGED_EVENT));
}

export function updateStagedNode(
  treeId: string,
  stagedId: string,
  patch: Partial<Pick<StagedNode, 'kind' | 'registeredId'>>,
): void {
  mergeStagedIntoState(treeId, (cur) =>
    cur.map((s) => (s.id === stagedId ? { ...s, ...patch } : s)),
  );
  notifyStagedChanged();
}

export function notifyStagedChanged(): void {
  window.dispatchEvent(new CustomEvent(STAGED_CHANGED_EVENT));
}
