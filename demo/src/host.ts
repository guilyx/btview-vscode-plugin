/**
 * In-browser stand-in for the extension host (BtGraphController + DocumentSyncService).
 *
 * It uses the real, VS Code–agnostic domain code from src/btcpp — parser, include
 * merging, validation, edit operations, serializer, Simulator and verifier — and speaks
 * the real host ↔ webview protocol from src/shared/protocol.ts. Only the VS Code
 * specifics (TextDocument, WorkspaceEdit, file system, settings) are replaced by an
 * in-memory file map.
 */
import type { BtDocument, IncludeRef, NodeKind } from '../../src/btcpp/types';
import { parseDocument } from '../../src/btcpp/parser';
import { applyModelKinds, buildNodePalette, mergeModels } from '../../src/btcpp/nodeRegistry';
import { serializeDocument } from '../../src/btcpp/serializer';
import { validateDocument, type ValidationError } from '../../src/btcpp/validation';
import {
  addNode,
  changeNodeDefinition,
  deleteNode,
  editNodeAttribute,
  pasteSubtree,
  removeNodeAttribute,
  reparentNode,
  reorderChildren,
  type SubtreePayload,
} from '../../src/btcpp/editOperations';
import { addNodeModel, deleteNodeModel } from '../../src/btcpp/modelEditOperations';
import { Simulator } from '../../src/btcpp/exec/tick';
import { scriptedOutcomes, type OutcomeProvider } from '../../src/btcpp/exec/outcomes';
import { runScenario, type TraceRunResult, type TraceScenario } from '../../src/btcpp/exec/trace';
import { verifyTree, type VerifyResult } from '../../src/btcpp/verify/boundedCheck';
import {
  parseWebviewMessage,
  type HostToWebviewMessage,
  type SerializedDocument,
  type WebviewToHostMessage,
} from '../../src/shared/protocol';
import { dirname, joinPath } from './fixtures';

/** Same leaf model the extension uses: RUNNING on the first tick, SUCCESS afterwards. */
export const oneTickRunning: OutcomeProvider = (_node, ticks) =>
  ticks < 2 ? 'RUNNING' : 'SUCCESS';

/** Virtual ROS package share directories for `<include ros_pkg="…">` in the demo. */
const ROS_SHARES: Record<string, string> = {};

export interface DemoHostEvents {
  /** Posts a message into the webview iframe. */
  post(message: HostToWebviewMessage): void;
  /** XML text of the open file changed (edit, undo, redo, file switch). */
  onText?(path: string, text: string, previous: string | undefined): void;
  /** Webview asked to reveal the XML source (optionally a node path). */
  onRevealSource?(treeId: string, path?: string): void;
  /** Webview asked to open another file (include chip). */
  onOpenFile?(path: string): void;
  /** Informational notice (e.g. host-only features). */
  onNotice?(message: string, kind?: 'info' | 'error'): void;
  /** Simulation tick broadcast (for the demo status bar). */
  onTick?(update: Extract<HostToWebviewMessage, { type: 'tickUpdate' }>): void;
  /** Document (re)loaded. */
  onDocument?(doc: SerializedDocument): void;
}

type EditMessage = Extract<
  WebviewToHostMessage,
  {
    type:
      | 'editNode'
      | 'changeNodeType'
      | 'addNode'
      | 'deleteNode'
      | 'reparentNode'
      | 'reorderChildren'
      | 'pasteSubtree'
      | 'removePort'
      | 'addModel'
      | 'deleteModel';
  }
>;

const IDLE_TICK: Extract<HostToWebviewMessage, { type: 'tickUpdate' }> = {
  type: 'tickUpdate',
  tick: 0,
  rootStatus: 'IDLE',
  statuses: {},
  blackboard: {},
};

export class DemoHost {
  private readonly files: Map<string, string>;
  private currentPath = '';
  private doc: BtDocument | null = null;
  private validationErrors: ValidationError[] = [];
  private activeTreeId = 'MainTree';
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private layouts = new Map<string, Record<string, { x: number; y: number }>>();
  private sim: Simulator | null = null;
  private outcome: OutcomeProvider = oneTickRunning;
  private firstLoad = true;

  constructor(
    initialFiles: Record<string, string>,
    private readonly events: DemoHostEvents,
  ) {
    this.files = new Map(Object.entries(initialFiles));
  }

  get path(): string {
    return this.currentPath;
  }

  get text(): string {
    return this.files.get(this.currentPath) ?? '';
  }

  get treeId(): string {
    return this.activeTreeId;
  }

  get document(): BtDocument | null {
    return this.doc;
  }

  hasFile(path: string): boolean {
    return this.files.has(path);
  }

  /** Switch to another file. The webview iframe is expected to be reloaded by the caller. */
  open(path: string): void {
    if (!this.files.has(path)) {
      throw new Error(`Unknown demo file: ${path}`);
    }
    this.currentPath = path;
    this.undoStack = [];
    this.redoStack = [];
    this.layouts.clear();
    this.sim = null;
    this.firstLoad = true;
    this.doc = null;
    this.reparse();
    this.activeTreeId = this.doc!.mainTreeToExecute ?? this.doc!.trees[0]?.id ?? 'MainTree';
    this.events.onText?.(path, this.text, undefined);
  }

