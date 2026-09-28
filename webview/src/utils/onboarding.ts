import type { SerializedDocument, ValidationIssuePayload } from '../types';

/** Key under which the webview state remembers the dismissed first-run hint. */
export const ONBOARDING_STATE_KEY = 'onboardingDismissed';

export type CanvasEmptyState =
  | { kind: 'noTrees'; createTreeIssue?: ValidationIssuePayload }
  | { kind: 'emptyTree'; treeId: string }
  | null;

/** Which onboarding empty state (if any) the graph pane should show. */
export function canvasEmptyState(
  doc: Pick<SerializedDocument, 'trees' | 'activeTreeId' | 'validationErrors'>,
): CanvasEmptyState {
  if (doc.trees.length === 0) {
    return {
      kind: 'noTrees',
      createTreeIssue: doc.validationErrors?.find(
        (e) => e.code === 'no-behavior-tree' && (e.fixes?.length ?? 0) > 0,
      ),
    };
  }
  const active = doc.trees.find((t) => t.id === doc.activeTreeId) ?? doc.trees[0]!;
  return active.root ? null : { kind: 'emptyTree', treeId: active.id };
}

/** First-run hint is shown until dismissed in any editor (host) or this one (webview state). */
export function isOnboardingDismissed(
  doc: Pick<SerializedDocument, 'onboardingDismissed'>,
  webviewState: unknown,
): boolean {
  if (doc.onboardingDismissed) {
    return true;
  }
  return Boolean(
    webviewState &&
    typeof webviewState === 'object' &&
    (webviewState as Record<string, unknown>)[ONBOARDING_STATE_KEY] === true,
  );
}

/** Root controls offered as one-click starters on an empty tree. */
export const STARTER_ROOTS = [
  { id: 'Sequence', hint: 'run children in order until one fails' },
  { id: 'Fallback', hint: 'try children in order until one succeeds' },
] as const;

export const ONBOARDING_TIPS = [
  'Drag a node from the palette (or click it) to stage it, then connect parent → child with the edge handles.',
  'Click a node to edit its type, name and ports in the inspector. Arrow keys walk the tree.',
  'Right-click (or Shift+F10) for node actions; press ? for every keyboard shortcut.',
  'The Issues panel lists validation problems — many have a one-click Fix.',
] as const;
