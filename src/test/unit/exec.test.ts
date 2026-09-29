import { describe, expect, it } from 'vitest';
import type { BtDocument, BtNode, BtTree } from '../../btcpp/types';
import { Simulator } from '../../btcpp/exec/tick';
import { scriptedOutcomes } from '../../btcpp/exec/outcomes';

let counter = 0;
function n(
  kind: BtNode['kind'],
  registeredId: string,
  children: BtNode[] = [],
  name?: string,
): BtNode {
  return {
    path: `n${counter++}`,
    kind,
    registeredId,
    instanceName: name,
    attributes: {},
    children,
  };
}
function leaf(name: string): BtNode {
  return n('action', 'Action', [], name);
}
function seq(...children: BtNode[]): BtNode {
  return n('control', 'Sequence', children);
}

function docOf(root: BtNode, extra: BtTree[] = []): BtDocument {
  return {
    formatVersion: 4,
    trees: [{ id: 'Main', root }, ...extra],
    models: new Map(),
    includes: [],
    warnings: [],
  };
}

/** assignPaths-lite: exec keys off `path`, so give each node a unique stable path. */
function withPaths(node: BtNode, path = '0'): BtNode {
  node.path = path;
  node.children.forEach((c, i) => withPaths(c, `${path}-${i}`));
  return node;
}

describe('Simulator control-flow semantics', () => {
  it('Sequence returns SUCCESS when all children succeed', () => {
    const sim = new Simulator(docOf(withPaths(seq(leaf('a'), leaf('b')))));
    const r = sim.tick();
    expect(r.rootStatus).toBe('SUCCESS');
    expect(r.statuses['0']).toBe('SUCCESS');
  });

  it('Sequence has memory: earlier children are not re-ticked while a later child runs', () => {
    // If "a" were re-ticked on tick 2 it would return FAILURE and fail the tree.
    const sim = new Simulator(docOf(withPaths(seq(leaf('a'), leaf('b')))), {
      outcome: scriptedOutcomes({ a: ['SUCCESS', 'FAILURE'], b: ['RUNNING', 'SUCCESS'] }),
    });
    expect(sim.tick().rootStatus).toBe('RUNNING');
    expect(sim.tick().rootStatus).toBe('SUCCESS');
  });

  it('Sequence halts on first FAILURE and skips later children', () => {
    const sim = new Simulator(docOf(withPaths(seq(leaf('a'), leaf('b')))), {
      outcome: scriptedOutcomes({ a: 'FAILURE', b: 'SUCCESS' }),
    });
    const r = sim.tick();
    expect(r.rootStatus).toBe('FAILURE');
    expect(r.statuses['0-1']).not.toBe('SUCCESS'); // b never ran to success
  });

  it('ReactiveSequence re-ticks earlier children every tick', () => {
    const root = withPaths(n('control', 'ReactiveSequence', [leaf('a'), leaf('b')]));
    const sim = new Simulator(docOf(root), {
      outcome: scriptedOutcomes({ a: ['SUCCESS', 'FAILURE'], b: ['RUNNING', 'SUCCESS'] }),
    });
    expect(sim.tick().rootStatus).toBe('RUNNING');
    expect(sim.tick().rootStatus).toBe('FAILURE'); // a re-evaluated to FAILURE
  });

  it('Fallback succeeds when a later child succeeds', () => {
    const root = withPaths(n('control', 'Fallback', [leaf('a'), leaf('b')]));
    const sim = new Simulator(docOf(root), {
      outcome: scriptedOutcomes({ a: 'FAILURE', b: 'SUCCESS' }),
    });
    expect(sim.tick().rootStatus).toBe('SUCCESS');
  });

  it('Parallel respects success_count threshold', () => {
    const root = withPaths(n('control', 'Parallel', [leaf('a'), leaf('b')]));
    root.attributes.success_count = '2';
    const sim = new Simulator(docOf(root), {
      outcome: scriptedOutcomes({ a: 'SUCCESS', b: ['RUNNING', 'SUCCESS'] }),
    });
    expect(sim.tick().rootStatus).toBe('RUNNING');
    expect(sim.tick().rootStatus).toBe('SUCCESS');
  });
});

describe('Simulator decorators', () => {
  it('Inverter flips SUCCESS to FAILURE', () => {
    const root = withPaths(n('decorator', 'Inverter', [leaf('a')]));
    const sim = new Simulator(docOf(root), { outcome: scriptedOutcomes({ a: 'SUCCESS' }) });
    expect(sim.tick().rootStatus).toBe('FAILURE');
  });

  it('ForceSuccess turns FAILURE into SUCCESS', () => {
    const root = withPaths(n('decorator', 'ForceSuccess', [leaf('a')]));
    const sim = new Simulator(docOf(root), { outcome: scriptedOutcomes({ a: 'FAILURE' }) });
    expect(sim.tick().rootStatus).toBe('SUCCESS');
  });

  it('Retry retries on failure then succeeds within num_attempts', () => {
    const root = withPaths(n('decorator', 'Retry', [leaf('a')]));
    root.attributes.num_attempts = '3';
    // Retry halts (resets) the child between attempts, so per-tick scripts reset too;
    // model cross-attempt progression with a closure that counts total attempts.
    let attempts = 0;
    const sim = new Simulator(docOf(root), {
      outcome: () => (++attempts < 3 ? 'FAILURE' : 'SUCCESS'),
    });
    const r = sim.run(10);
    expect(r.rootStatus).toBe('SUCCESS');
  });

  it('Repeat repeats a succeeding child num_cycles times', () => {
    const root = withPaths(n('decorator', 'Repeat', [leaf('a')]));
    root.attributes.num_cycles = '2';
    const sim = new Simulator(docOf(root), { outcome: scriptedOutcomes({ a: 'SUCCESS' }) });
    expect(sim.tick().rootStatus).toBe('RUNNING'); // cycle 1 done, one more to go
    expect(sim.tick().rootStatus).toBe('SUCCESS');
  });
});

describe('Simulator subtrees + blackboard', () => {
  it('expands and ticks a referenced SubTree', () => {
    const subRoot = withPaths(seq(leaf('x')));
    const sub: BtTree = { id: 'Sub', root: subRoot };
    const mainRoot = withPaths(seq(n('subtree', 'Sub')));
    const sim = new Simulator(docOf(mainRoot, [sub]));
    expect(sim.tick().rootStatus).toBe('SUCCESS');
  });

  it('Script node writes literals to the blackboard', () => {
    const script = n('script', 'Script');
    script.attributes.code = 'goal := 42; label := "hi"';
    const sim = new Simulator(docOf(withPaths(seq(script))));
    const r = sim.tick();
    expect(r.blackboard.goal).toBe('42');
    expect(r.blackboard.label).toBe('hi');
  });

  it('reset() clears state so the run restarts cleanly', () => {
    const sim = new Simulator(docOf(withPaths(seq(leaf('a')))));
    sim.tick();
    sim.reset();
    const r = sim.tick();
    expect(r.tick).toBe(1);
  });
});
