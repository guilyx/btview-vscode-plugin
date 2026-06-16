export const KIND_COLORS: Record<string, string> = {
  control: '#4a9eff',
  decorator: '#a78bfa',
  action: '#4ade80',
  condition: '#facc15',
  subtree: '#fb923c',
  script: '#f472b6',
  unknown: '#94a3b8',
};

export const KIND_LABELS: Record<string, string> = {
  control: 'Control',
  decorator: 'Decorator',
  action: 'Action',
  condition: 'Condition',
  subtree: 'Subtree',
  script: 'Script',
  unknown: 'Unknown',
};

export const KIND_ORDER = [
  'control',
  'decorator',
  'action',
  'condition',
  'subtree',
  'script',
  'unknown',
] as const;

export function kindColor(kind: string): string {
  return KIND_COLORS[kind] ?? KIND_COLORS.unknown;
}