  /** Leaf outcome model for the simulator (scenario mocks fall back to the extension default). */
  setScenario(scenario: TraceScenario | null): void {
    this.outcome = scenario?.mocks
      ? scriptedOutcomes(scenario.mocks, oneTickRunning)
      : oneTickRunning;
    this.simReset();
  }

  verify(): VerifyResult[] {
    if (!this.doc) {
      return [];
    }
    return verifyTree(this.doc, { treeId: this.activeTreeId });
  }

  runTraces(scenarios: TraceScenario[]): TraceRunResult[] {
    if (!this.doc) {
      return [];
    }
    return scenarios.map((s) => runScenario(this.doc!, s));
  }

  /** Entry point for messages coming from the webview (mirrors BtGraphController.handleMessage). */
  handle(raw: unknown): void {
    const msg = parseWebviewMessage(raw);
    if (!msg) {
      return;
    }
    try {
      switch (msg.type) {
        case 'ready':
          this.refresh(true);
          break;
        case 'loaded':
          break;
        case 'selectTree':
          this.activeTreeId = msg.treeId;
          this.refresh(false);
          break;
        case 'editNode':
        case 'changeNodeType':
        case 'addNode':
        case 'deleteNode':
        case 'reparentNode':
        case 'reorderChildren':
        case 'pasteSubtree':
        case 'removePort':
        case 'addModel':
        case 'deleteModel': {
          const error = this.applyEdit(msg);
          if (error) {
            this.events.post({ type: 'validationError', message: error });
            this.events.onNotice?.(`BTView: ${error}`, 'error');
            return;
          }
          this.refresh(false);
          break;
        }
        case 'undo':
        case 'redo':
          if (this.undoRedo(msg.type)) {
            this.refresh(false);
          }
          break;
        case 'openSource':
        case 'openGraphSide':
          this.events.onRevealSource?.(this.activeTreeId);
          break;
        case 'goToSource':
          this.events.onRevealSource?.(this.activeTreeId, msg.path);
          break;
        case 'openInclude': {
          const target = msg.resolvedUri;
          if (target && this.files.has(target)) {
            this.events.onOpenFile?.(target);
          }
          break;
        }
        case 'exportWorkspaceConfig':
          this.events.onNotice?.(
            'Save types writes .btview/models.xml and btview.nodeTypeMap into your workspace — available in VS Code / Cursor.',
          );
          break;
        case 'saveLayout':
          this.layouts.set(msg.treeId, msg.positions);
          this.refresh(false);
          break;
        case 'resetLayout':
          this.layouts.delete(msg.treeId);
          this.refresh(false);
          break;
        case 'sim':
          if (msg.action === 'step') {
            this.simStep();
          } else {
            this.simReset();
          }
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.events.post({ type: 'error', message });
    }
  }

  simStep(): void {
    if (!this.doc) {
      return;
    }
    if (!this.sim) {
      try {
        this.sim = new Simulator(this.doc, { treeId: this.activeTreeId, outcome: this.outcome });
      } catch (err) {
        this.events.post({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
        return;
      }
    }
    const result = this.sim.tick();
    const update: Extract<HostToWebviewMessage, { type: 'tickUpdate' }> = {
      type: 'tickUpdate',
      tick: result.tick,
      rootStatus: result.rootStatus,
      statuses: result.statuses,
      blackboard: result.blackboard,
    };
    this.events.post(update);
    this.events.onTick?.(update);
  }

  simReset(): void {
    this.sim = null;
    this.events.post(IDLE_TICK);
    this.events.onTick?.(IDLE_TICK);
  }

  /** Re-parse the current file and push it to the webview (mirrors refreshUri). */
  refresh(forceLoad: boolean): void {
    if (this.sim) {
      this.simReset();
    }
    this.reparse();
    const payload = this.serialize();
    if (!payload) {
      return;
    }
    const type = forceLoad || this.firstLoad ? 'loadDocument' : 'documentChanged';
    this.firstLoad = false;
    this.events.post({ type, document: payload });
    this.events.onDocument?.(payload);
  }

  private reparse(): void {
    this.doc = this.loadWithIncludes(this.text, this.currentPath);
    this.validationErrors = validateDocument(this.doc);
  }

  /** Browser port of includeResolver.loadDocumentWithIncludes over the virtual file map. */
  private loadWithIncludes(text: string, filePath: string): BtDocument {
    const visited = new Set<string>();
    const load = (xml: string, file: string, depth: number): BtDocument => {
      const doc = parseDocument(xml, { sourceUri: file });
      if (depth >= 10) {
        doc.warnings.push('Maximum include depth reached.');
        return doc;
      }
      const resolved: IncludeRef[] = [];
      for (const incl of doc.includes) {
        let target: string | null = null;
        let error: string | undefined;
        if (incl.rosPkg) {
          const share = ROS_SHARES[incl.rosPkg];
          if (share) {
            target = joinPath(share, incl.path);
          } else {
            error = `ROS package "${incl.rosPkg}" not found. Source your workspace or set btview.rosPackageShareOverrides.`;
          }
        } else {
          target = joinPath(dirname(file), incl.path);
        }
        if (target && !this.files.has(target)) {
          error = `Include file not found: ${target}`;
          target = null;
        }
        resolved.push({ ...incl, resolvedUri: target ?? undefined, error });
        if (!target || visited.has(target)) {
          continue;
        }
        visited.add(target);
        const included = load(this.files.get(target)!, target, depth + 1);
        const existing = new Set(doc.trees.map((t) => t.id));
        for (const tree of included.trees) {
          if (!existing.has(tree.id)) {
            doc.trees.push({ ...tree, sourceUri: target });
            existing.add(tree.id);
          }
        }
        doc.models = mergeModels(doc.models, included.models);
        doc.warnings.push(...included.warnings);
      }
      doc.includes = resolved;
      return applyModelKinds(doc);
    };
    return load(text, filePath, 0);
  }

  /** Mirrors DocumentSyncService.serializeForWebview. */
  private serialize(): SerializedDocument | null {
    const doc = this.doc;
    if (!doc) {
      return null;
    }
    const errors = this.validationErrors;
    return {
      formatVersion: doc.formatVersion,
      mainTreeToExecute: doc.mainTreeToExecute,
      activeTreeId: this.activeTreeId,
      trees: doc.trees.map((t) => ({ id: t.id, root: t.root })),
      models: Array.from(doc.models.values()).map((m) => ({
        id: m.id,
        kind: m.kind,
        ports: m.ports,
      })),
      nodePalette: buildNodePalette(doc.formatVersion, {}).map((e) => ({ id: e.id, kind: e.kind })),
      includes: doc.includes.map((i) => ({
        path: i.path,
        rosPkg: i.rosPkg,
        resolvedUri: i.resolvedUri,
        error: i.error,
      })),
      warnings: doc.warnings,
      validationErrors: errors.length > 0 ? errors : undefined,
      layoutPositions: this.layouts.get(this.activeTreeId),
      showNodePorts: false,
      simpleMode: false,
    };
  }

  /** Mirrors DocumentSyncService.applyEdit; returns an error message on failure. */
  private applyEdit(edit: EditMessage): string | null {
    let doc = this.doc;
    if (!doc) {
      return 'Document not loaded.';
    }
    switch (edit.type) {
      case 'editNode':
        doc = editNodeAttribute(doc, edit.treeId, edit.path, edit.attr, edit.value);
        break;
      case 'changeNodeType': {
        const result = changeNodeDefinition(
          doc,
          edit.treeId,
          edit.path,
          edit.kind as NodeKind,
          edit.registeredId,
        );
        if (!result.success) {
          return result.error?.message ?? 'Edit failed';
        }
        doc = result.document;
        break;
      }
      case 'addNode':
        doc = addNode(doc, edit.treeId, edit.parentPath, edit.registeredId, edit.kind as NodeKind);
        break;
      case 'deleteNode':
        doc = deleteNode(doc, edit.treeId, edit.path);
        break;
      case 'reparentNode': {
        const result = reparentNode(doc, edit.treeId, edit.sourcePath, edit.targetPath, edit.index);
        if (!result.success) {
          return result.error?.message ?? 'Edit failed';
        }
        doc = result.document;
        break;
      }
      case 'reorderChildren':
        doc = reorderChildren(doc, edit.treeId, edit.parentPath, edit.order);
        break;
      case 'pasteSubtree':
        doc = pasteSubtree(doc, edit.treeId, edit.parentPath, {
          kind: edit.subtree.kind as NodeKind,
          registeredId: edit.subtree.registeredId,
          instanceName: edit.subtree.instanceName,
          attributes: edit.subtree.attributes,
          children: edit.subtree.children as SubtreePayload[] | undefined,
        });
        break;
      case 'removePort':
        doc = removeNodeAttribute(doc, edit.treeId, edit.path, edit.attr);
        break;
      case 'addModel': {
        const result = addNodeModel(doc, edit.id, edit.kind as NodeKind);
        if (!result.success) {
          return result.error?.message ?? 'Edit failed';
        }
        doc = result.document!;
        break;
      }
      case 'deleteModel':
        doc = deleteNodeModel(doc, edit.modelId);
        break;
    }
    this.writeText(serializeDocument(doc), true);
    return null;
  }

  private undoRedo(kind: 'undo' | 'redo'): boolean {
    const from = kind === 'undo' ? this.undoStack : this.redoStack;
    const to = kind === 'undo' ? this.redoStack : this.undoStack;
    const next = from.pop();
    if (next === undefined) {
      this.events.post({
        type: 'validationError',
        message: kind === 'undo' ? 'Nothing to undo.' : 'Nothing to redo.',
      });
      return false;
    }
    to.push(this.text);
    this.writeText(next, false);
    return true;
  }

  private writeText(text: string, recordUndo: boolean): void {
    const previous = this.text;
    if (recordUndo) {
      this.undoStack.push(previous);
      this.redoStack = [];
    }
    this.files.set(this.currentPath, text);
    this.events.onText?.(this.currentPath, text, previous);
  }
}
