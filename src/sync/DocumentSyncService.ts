import * as vscode from 'vscode';
import type { BtDocument } from '../btcpp/types';
import { loadDocumentWithIncludes } from '../btcpp/includeResolver';
import { serializeDocument } from '../btcpp/serializer';
import {
  addNode,
  changeNodeDefinition,
  deleteNode,
  editNodeAttribute,
  pasteSubtree,
  removeNodeAttribute,
  reparentNode,
  reorderChildren,
} from '../btcpp/editOperations';
import { validateDocument, type ValidationError } from '../btcpp/validation';
import { addNodeModel, deleteNodeModel } from '../btcpp/modelEditOperations';
import { buildNodePalette } from '../btcpp/nodeRegistry';
import { getRosConfig, getDefaultFormatVersion, getNodeTypeMap } from '../config/settings';
import type { SerializedDocument, WebviewToHostMessage } from '../shared/protocol';
import { logInfo } from '../logging/outputChannel';
import { EditStack } from './EditStack';
import { clearLayout, getLayoutForTree, loadLayout, saveLayout } from '../layout/LayoutStore';

export type { SerializedDocument };

export interface ApplyEditResult {
  success: boolean;
  error?: ValidationError;
}

export class DocumentSyncService {
  private documents = new Map<string, BtDocument>();
  private activeTreeIds = new Map<string, string>();
  private validationErrors = new Map<string, ValidationError[]>();
  private readonly editStack = new EditStack();

  private workspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  async loadFromFile(uri: vscode.Uri): Promise<BtDocument> {
    const document = await vscode.workspace.openTextDocument(uri);
    return this.loadFromText(document.getText(), uri);
  }

  async loadFromText(xmlText: string, uri: vscode.Uri): Promise<BtDocument> {
    const rosConfig = getRosConfig();
    rosConfig.workspaceFolders = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);

