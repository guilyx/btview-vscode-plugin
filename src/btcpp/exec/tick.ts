import type { BtDocument, BtNode } from '../types';
import { alwaysSucceed, type OutcomeProvider } from './outcomes';
import type { NodeStatus } from './status';

export interface SimulatorOptions {
  /** Tree to execute. Defaults to `main_tree_to_execute`, then the first tree. */
  treeId?: string;
  /** Leaf outcome provider. Defaults to "always SUCCESS". */
  outcome?: OutcomeProvider;
}

export interface TickResult {
  /** 1-based tick counter. */
  tick: number;
  /** Status returned by the root node this tick. */
  rootStatus: NodeStatus;
  /** Per-node status for the executed tree, keyed by node `path`. */
  statuses: Record<string, NodeStatus>;
  /** Snapshot of blackboard entries after the tick. */
  blackboard: Record<string, string>;
}

interface NodeState {
  index?: number;
  ticks?: number;
  count?: number;
  done?: NodeStatus;
}

/** Per-node internal state + status live in maps keyed by a scoped key so that a
 *  subtree's internal nodes never collide with the host tree (both start at path `0`).
 *  Top-scope keys equal `node.path` (no `/`); subtree scopes append `<path>/`. */
interface TickContext {
  outcome: OutcomeProvider;
  trees: Map<string, BtNode>;
  blackboard: Map<string, string>;
  state: Map<string, NodeState>;
  statuses: Map<string, NodeStatus>;
}

function stateOf(ctx: TickContext, key: string): NodeState {
  let s = ctx.state.get(key);
  if (!s) {
    s = {};
    ctx.state.set(key, s);
  }
  return s;
}

