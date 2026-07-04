import type { BtDocument } from '../types';
import { scriptedOutcomes, type OutcomeSpec } from './outcomes';
import { Simulator, type TickResult } from './tick';
import type { NodeStatus } from './status';

/**
 * A single expectation about a simulation run. Omitting `tick` checks the final tick.
 * Provide exactly one of `status` (with `path`), `rootStatus`, or `blackboard`.
 */
export interface TraceAssertion {
  /** 1-based tick index to inspect. Defaults to the last tick of the run. */
  tick?: number;
  /** Node path to check `status` against (e.g. "0-1"). */
  path?: string;
  /** Expected status of the node at `path`. */
  status?: NodeStatus;
  /** Expected status returned by the root node. */
  rootStatus?: NodeStatus;
  /** Expected blackboard entries (subset match). */
  blackboard?: Record<string, string>;
}

/** A declarative test case for a behavior tree, serialisable as `*.trace.json`. */
export interface TraceScenario {
  name?: string;
  /** Tree to run; defaults to main_tree_to_execute / first tree. */
  tree?: string;
  /** Safety bound on ticks (default 100). */
  maxTicks?: number;
  /** Leaf outcomes keyed by instance name or registered ID. */
  mocks?: Record<string, OutcomeSpec>;
  /** Assertions to evaluate after the run. */
  expect: TraceAssertion[];
}

export interface AssertionResult {
  ok: boolean;
  message: string;
}

export interface TraceRunResult {
  name: string;
  passed: boolean;
  results: AssertionResult[];
  ticks: TickResult[];
}

function describeAssertion(a: TraceAssertion): string {
  const at = a.tick ? `tick ${a.tick}` : 'final tick';
  if (a.blackboard) {
    return `${at}: blackboard ${JSON.stringify(a.blackboard)}`;
  }
  if (a.rootStatus) {
    return `${at}: root == ${a.rootStatus}`;
  }
  return `${at}: ${a.path} == ${a.status}`;
}

function evaluate(a: TraceAssertion, ticks: TickResult[]): AssertionResult {
  const desc = describeAssertion(a);
  if (ticks.length === 0) {
    return { ok: false, message: `${desc} — no ticks were produced` };
  }
  const frame = a.tick ? ticks[a.tick - 1] : ticks[ticks.length - 1];
  if (!frame) {
    return { ok: false, message: `${desc} — tick ${a.tick} out of range (ran ${ticks.length})` };
  }

  if (a.blackboard) {
    for (const [k, v] of Object.entries(a.blackboard)) {
      if (frame.blackboard[k] !== v) {
        return {
          ok: false,
          message: `${desc} — blackboard["${k}"] was ${JSON.stringify(frame.blackboard[k])}`,
        };
      }
    }
    return { ok: true, message: desc };
  }

  if (a.rootStatus) {
    const ok = frame.rootStatus === a.rootStatus;
    return { ok, message: ok ? desc : `${desc} — was ${frame.rootStatus}` };
  }

  if (a.path && a.status) {
    // A node absent from the snapshot was never ticked → treat as IDLE.
    const actual = frame.statuses[a.path] ?? 'IDLE';
    const ok = actual === a.status;
    return { ok, message: ok ? desc : `${desc} — was ${actual}` };
  }

  return {
    ok: false,
    message: `${desc} — malformed assertion (need status+path, rootStatus, or blackboard)`,
  };
}

/** Run one scenario against a parsed document and evaluate its assertions. */
export function runScenario(doc: BtDocument, scenario: TraceScenario): TraceRunResult {
  const sim = new Simulator(doc, {
    treeId: scenario.tree,
    outcome: scriptedOutcomes(scenario.mocks ?? {}),
  });

  const maxTicks = scenario.maxTicks ?? 100;
  const ticks: TickResult[] = [];
  // Record every tick so per-tick assertions can inspect the whole trace.
  do {
    ticks.push(sim.tick());
  } while (ticks[ticks.length - 1].rootStatus === 'RUNNING' && ticks.length < maxTicks);

  const results = scenario.expect.map((a) => evaluate(a, ticks));
  return {
    name: scenario.name ?? '(unnamed)',
    passed: results.every((r) => r.ok),
    results,
    ticks,
  };
}
