import type { BtDocument, BtNode, FormatVersion } from './types';
import { isV4OnlyNode } from './nodeRegistry';

export interface ValidationError {
  path: string;
  message: string;
}

export function validateNodeChildren(node: BtNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const childCount = node.children.length;

  if (node.kind === 'decorator' || node.kind === 'subtree') {
    if (childCount > 1) {
      errors.push({
        path: node.path,
        message: `${node.registeredId} allows at most 1 child, found ${childCount}.`,
      });
    }
  } else if (node.kind === 'action' || node.kind === 'condition' || node.kind === 'script') {
    if (childCount > 0) {
      errors.push({
        path: node.path,
        message: `${node.registeredId} must not have children.`,
      });
    }
  }

  for (const child of node.children) {
    errors.push(...validateNodeChildren(child));
  }

  return errors;
}

export function validateV4OnlyOnV3(node: BtNode, formatVersion: FormatVersion): ValidationError[] {
  const errors: ValidationError[] = [];
  if (formatVersion === 3 && isV4OnlyNode(node.registeredId)) {
    errors.push({
      path: node.path,
      message: `"${node.registeredId}" is only available in BTCpp v4.`,
    });
  }
  for (const child of node.children) {
    errors.push(...validateV4OnlyOnV3(child, formatVersion));
  }
  return errors;
}

export function validateReparent(parent: BtNode, child: BtNode): ValidationError | null {
  if (parent.path === child.path || child.path.startsWith(parent.path + '-')) {
    return { path: child.path, message: 'Cannot reparent a node into its own descendant.' };
  }

  if (parent.kind === 'action' || parent.kind === 'condition' || parent.kind === 'script') {
    return { path: parent.path, message: 'Leaf nodes cannot have children.' };
  }

  if ((parent.kind === 'decorator' || parent.kind === 'subtree') && parent.children.length >= 1) {
    return { path: parent.path, message: 'Decorator/SubTree nodes allow only one child.' };
  }

  return null;
}

export function validateDocument(doc: BtDocument): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const tree of doc.trees) {
    if (tree.root) {
      errors.push(...validateNodeChildren(tree.root));
      errors.push(...validateV4OnlyOnV3(tree.root, doc.formatVersion));
      errors.push(...validateNodePorts(tree.root, doc.models));
    }
  }
  errors.push(...validateUniqueTreeIds(doc));
  errors.push(...validateMainTree(doc));
  errors.push(...validateSubtreeReferences(doc));
  errors.push(...validateSubtreeCycles(doc));
  return errors;
}

/** Depth-first walk of a node and all descendants. */
function walkNodes(node: BtNode, visit: (n: BtNode) => void): void {
  visit(node);
  for (const child of node.children) {
    walkNodes(child, visit);
  }
}

/** Set of BehaviorTree IDs actually defined in the document. */
function definedTreeIds(doc: BtDocument): Set<string> {
  return new Set(doc.trees.map((t) => t.id).filter((id) => id.length > 0));
}

/**
 * A subtree node's target tree ID lives in `registeredId` for `<SubTree ID="X"/>`.
 * The generic literals `SubTree`/`SubTreePlus` mean no concrete target was captured.
 * ponytail: SubTreePlus drops its `ID` at parse time (xmlUtils.parseNodeElement), so its
 * reference cannot be verified — we skip it rather than emit a false positive.
 */
function subtreeTarget(node: BtNode): { target: string | null; missingId: boolean } {
  if (node.kind !== 'subtree') {
    return { target: null, missingId: false };
  }
  const id = node.registeredId;
  if (id === 'SubTree') {
    // Genuine `<SubTree/>` without an ID (legacyTag is only set for SubTreePlus).
    return { target: null, missingId: node.legacyTag === undefined };
  }
  if (id === 'SubTreePlus') {
    return { target: null, missingId: false };
  }
  return { target: id, missingId: false };
}

/** Duplicate `<BehaviorTree ID>` declarations make tree references ambiguous. */
export function validateUniqueTreeIds(doc: BtDocument): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  for (const tree of doc.trees) {
    if (!tree.id) {
      continue;
    }
    if (seen.has(tree.id)) {
      errors.push({
        path: tree.root?.path ?? '0',
        message: `Duplicate BehaviorTree ID "${tree.id}".`,
      });
    }
    seen.add(tree.id);
  }
  return errors;
}