function intAttr(node: BtNode, name: string, fallback: number): number {
  const raw = node.attributes[name];
  if (raw === undefined) {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Reset a node and its structural descendants to IDLE (halt semantics). */
function halt(node: BtNode, ctx: TickContext, scope: string): void {
  const key = scope + node.path;
  ctx.state.delete(key);
  ctx.statuses.set(key, 'IDLE');
  for (const child of node.children) {
    halt(child, ctx, scope);
  }
}

function haltChildrenFrom(node: BtNode, from: number, ctx: TickContext, scope: string): void {
  for (let i = from; i < node.children.length; i++) {
    halt(node.children[i], ctx, scope);
  }
}

/** Minimal BT.CPP script support: `a := 1; b := 2` writes literals to the blackboard.
 *  ponytail: only handles `key := literal` / `key = literal`; full expression
 *  evaluation (arithmetic, comparisons, preconditions) is deferred to the verify layer. */
function runScript(code: string, bb: Map<string, string>): void {
  for (const stmt of code.split(';')) {
    const m = stmt.match(/^\s*([A-Za-z_]\w*)\s*:?=\s*(.+?)\s*$/);
    if (m) {
      bb.set(m[1], m[2].replace(/^['"]|['"]$/g, ''));
    }
  }
}

function tickLeaf(node: BtNode, ctx: TickContext, scope: string): NodeStatus {
  const key = scope + node.path;
  const s = stateOf(ctx, key);
  s.ticks = (s.ticks ?? 0) + 1;
  return ctx.outcome(node, s.ticks);
}

function tickControl(node: BtNode, ctx: TickContext, scope: string): NodeStatus {
  const key = scope + node.path;
  const s = stateOf(ctx, key);
  const kids = node.children;
  const id = node.registeredId;

  // Reactive variants re-tick from the first child every tick (no memory).
  if (id === 'ReactiveSequence' || id === 'ReactiveFallback') {
    const isSeq = id === 'ReactiveSequence';
    for (let i = 0; i < kids.length; i++) {
      const st = tickNode(kids[i], ctx, scope);
      if (st === 'RUNNING') {
        haltChildrenFrom(node, i + 1, ctx, scope);
        return 'RUNNING';
      }
      if (isSeq && st === 'FAILURE') {
        haltChildrenFrom(node, 0, ctx, scope);
        return 'FAILURE';
      }
      if (!isSeq && st === 'SUCCESS') {
        haltChildrenFrom(node, 0, ctx, scope);
        return 'SUCCESS';
      }
    }
    return isSeq ? 'SUCCESS' : 'FAILURE';
  }

  if (id === 'IfThenElse') {
    const cond = tickNode(kids[0], ctx, scope);
    if (cond === 'RUNNING') {
      return 'RUNNING';
    }
    if (cond === 'SUCCESS') {
      return kids[1] ? tickNode(kids[1], ctx, scope) : 'SUCCESS';
    }
    return kids[2] ? tickNode(kids[2], ctx, scope) : 'FAILURE';
  }

  if (id === 'Parallel') {
    // ponytail: re-ticks every child each tick and does not latch already-completed
    // children (BehaviorTree.CPP skips completed ones). Fine for deterministic specs.
    const successThresh = intAttr(node, 'success_count', kids.length);
    const failureThresh = intAttr(node, 'failure_count', 1);
    let success = 0;
    let failure = 0;
    for (const child of kids) {
      const st = tickNode(child, ctx, scope);
      if (st === 'SUCCESS') {
        success++;
      } else if (st === 'FAILURE') {
        failure++;
      }
    }
    const needSuccess = successThresh < 0 ? kids.length : successThresh;
    const needFailure = failureThresh < 0 ? kids.length : failureThresh;
    if (success >= needSuccess) {
      haltChildrenFrom(node, 0, ctx, scope);
      return 'SUCCESS';
    }
    if (failure >= needFailure) {
      haltChildrenFrom(node, 0, ctx, scope);
      return 'FAILURE';
    }
    return 'RUNNING';
  }

  // Memory control nodes: Sequence, SequenceWithMemory, Fallback (+ unknown → Sequence).
  const isFallback = id === 'Fallback';
  const keepIndexOnFail = id === 'SequenceWithMemory';
  s.index ??= 0;
  for (let i = s.index; i < kids.length; i++) {
    const st = tickNode(kids[i], ctx, scope);
    if (st === 'RUNNING') {
      s.index = i;
      return 'RUNNING';
    }
    if (isFallback) {
      if (st === 'SUCCESS') {
        haltChildrenFrom(node, 0, ctx, scope);
        s.index = 0;
        return 'SUCCESS';
      }
      // FAILURE / SKIPPED → try next child
    } else {
      if (st === 'FAILURE') {
        if (keepIndexOnFail) {
          s.index = i;
          halt(kids[i], ctx, scope);
        } else {
          haltChildrenFrom(node, 0, ctx, scope);
          s.index = 0;
        }
        return 'FAILURE';
      }
      // SUCCESS / SKIPPED → advance to next child
    }
  }
  s.index = 0;
  return isFallback ? 'FAILURE' : 'SUCCESS';
}

function tickDecorator(node: BtNode, ctx: TickContext, scope: string): NodeStatus {
  const child = node.children[0];
  if (!child) {
    return 'SUCCESS';
  }
  const key = scope + node.path;
  const s = stateOf(ctx, key);
  const id = node.registeredId;

  switch (id) {
    case 'Inverter': {
      const st = tickNode(child, ctx, scope);
      if (st === 'SUCCESS') return 'FAILURE';
      if (st === 'FAILURE') return 'SUCCESS';
      return st;
    }
    case 'ForceSuccess': {
      const st = tickNode(child, ctx, scope);
      return st === 'RUNNING' ? 'RUNNING' : 'SUCCESS';
    }
    case 'ForceFailure': {
      const st = tickNode(child, ctx, scope);
      return st === 'RUNNING' ? 'RUNNING' : 'FAILURE';
    }
    case 'Repeat': {
      const cycles = intAttr(node, 'num_cycles', 1);
      const st = tickNode(child, ctx, scope);
      if (st === 'RUNNING') return 'RUNNING';
      if (st === 'FAILURE') {
        s.count = 0;
        return 'FAILURE';
      }
      s.count = (s.count ?? 0) + 1;
      halt(child, ctx, scope);
      if (cycles >= 0 && s.count >= cycles) {
        s.count = 0;
        return 'SUCCESS';
      }
      return 'RUNNING';
    }
    case 'Retry':
    case 'RetryUntilSuccessful': {
      const attempts = intAttr(node, 'num_attempts', 1);
      const st = tickNode(child, ctx, scope);
      if (st === 'RUNNING') return 'RUNNING';
      if (st === 'SUCCESS') {
        s.count = 0;
        return 'SUCCESS';
      }
      s.count = (s.count ?? 0) + 1;
      halt(child, ctx, scope);
      if (attempts >= 0 && s.count >= attempts) {
        s.count = 0;
        return 'FAILURE';
      }
      return 'RUNNING';
    }
    case 'RunOnce': {
      if (s.done) {
        return s.done;
      }
      const st = tickNode(child, ctx, scope);
      if (st === 'SUCCESS' || st === 'FAILURE') {
        s.done = st;
      }
      return st;
    }
    default:
      // Timeout / Delay / unknown decorators: pass the child status through.
      // ponytail: time-based decorators have no wall clock in offline simulation.
      return tickNode(child, ctx, scope);
  }
}

function tickSubtree(node: BtNode, ctx: TickContext, scope: string): NodeStatus {
  const root = ctx.trees.get(node.registeredId);
  if (!root) {
    return 'FAILURE';
  }
  return tickNode(root, ctx, scope + node.path + '/');
}

function tickNode(node: BtNode, ctx: TickContext, scope: string): NodeStatus {
  let status: NodeStatus;
  switch (node.kind) {
    case 'control':
      status = tickControl(node, ctx, scope);
      break;
    case 'decorator':
      status = tickDecorator(node, ctx, scope);
      break;
    case 'subtree':
      status = tickSubtree(node, ctx, scope);
      break;
    case 'script':
      runScript(node.attributes.code ?? '', ctx.blackboard);
      status = 'SUCCESS';
      break;
    default:
      // action / condition / unknown → leaf outcome
      status = tickLeaf(node, ctx, scope);
  }
  ctx.statuses.set(scope + node.path, status);
  return status;
}

/**
 * Stateful offline behavior-tree simulator. Each `tick()` advances the whole tree one
 * step, preserving RUNNING/memory state across ticks exactly like BehaviorTree.CPP.
 * Powers both signal-firing overlays and the trace-based testing pipeline.
 */
export class Simulator {
  private readonly ctx: TickContext;
  private readonly root: BtNode;
  private tickCount = 0;

  constructor(doc: BtDocument, options: SimulatorOptions = {}) {
    const trees = new Map<string, BtNode>();
    for (const tree of doc.trees) {
      if (tree.root && tree.id) {
        trees.set(tree.id, tree.root);
      }
    }
    const rootId = options.treeId ?? doc.mainTreeToExecute ?? doc.trees[0]?.id;
    const root = rootId ? trees.get(rootId) : undefined;
    if (!root) {
      throw new Error(`Simulator: tree "${rootId ?? '(none)'}" not found in document.`);
    }
    this.root = root;
    this.ctx = {
      outcome: options.outcome ?? alwaysSucceed,
      trees,
      blackboard: new Map(),
      state: new Map(),
      statuses: new Map(),
    };
  }

  /** Advance the tree by one tick and return the resulting statuses + blackboard. */
  tick(): TickResult {
    this.tickCount += 1;
    const rootStatus = tickNode(this.root, this.ctx, '');
    return {
      tick: this.tickCount,
      rootStatus,
      statuses: this.topScopeStatuses(),
      blackboard: Object.fromEntries(this.ctx.blackboard),
    };
  }

  /** Tick until the root completes (SUCCESS/FAILURE) or `maxTicks` is reached. */
  run(maxTicks = 1000): TickResult {
    let result = this.tick();
    while (result.rootStatus === 'RUNNING' && this.tickCount < maxTicks) {
      result = this.tick();
    }
    return result;
  }

  reset(): void {
    this.tickCount = 0;
    this.ctx.state.clear();
    this.ctx.statuses.clear();
    this.ctx.blackboard.clear();
  }

  private topScopeStatuses(): Record<string, NodeStatus> {
    const out: Record<string, NodeStatus> = {};
    for (const [key, status] of this.ctx.statuses) {
      if (!key.includes('/')) {
        out[key] = status;
      }
    }
    return out;
  }
}
