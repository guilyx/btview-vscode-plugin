import type * as vscode from 'vscode';
import type { BtDocument } from '../btcpp/types';

function cloneDoc(doc: BtDocument): BtDocument {
  return structuredClone(doc);
}

export class EditStack {
  private undoStacks = new Map<string, BtDocument[]>();
  private redoStacks = new Map<string, BtDocument[]>();
  private readonly maxDepth = 50;

  pushBeforeEdit(uri: string, doc: BtDocument): void {
    const key = uri.toString();
    const stack = this.undoStacks.get(key) ?? [];
    stack.push(cloneDoc(doc));
    if (stack.length > this.maxDepth) {
      stack.shift();
    }
    this.undoStacks.set(key, stack);
    this.redoStacks.set(key, []);
  }

  undo(uri: vscode.Uri, current: BtDocument): BtDocument | null {
    const key = uri.toString();
    const undoStack = this.undoStacks.get(key);
    if (!undoStack?.length) {
      return null;
    }
    const previous = undoStack.pop()!;
    const redoStack = this.redoStacks.get(key) ?? [];
    redoStack.push(cloneDoc(current));
    this.redoStacks.set(key, redoStack);
    return previous;
  }

  redo(uri: vscode.Uri, current: BtDocument): BtDocument | null {
    const key = uri.toString();
    const redoStack = this.redoStacks.get(key);
    if (!redoStack?.length) {
      return null;
    }
    const next = redoStack.pop()!;
    const undoStack = this.undoStacks.get(key) ?? [];
    undoStack.push(cloneDoc(current));
    this.undoStacks.set(key, undoStack);
    return next;
  }

  clear(uri: vscode.Uri): void {
    const key = uri.toString();
    this.undoStacks.delete(key);
    this.redoStacks.delete(key);
  }

  discardLastUndo(uri: string): void {
    const stack = this.undoStacks.get(uri);
    if (stack?.length) {
      stack.pop();
    }
  }
}