/** `main_tree_to_execute` must name a tree that exists in the document. */
export function validateMainTree(doc: BtDocument): ValidationError[] {
  const main = doc.mainTreeToExecute;
  if (!main) {
    return [];
  }
  if (!definedTreeIds(doc).has(main)) {
    return [
      {
        path: doc.trees[0]?.root?.path ?? '0',
        message: `main_tree_to_execute "${main}" does not match any BehaviorTree in this file.`,
      },
    ];
  }
  return [];
}

/** Every `<SubTree ID>` must resolve to a defined tree, and must declare an ID. */
export function validateSubtreeReferences(doc: BtDocument): ValidationError[] {
  const errors: ValidationError[] = [];
  const defined = definedTreeIds(doc);
  for (const tree of doc.trees) {
    if (!tree.root) {
      continue;
    }
    walkNodes(tree.root, (node) => {
      const { target, missingId } = subtreeTarget(node);
      if (missingId) {
        errors.push({ path: node.path, message: 'SubTree node is missing a target tree ID.' });
      } else if (target && !defined.has(target)) {
        errors.push({
          path: node.path,
          message: `SubTree references undefined tree "${target}".`,
        });
      }
    });
  }
  return errors;
}

/**
 * Detect cycles in the subtree reference graph (a tree that transitively includes
 * itself would recurse forever at runtime). Naive DFS over the tree-id graph.
 * ponytail: O(V*E) with a per-DFS stack; fine for the handful of trees in a file.
 */
export function validateSubtreeCycles(doc: BtDocument): ValidationError[] {
  const defined = definedTreeIds(doc);
  // Edges: treeId -> [{ target, path }] for concrete, resolvable subtree references.
  const edges = new Map<string, { target: string; path: string }[]>();
  for (const tree of doc.trees) {
    if (!tree.root || !tree.id) {
      continue;
    }
    const out: { target: string; path: string }[] = [];
    walkNodes(tree.root, (node) => {
      const { target } = subtreeTarget(node);
      if (target && defined.has(target)) {
        out.push({ target, path: node.path });
      }
    });
    edges.set(tree.id, out);
  }

  const errors: ValidationError[] = [];
  const reported = new Set<string>();
  const stack = new Set<string>();

  const dfs = (treeId: string): void => {
    stack.add(treeId);
    for (const edge of edges.get(treeId) ?? []) {
      if (stack.has(edge.target)) {
        const key = `${treeId}->${edge.target}`;
        if (!reported.has(key)) {
          reported.add(key);
          errors.push({
            path: edge.path,
            message: `SubTree "${edge.target}" forms a recursive cycle (would tick forever).`,
          });
        }
        continue;
      }
      dfs(edge.target);
    }
    stack.delete(treeId);
  };

  for (const treeId of edges.keys()) {
    dfs(treeId);
  }
  return errors;
}

export function validateNodePorts(node: BtNode, models: BtDocument['models']): ValidationError[] {
  const errors: ValidationError[] = [];
  const model = models.get(node.registeredId);
  const modelPortNames = new Set(model?.ports.map((p) => p.name) ?? []);

  if (model) {
    // A port with no default that is never bound is a construction-time error in
    // BehaviorTree.CPP. Only input/inout ports are "required" this way; unset output
    // ports are legal (the node may write internally).
    for (const port of model.ports) {
      const required = port.direction === 'input' || port.direction === 'inout';
      if (required && port.defaultValue === undefined && !(port.name in node.attributes)) {
        errors.push({
          path: node.path,
          message: `Required ${port.direction} port "${port.name}" is missing on ${node.registeredId}.`,
        });
      }
    }
  }

  for (const attr of Object.keys(node.attributes)) {
    if (model && !modelPortNames.has(attr)) {
      errors.push({
        path: node.path,
        message: `Unknown port attribute "${attr}" on ${node.registeredId}.`,
      });
    }
  }

  for (const child of node.children) {
    errors.push(...validateNodePorts(child, models));
  }

  return errors;
}
