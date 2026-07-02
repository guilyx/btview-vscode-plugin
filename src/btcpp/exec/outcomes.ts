import type { BtNode } from '../types';
import type { NodeStatus } from './status';

/**
 * Decides what a leaf node (action / condition / unknown) returns on a given tick.
 * `ticks` is 1-based: it counts how many times this leaf has been ticked since the
 * last halt/reset, which lets a provider model "RUNNING for 2 ticks, then SUCCESS".
 */
export type OutcomeProvider = (node: BtNode, ticks: number) => NodeStatus;

/** A single fixed status, or a per-tick script (last entry repeats once exhausted). */
export type OutcomeSpec = NodeStatus | NodeStatus[];

/** Default: leaves succeed immediately. Keeps offline simulation deterministic. */
export const alwaysSucceed: OutcomeProvider = () => 'SUCCESS';

/**
 * Build a provider from a map keyed by node instance name (preferred) or registered
 * ID. Array specs are indexed by `ticks`; once past the end the final value repeats,
 * so `['RUNNING','SUCCESS']` means "RUNNING on tick 1, SUCCESS on tick 2+".
 * Falls back to `fallback` (default SUCCESS) for unlisted leaves.
 */
export function scriptedOutcomes(
  specs: Record<string, OutcomeSpec>,
  fallback: OutcomeProvider = alwaysSucceed,
): OutcomeProvider {
  return (node, ticks) => {
    const spec = specs[node.instanceName ?? ''] ?? specs[node.registeredId];
    if (spec === undefined) {
      return fallback(node, ticks);
    }
    if (Array.isArray(spec)) {
      if (spec.length === 0) {
        return fallback(node, ticks);
      }
      const index = Math.min(ticks - 1, spec.length - 1);
      return spec[index];
    }
    return spec;
  };
}
