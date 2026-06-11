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
import { getRosConfig, getDefaultFormatVersion } from '../config/settings';

export interface WebviewDocumentPayload {
  type: 'loadDocument' | 'documentChanged';
  document: SerializedDocument;
}

export interface SerializedDocument {
  formatVersion: 3 | 4;
  mainTreeToExecute?: string;
  activeTreeId: string;
  trees: { id: string; root: unknown }[];
  models: { id: string; kind: string; ports: unknown[] }[];
  includes: { path: string; rosPkg?: string; resolvedUri?: string; error?: string }[];
  warnings: string[];
}

export class DocumentSyncService {
  private documents = new Map<string, BtDocument>();
  private activeTreeIds = new Map<string, string>();

  async loadFromFile(uri: vscode.Uri): Promise<BtDocument> {
    const text = await vscode.workspace.fs.readFile(uri);
    const xmlText = Buffer.from(text).toString('utf8');
    const rosConfig = getRosConfig();
    rosConfig.workspaceFolders = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);

    const doc = await loadDocumentWithIncludes(xmlText, uri.fsPath, {
      defaultFormatVersion: getDefaultFormatVersion(),
      rosConfig,
    });

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
    };
  }

  async applyEdit(
    uri: vscode.Uri,
    edit:
      | { type: 'editNode'; treeId: string; path: string; attr: string; value: string }
      | { type: 'addNode'; treeId: string; parentPath: string; registeredId: string; kind: string }
      | { type: 'deleteNode'; treeId: string; path: string }
      | {
          type: 'reparentNode';
          treeId: string;
          sourcePath: string;
          targetPath: string;
          index?: number;
        }
      | { type: 'reorderChildren'; treeId: string; parentPath: string; order: string[] },
  ): Promise<void> {
    let doc = this.documents.get(uri.toString());
    if (!doc) {
      return;
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
      case 'reparentNode':
        doc = reparentNode(doc, edit.treeId, edit.sourcePath, edit.targetPath, edit.index);
        break;
      case 'reorderChildren':
        doc = reorderChildren(doc, edit.treeId, edit.parentPath, edit.order);
        break;
    }

    this.documents.set(uri.toString(), doc);

    const xml = serializeDocument(doc);
    const editBuilder = new vscode.WorkspaceEdit();
    const fullRange = await this.getFullRange(uri);
    editBuilder.replace(uri, fullRange, xml);
    await vscode.workspace.applyEdit(editBuilder);
  }

  private async getFullRange(uri: vscode.Uri): Promise<vscode.Range> {
    const doc = await vscode.workspace.openTextDocument(uri);
    return new vscode.Range(0, 0, doc.lineCount, 0);
  }

  clear(uri: vscode.Uri): void {
    this.documents.delete(uri.toString());
    this.activeTreeIds.delete(uri.toString());
  }
}
