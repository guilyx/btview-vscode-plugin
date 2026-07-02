import type { BtDocument, BtNode } from '../types';
import { Simulator } from '../exec/tick';
import type { NodeStatus } from '../exec/status';
import type { OutcomeProvider } from '../exec/outcomes';

/** A concrete SUCCESS/FAILURE choice for each leaf, keyed by node path. */
export type LeafAssignment = Record<string, 'SUCCESS' | 'FAILURE'>;

export interface VerifyResult {
  property: string;
  holds: boolean;
  /** Number of leaf-outcome combinations explored. */
  checked: number;
  /** A witness (for ∃ properties) or counterexample (for ∀ properties), if any. */
  counterexample?: LeafAssignment;
  /** Set when the search space was capped or the tree could not be built. */
  note?: string;
}

export interface VerifyOptions {
  treeId?: string;
  /** Tick budget per run before a tree is considered non-terminating. */
  maxTicks?: number;
  /** Refuse to enumerate beyond 2^maxLeaves combinations (default 16 → 65 536 runs). */
  maxLeaves?: number;
}

/** Collect the paths of leaf nodes whose outcome is a free choice (actions/conditions). */
export function findLeaves(root: BtNode): string[] {
  const leaves: string[] = [];
  const walk = (node: BtNode): void => {
    if (node.children.length === 0) {
      // Script nodes are deterministic (they only write the blackboard); skip them.
      if (node.kind !== 'script') {
        leaves.push(node.path);
      }
      return;
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return leaves;
}

function providerFor(assignment: LeafAssignment): OutcomeProvider {
  // Leaves outside the top tree (e.g. inside subtrees) default to SUCCESS.
  // ponytail: subtree-internal leaves are not part of the enumeration space.
  return (node) => assignment[node.path] ?? 'SUCCESS';
}

interface RunOutcome {
  assignment: LeafAssignment;
  rootStatus: NodeStatus;
  terminated: boolean;
}

function resolveRoot(doc: BtDocument, treeId?: string): BtNode | null {
  const id = treeId ?? doc.mainTreeToExecute ?? doc.trees[0]?.id;
  return doc.trees.find((t) => t.id === id)?.root ?? null;
}

/**
 * Exhaustively enumerate every SUCCESS/FAILURE combination of the tree's leaves, run the
 * simulator for each, and yield the outcome. This is a bounded model check over the
 * non-deterministic leaf-outcome space — exact for the given tick budget.
 * ponytail: 2^(#leaves) runs; capped by `maxLeaves` to stay tractable.
 */
export function enumerateOutcomes(doc: BtDocument, options: VerifyOptions = {}): RunOutcome[] {
  const root = resolveRoot(doc, options.treeId);
  if (!root) {
    return [];
  }
  const leaves = findLeaves(root);
  const maxLeaves = options.maxLeaves ?? 16;
  if (leaves.length > maxLeaves) {
    throw new RangeError(
      `Tree has ${leaves.length} leaves; refusing to enumerate 2^${leaves.length} combinations (max ${maxLeaves}).`,
    );
  }
  const maxTicks = options.maxTicks ?? 100;
  const combos = 1 << leaves.length;
  const outcomes: RunOutcome[] = [];

  for (let mask = 0; mask < combos; mask++) {
    const assignment: LeafAssignment = {};
    for (let i = 0; i < leaves.length; i++) {
      assignment[leaves[i]] = mask & (1 << i) ? 'FAILURE' : 'SUCCESS';
    }
    const sim = new Simulator(doc, {
      treeId: options.treeId,
      outcome: providerFor(assignment),
    });
    const result = sim.run(maxTicks);
    outcomes.push({
      assignment,
      rootStatus: result.rootStatus,
      terminated: result.rootStatus !== 'RUNNING',
    });
  }
  return outcomes;
}

/**
 * Verify the standard property set for a tree:
 *  - "root can succeed" / "root can fail"  (∃ reachability, with a witness)
 *  - "always terminates"                   (∀ within the tick budget, with a counterexample)
 */
export function verifyTree(doc: BtDocument, options: VerifyOptions = {}): VerifyResult[] {
  const root = resolveRoot(doc, options.treeId);
  if (!root) {
    return [{ property: 'tree exists', holds: false, checked: 0, note: 'No such tree.' }];
  }

  let outcomes: RunOutcome[];
  try {
    outcomes = enumerateOutcomes(doc, options);
  } catch (err) {
    return [
      {
        property: 'bounded check',
        holds: false,
        checked: 0,
        note: err instanceof Error ? err.message : String(err),
      },
    ];
  }

  const checked = outcomes.length;
  const succeed = outcomes.find((o) => o.rootStatus === 'SUCCESS');
  const fail = outcomes.find((o) => o.rootStatus === 'FAILURE');
  const nonTerminating = outcomes.find((o) => !o.terminated);

  return [
    {
      property: 'root can succeed',
      holds: Boolean(succeed),
      checked,
      counterexample: succeed?.assignment,
    },
    {
      property: 'root can fail',
      holds: Boolean(fail),
      checked,
      counterexample: fail?.assignment,
    },
    {
      property: 'always terminates within tick budget',
      holds: !nonTerminating,
      checked,
      counterexample: nonTerminating?.assignment,
    },
  ];
}
