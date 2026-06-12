import * as vscode from 'vscode';
import type { BtDocument } from '../btcpp/types';
import { loadDocumentWithIncludes } from '../btcpp/includeResolver';
import { serializeDocument } from '../btcpp/serializer';
import {
  addNode,
  deleteNode,
  editNodeAttribute,
  reparentNode,
  reorderChildren,
} from '../btcpp/editOperations';
import { validateDocument, type ValidationError } from '../btcpp/validation';
import { getRosConfig, getDefaultFormatVersion } from '../config/settings';
import type { SerializedDocument, WebviewToHostMessage } from '../shared/protocol';
import { logInfo } from '../logging/outputChannel';

export type { SerializedDocument };

export interface ApplyEditResult {
  success: boolean;
  error?: ValidationError;
}

export class DocumentSyncService {
  private documents = new Map<string, BtDocument>();
  private activeTreeIds = new Map<string, string>();
  private validationErrors = new Map<string, ValidationError[]>();

  async loadFromFile(uri: vscode.Uri): Promise<BtDocument> {
    const text = await vscode.workspace.fs.readFile(uri);
    const xmlText = Buffer.from(text).toString('utf8');
    const rosConfig = getRosConfig();
    rosConfig.workspaceFolders = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);

    const doc = await loadDocumentWithIncludes(xmlText, uri.fsPath, {
      defaultFormatVersion: getDefaultFormatVersion(),
      rosConfig,
    });

    const errors = validateDocument(doc);
    this.validationErrors.set(uri.toString(), errors);
    if (errors.length > 0) {
      logInfo(`Validation: ${errors.length} issue(s) in ${uri.fsPath}`);
    }

    this.documents.set(uri.toString(), doc);

    const defaultTree = doc.mainTreeToExecute ?? doc.trees[0]?.id ?? 'MainTree';
    if (!this.activeTreeIds.has(uri.toString())) {
      this.activeTreeIds.set(uri.toString(), defaultTree);
    }

    return doc;
  }

  getDocument(uri: vscode.Uri): BtDocument | undefined {
    return this.documents.get(uri.toString());
  }

  getValidationErrors(uri: vscode.Uri): ValidationError[] {
    return this.validationErrors.get(uri.toString()) ?? [];
  }

  getActiveTreeId(uri: vscode.Uri): string {
    return this.activeTreeIds.get(uri.toString()) ?? 'MainTree';
  }

  setActiveTreeId(uri: vscode.Uri, treeId: string): void {
    this.activeTreeIds.set(uri.toString(), treeId);
  }

  serializeForWebview(uri: vscode.Uri): SerializedDocument | null {
    const doc = this.documents.get(uri.toString());
    if (!doc) {
      return null;
    }

    const errors = this.validationErrors.get(uri.toString()) ?? [];

    return {
      formatVersion: doc.formatVersion,
      mainTreeToExecute: doc.mainTreeToExecute,
      activeTreeId: this.getActiveTreeId(uri),
      trees: doc.trees.map((t) => ({ id: t.id, root: t.root })),
      models: Array.from(doc.models.values()).map((m) => ({
        id: m.id,
        kind: m.kind,
        ports: m.ports,
      })),
      includes: doc.includes.map((i) => ({
        path: i.path,
        rosPkg: i.rosPkg,
        resolvedUri: i.resolvedUri,
        error: i.error,
      })),
      warnings: doc.warnings,
      validationErrors: errors.length > 0 ? errors : undefined,
    };
  }

  async applyEdit(uri: vscode.Uri, edit: Exclude<WebviewToHostMessage, { type: 'ready' | 'openInclude' | 'selectTree' }>): Promise<ApplyEditResult> {
    let doc = this.documents.get(uri.toString());
    if (!doc) {
      return { success: false, error: { path: '', message: 'Document not loaded.' } };
    }

    switch (edit.type) {
      case 'editNode':
        doc = editNodeAttribute(doc, edit.treeId, edit.path, edit.attr, edit.value);
        break;
      case 'addNode':
        doc = addNode(
          doc,
          edit.treeId,
          edit.parentPath,
          edit.registeredId,
          edit.kind as import('../btcpp/types').NodeKind,
        );
        break;
      case 'deleteNode':
        doc = deleteNode(doc, edit.treeId, edit.path);
        break;
      case 'reparentNode': {
        const result = reparentNode(
          doc,
          edit.treeId,
          edit.sourcePath,
          edit.targetPath,
          edit.index,
        );
        if (!result.success) {
          return { success: false, error: result.error };
        }
        doc = result.document;
        break;
      }
      case 'reorderChildren':
        doc = reorderChildren(doc, edit.treeId, edit.parentPath, edit.order);
        break;
    }

    this.documents.set(uri.toString(), doc);
    this.validationErrors.set(uri.toString(), validateDocument(doc));

    const xml = serializeDocument(doc);
    const editBuilder = new vscode.WorkspaceEdit();
    const fullRange = await this.getFullRange(uri);
    editBuilder.replace(uri, fullRange, xml);
    await vscode.workspace.applyEdit(editBuilder);

    return { success: true };
  }

  private async getFullRange(uri: vscode.Uri): Promise<vscode.Range> {
    const doc = await vscode.workspace.openTextDocument(uri);
    return new vscode.Range(0, 0, doc.lineCount, 0);
  }

  clear(uri: vscode.Uri): void {
    this.documents.delete(uri.toString());
    this.activeTreeIds.delete(uri.toString());
    this.validationErrors.delete(uri.toString());
  }
}
