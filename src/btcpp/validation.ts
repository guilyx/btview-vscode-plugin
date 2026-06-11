import type { BtNode, FormatVersion } from './types';
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