    const doc = await loadDocumentWithIncludes(xmlText, uri.fsPath, {
      defaultFormatVersion: getDefaultFormatVersion(),
      rosConfig,
      nodeTypeMap: getNodeTypeMap(),
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

    const nodeTypeMap = getNodeTypeMap();
    const activeTreeId = this.getActiveTreeId(uri);
    const layoutPositions = getLayoutForTree(uri.fsPath, activeTreeId, this.workspaceRoot());
    const showNodePorts = vscode.workspace.getConfiguration('btview').get<boolean>('showNodePorts');
    const simpleMode = vscode.workspace.getConfiguration('btview').get<boolean>('simpleMode');

    return {
      formatVersion: doc.formatVersion,
      mainTreeToExecute: doc.mainTreeToExecute,
      activeTreeId,
      trees: doc.trees.map((t) => ({ id: t.id, root: t.root })),
      models: Array.from(doc.models.values()).map((m) => ({
        id: m.id,
        kind: m.kind,
        ports: m.ports,
      })),
      nodePalette: buildNodePalette(doc.formatVersion, nodeTypeMap).map((e) => ({
        id: e.id,
        kind: e.kind,
      })),
      includes: doc.includes.map((i) => ({
        path: i.path,
        rosPkg: i.rosPkg,
        resolvedUri: i.resolvedUri,
        error: i.error,
      })),
      warnings: doc.warnings,
      validationErrors: errors.length > 0 ? errors : undefined,
      layoutPositions,
      showNodePorts,
      simpleMode,
    };
  }

  async undo(uri: vscode.Uri): Promise<ApplyEditResult> {
    const doc = this.documents.get(uri.toString());
    if (!doc) {
      return { success: false, error: { path: '', message: 'Document not loaded.' } };
    }
    const previous = this.editStack.undo(uri, doc);
    if (!previous) {
      return { success: false, error: { path: '', message: 'Nothing to undo.' } };
    }
    return this.applyDocumentState(uri, previous);
  }

  async redo(uri: vscode.Uri): Promise<ApplyEditResult> {
    const doc = this.documents.get(uri.toString());
    if (!doc) {
      return { success: false, error: { path: '', message: 'Document not loaded.' } };
    }
    const next = this.editStack.redo(uri, doc);
    if (!next) {
      return { success: false, error: { path: '', message: 'Nothing to redo.' } };
    }
    return this.applyDocumentState(uri, next);
  }

  private async applyDocumentState(uri: vscode.Uri, doc: BtDocument): Promise<ApplyEditResult> {
    this.documents.set(uri.toString(), doc);
    this.validationErrors.set(uri.toString(), validateDocument(doc));
    const xml = serializeDocument(doc);
    const editBuilder = new vscode.WorkspaceEdit();
    const fullRange = await this.getFullRange(uri);
    editBuilder.replace(uri, fullRange, xml);
    await vscode.workspace.applyEdit(editBuilder);
    return { success: true };
  }

  saveLayoutPositions(
    uri: vscode.Uri,
    treeId: string,
    positions: Record<string, { x: number; y: number }>,
  ): void {
    const root = this.workspaceRoot();
    if (!root) {
      return;
    }
    const existing = loadLayout(uri.fsPath, root) ?? { trees: {} };
    existing.trees[treeId] = positions;
    saveLayout(uri.fsPath, root, existing);
  }

  resetLayout(uri: vscode.Uri, treeId: string): void {
    const root = this.workspaceRoot();
    if (!root) {
      return;
    }
    const existing = loadLayout(uri.fsPath, root);
    if (!existing) {
      return;
    }
    delete existing.trees[treeId];
    if (Object.keys(existing.trees).length === 0) {
      clearLayout(uri.fsPath, root);
    } else {
      saveLayout(uri.fsPath, root, existing);
    }
  }

  async applyEdit(
    uri: vscode.Uri,
    edit: Exclude<
      WebviewToHostMessage,
      {
        type:
          | 'ready'
          | 'loaded'
          | 'openInclude'
          | 'selectTree'
          | 'openSource'
          | 'openGraphSide'
          | 'undo'
          | 'redo'
          | 'goToSource'
          | 'exportWorkspaceConfig'
          | 'saveLayout'
          | 'resetLayout';
      }
    >,
  ): Promise<ApplyEditResult> {
    let doc = this.documents.get(uri.toString());
    if (!doc) {
      return { success: false, error: { path: '', message: 'Document not loaded.' } };
    }

    this.editStack.pushBeforeEdit(uri.toString(), doc);

    switch (edit.type) {
      case 'editNode':
        doc = editNodeAttribute(doc, edit.treeId, edit.path, edit.attr, edit.value);
        break;
      case 'changeNodeType': {
        const result = changeNodeDefinition(
          doc,
          edit.treeId,
          edit.path,
          edit.kind as import('../btcpp/types').NodeKind,
          edit.registeredId,
        );
        if (!result.success) {
          this.editStack.discardLastUndo(uri.toString());
          return { success: false, error: result.error };
        }
        doc = result.document;
        break;
      }
      case 'addNode': {
        const nodeTypeMap = getNodeTypeMap();
        const kind =
          nodeTypeMap[edit.registeredId] ?? (edit.kind as import('../btcpp/types').NodeKind);
        doc = addNode(doc, edit.treeId, edit.parentPath, edit.registeredId, kind);
        break;
      }
      case 'deleteNode':
        doc = deleteNode(doc, edit.treeId, edit.path);
        break;
      case 'reparentNode': {
        const result = reparentNode(doc, edit.treeId, edit.sourcePath, edit.targetPath, edit.index);
        if (!result.success) {
          this.editStack.discardLastUndo(uri.toString());
          return { success: false, error: result.error };
        }
        doc = result.document;
        break;
      }
      case 'reorderChildren':
        doc = reorderChildren(doc, edit.treeId, edit.parentPath, edit.order);
        break;
      case 'pasteSubtree':
        doc = pasteSubtree(doc, edit.treeId, edit.parentPath, {
          kind: edit.subtree.kind as import('../btcpp/types').NodeKind,
          registeredId: edit.subtree.registeredId,
          instanceName: edit.subtree.instanceName,
          attributes: edit.subtree.attributes,
          children: edit.subtree.children as
            | import('../btcpp/editOperations').SubtreePayload[]
            | undefined,
        });
        break;
      case 'removePort':
        doc = removeNodeAttribute(doc, edit.treeId, edit.path, edit.attr);
        break;
      case 'addModel': {
        const result = addNodeModel(doc, edit.id, edit.kind as import('../btcpp/types').NodeKind);
        if (!result.success) {
          this.editStack.discardLastUndo(uri.toString());
          return { success: false, error: result.error };
        }
        doc = result.document!;
        break;
      }
      case 'deleteModel':
        doc = deleteNodeModel(doc, edit.modelId);
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
    this.editStack.clear(uri);
  }
}
