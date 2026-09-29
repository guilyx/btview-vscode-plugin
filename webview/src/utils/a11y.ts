/** Screen-reader text and keyboard helpers (pure, unit-tested). */

export interface NodeLabelInput {
  kind: string;
  registeredId: string;
  instanceName?: string;
  childCount?: number;
  status?: string;
  hasWarning?: boolean;
  staged?: boolean;
}

/** Accessible name of a node card: kind, type, instance name, children, status, issues. */
export function nodeAriaLabel(d: NodeLabelInput): string {
  const parts: string[] = [];
  const name =
    d.instanceName && d.instanceName !== d.registeredId
      ? `${d.registeredId} “${d.instanceName}”`
      : d.registeredId;
  parts.push(`${d.staged ? 'staged ' : ''}${d.kind} ${name}`);
  if (d.childCount) {
    parts.push(`${d.childCount} ${d.childCount === 1 ? 'child' : 'children'}`);
  }
  if (d.status && d.status !== 'IDLE') {
    parts.push(`status ${d.status}`);
  }
  if (d.hasWarning) {
    parts.push('has validation issues');
  }
  return parts.join(', ');
}

/** Live-region text for the current selection. */
export function describeSelection(node: NodeLabelInput | null): string {
  return node ? `Selected ${nodeAriaLabel(node)}` : '';
}

/**
 * Live-region text for the simulation. Only the root status is spoken so auto-play
 * does not announce every tick.
 */
export function describeSimulation(tick: number, rootStatus: string | null): string {
  if (tick === 0 || !rootStatus || rootStatus === 'IDLE') {
    return '';
  }
  if (rootStatus === 'SUCCESS' || rootStatus === 'FAILURE') {
    return `Simulation finished: ${rootStatus} after ${tick} tick${tick === 1 ? '' : 's'}`;
  }
  return `Simulation ${rootStatus.toLowerCase()}`;
}

/**
 * Next focus index for a menu when a navigation key is pressed, skipping disabled items
 * and wrapping around. Returns `null` for keys the menu does not handle.
 */
export function nextMenuIndex(disabled: boolean[], current: number, key: string): number | null {
  const n = disabled.length;
  const enabled = disabled.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
  if (enabled.length === 0) {
    return null;
  }
  switch (key) {
    case 'Home':
      return enabled[0]!;
    case 'End':
      return enabled[enabled.length - 1]!;
    case 'ArrowDown':
    case 'ArrowUp': {
      if (current < 0 || current >= n) {
        return key === 'ArrowDown' ? enabled[0]! : enabled[enabled.length - 1]!;
      }
      const step = key === 'ArrowDown' ? 1 : -1;
      for (let k = 1; k <= n; k++) {
        const i = (((current + step * k) % n) + n) % n;
        if (!disabled[i]) {
          return i;
        }
      }
      return null;
    }
    default:
      return null;
  }
}
