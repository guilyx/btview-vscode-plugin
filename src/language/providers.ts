import * as path from 'path';
import * as vscode from 'vscode';
import {
  getCustomModelsInclude,
  getDefaultFormatVersion,
  getNodeTypeMap,
  getRosConfig,
  isLanguageFeaturesEnabled,
} from '../config/settings';
import { BtIndex, EMPTY_EXTERNALS, isBtDocumentText, type SourceLocation } from './btIndex';
import { getCompletions, type BtCompletionKind } from './completion';
import { clearExternalFileCache, loadExternalDefinitions } from './externals';
import { getHover } from './hover';
import { getDefinition, getReferences, getRenameEdits, prepareRename } from './navigation';
import { getCodeLensInfo, getDocumentSymbols, type BtDocumentSymbol } from './symbols';
import type { ExternalDefinitions } from './btIndex';

export const OPEN_TREE_IN_GRAPH_COMMAND = 'btview.openTreeInGraph';

const SELECTOR: vscode.DocumentSelector = [
  { language: 'xml', scheme: 'file' },
  { language: 'xml', scheme: 'untitled' },
];

/** How long a request waits for include resolution before answering with local data only. */
const EXTERNALS_TIMEOUT_MS = 1500;

interface CacheEntry {
  version: number;
  isBt: boolean;
  externals?: Promise<ExternalDefinitions>;
  index?: BtIndex;
}

/** Per-document (uri + version) cache of the BT index and resolved includes. */
export class BtLanguageCache {
  private readonly entries = new Map<string, CacheEntry>();

  async get(document: vscode.TextDocument): Promise<BtIndex | undefined> {
    if (!isLanguageFeaturesEnabled() || document.languageId !== 'xml') {
      return undefined;
    }
    const key = document.uri.toString();
    let entry = this.entries.get(key);
    if (!entry || entry.version !== document.version) {
      const text = document.getText();
      const isBt = isBtDocumentText(text, document.fileName);
      entry = { version: document.version, isBt };
      if (isBt) {
        entry.externals = this.loadExternals(document, text);
      }
      this.entries.set(key, entry);
    }
    if (!entry.isBt) {
      return undefined;
    }
    if (entry.index) {
      return entry.index;
    }

    const current = entry;
    const timeout = new Promise<undefined>((resolve) =>
      setTimeout(() => resolve(undefined), EXTERNALS_TIMEOUT_MS),
    );
    const externals = await Promise.race([current.externals!, timeout]);
    const index = new BtIndex(document.getText(), {
      defaultFormatVersion: getDefaultFormatVersion(),
      fileName: document.fileName,
      externals: externals ?? { ...EMPTY_EXTERNALS, nodeTypeMap: getNodeTypeMap() },
    });
    if (externals && this.entries.get(key) === current) {
      current.index = index;
    }
    return index;
  }

  private async loadExternals(
    document: vscode.TextDocument,
    text: string,
  ): Promise<ExternalDefinitions> {
    const nodeTypeMap = getNodeTypeMap();
    try {
      const rosConfig = getRosConfig();
      rosConfig.workspaceFolders = (vscode.workspace.workspaceFolders ?? []).map(
        (f) => f.uri.fsPath,
      );
      const folder =
        vscode.workspace.getWorkspaceFolder(document.uri) ?? vscode.workspace.workspaceFolders?.[0];
      const workspaceModelsPath = folder
        ? path.join(folder.uri.fsPath, getCustomModelsInclude(folder.uri))
        : undefined;
      return await loadExternalDefinitions(
        text,
        document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
        { rosConfig, nodeTypeMap, workspaceModelsPath },
      );
    } catch {
      return { ...EMPTY_EXTERNALS, nodeTypeMap };
    }
  }

  delete(uri: vscode.Uri): void {
    this.entries.delete(uri.toString());
  }

  clear(): void {
    this.entries.clear();
    clearExternalFileCache();
  }
}

function toRange(document: vscode.TextDocument, start: number, end: number): vscode.Range {
  return new vscode.Range(document.positionAt(start), document.positionAt(end));
}

function toLocation(document: vscode.TextDocument, loc: SourceLocation): vscode.Location {
  if (!loc.uri) {
    return new vscode.Location(document.uri, toRange(document, loc.start, loc.end));
  }
  const start = loc.startPos ?? { line: 0, character: 0 };
  const end = loc.endPos ?? start;
  return new vscode.Location(
    vscode.Uri.file(loc.uri),
    new vscode.Range(start.line, start.character, end.line, end.character),
  );
}

const COMPLETION_KINDS: Record<BtCompletionKind, vscode.CompletionItemKind> = {
  node: vscode.CompletionItemKind.Class,
  element: vscode.CompletionItemKind.Module,
  attribute: vscode.CompletionItemKind.Property,
  port: vscode.CompletionItemKind.Field,
  value: vscode.CompletionItemKind.Value,
  tree: vscode.CompletionItemKind.Reference,
  blackboard: vscode.CompletionItemKind.Variable,
  keyword: vscode.CompletionItemKind.Keyword,
};

const SYMBOL_KINDS: Record<BtDocumentSymbol['kind'], vscode.SymbolKind> = {
  tree: vscode.SymbolKind.Class,
  node: vscode.SymbolKind.Object,
  models: vscode.SymbolKind.Namespace,
  model: vscode.SymbolKind.Interface,
  include: vscode.SymbolKind.File,
};

function toDocumentSymbol(
  document: vscode.TextDocument,
  sym: BtDocumentSymbol,
): vscode.DocumentSymbol {
  const range = toRange(document, sym.start, sym.end);
  let selection = toRange(document, sym.selectionStart, sym.selectionEnd);
  if (!range.contains(selection)) {
    selection = new vscode.Range(range.start, range.start);
  }
  const out = new vscode.DocumentSymbol(
    sym.name,
    sym.detail ?? '',
    SYMBOL_KINDS[sym.kind],
    range,
    selection,
  );
  out.children = sym.children.map((c) => toDocumentSymbol(document, c));
  return out;
}

class BtCodeLensProvider implements vscode.CodeLensProvider {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changed.event;

  constructor(private readonly cache: BtLanguageCache) {}

  refresh(): void {
    this.changed.fire();
  }

  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const index = await this.cache.get(document);
    if (!index) {
      return [];
    }
    const lenses: vscode.CodeLens[] = [];
    for (const info of getCodeLensInfo(index)) {
      const range = toRange(document, info.start, info.start);
      lenses.push(
        new vscode.CodeLens(range, {
          title: 'Open in BT Graph',
          command: OPEN_TREE_IN_GRAPH_COMMAND,
          arguments: [document.uri, info.treeId],
        }),
      );
      const nodes = `${info.nodeCount} node${info.nodeCount === 1 ? '' : 's'}${info.isMain ? ' · main tree' : ''}`;
      lenses.push(new vscode.CodeLens(range, { title: nodes, command: '' }));
      const refs = info.references.length;
      if (refs > 0) {
        lenses.push(
          new vscode.CodeLens(range, {
            title: `${refs} SubTree reference${refs === 1 ? '' : 's'}`,
            command: 'editor.action.showReferences',
            arguments: [
              document.uri,
              range.start,
              info.references.map((r) => toLocation(document, r)),
            ],
          }),
        );
      }
    }
    return lenses;
  }

  dispose(): void {
    this.changed.dispose();
  }
}

export function registerLanguageFeatures(
  openTreeInGraph: (uri: vscode.Uri, treeId: string) => Promise<void>,
): vscode.Disposable {
  const cache = new BtLanguageCache();
  const codeLens = new BtCodeLensProvider(cache);

  const disposables: vscode.Disposable[] = [
    codeLens,
    vscode.commands.registerCommand(
      OPEN_TREE_IN_GRAPH_COMMAND,
      (uri: vscode.Uri | undefined, treeId: string | undefined) => {
        const target = uri ?? vscode.window.activeTextEditor?.document.uri;
        if (target && treeId) {
          return openTreeInGraph(target, treeId);
        }
        return undefined;
      },
    ),

    vscode.languages.registerCompletionItemProvider(
      SELECTOR,
      {
        async provideCompletionItems(document, position) {
          const index = await cache.get(document);
          if (!index) {
            return undefined;
          }
          const offset = document.offsetAt(position);
          return getCompletions(index, offset).map((c) => {
            const item = new vscode.CompletionItem(c.label, COMPLETION_KINDS[c.kind]);
            item.detail = c.detail;
            if (c.documentation) {
              item.documentation = new vscode.MarkdownString(c.documentation);
            }
            const insert = c.insertText ?? c.label;
            item.insertText = c.isSnippet ? new vscode.SnippetString(insert) : insert;
            item.sortText = c.sortText;
            let range = toRange(document, c.replaceStart, c.replaceEnd);
            if (!range.isSingleLine || !range.contains(position)) {
              range = new vscode.Range(document.positionAt(c.replaceStart), position);
              if (!range.isSingleLine) {
                range = new vscode.Range(position, position);
              }
            }
            item.range = range;
            return item;
          });
        },
      },
      '<',
      ' ',
      '"',
      '{',
    ),

    vscode.languages.registerHoverProvider(SELECTOR, {
      async provideHover(document, position) {
        const index = await cache.get(document);
        if (!index) {
          return undefined;
        }
        const hover = getHover(index, document.offsetAt(position));
        if (!hover) {
          return undefined;
        }
        return new vscode.Hover(
          new vscode.MarkdownString(hover.markdown),
          toRange(document, hover.start, hover.end),
        );
      },
    }),

    vscode.languages.registerDefinitionProvider(SELECTOR, {
      async provideDefinition(document, position) {
        const index = await cache.get(document);
        if (!index) {
          return undefined;
        }
        return getDefinition(index, document.offsetAt(position)).map((l) =>
          toLocation(document, l),
        );
      },
    }),

    vscode.languages.registerReferenceProvider(SELECTOR, {
      async provideReferences(document, position, context) {
        const index = await cache.get(document);
        if (!index) {
          return undefined;
        }
        return getReferences(index, document.offsetAt(position), context.includeDeclaration).map(
          (l) => toLocation(document, l),
        );
      },
    }),

    vscode.languages.registerDocumentSymbolProvider(
      SELECTOR,
      {
        async provideDocumentSymbols(document) {
          const index = await cache.get(document);
          if (!index) {
            return undefined;
          }
          return getDocumentSymbols(index).map((s) => toDocumentSymbol(document, s));
        },
      },
      { label: 'Behavior Trees' },
    ),

    vscode.languages.registerRenameProvider(SELECTOR, {
      async prepareRename(document, position) {
        const index = await cache.get(document);
        if (!index) {
          throw new Error('Not a BehaviorTree.CPP document.');
        }
        const result = prepareRename(index, document.offsetAt(position));
        if (!result || 'error' in result) {
          throw new Error(result?.error ?? 'Nothing to rename.');
        }
        return {
          range: toRange(document, result.start, result.end),
          placeholder: result.placeholder,
        };
      },
      async provideRenameEdits(document, position, newName) {
        const index = await cache.get(document);
        if (!index) {
          return undefined;
        }
        const edits = getRenameEdits(index, document.offsetAt(position), newName);
        if ('error' in edits) {
          throw new Error(edits.error);
        }
        const workspaceEdit = new vscode.WorkspaceEdit();
        for (const e of edits) {
          workspaceEdit.replace(document.uri, toRange(document, e.start, e.end), e.newText);
        }
        return workspaceEdit;
      },
    }),

    vscode.languages.registerCodeLensProvider(SELECTOR, codeLens),

    vscode.workspace.onDidCloseTextDocument((doc) => cache.delete(doc.uri)),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      // An included or workspace models file may have changed.
      if (doc.languageId === 'xml') {
        cache.clear();
        codeLens.refresh();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('btview.languageFeatures.enabled') ||
        e.affectsConfiguration('btview.nodeTypeMap') ||
        e.affectsConfiguration('btview.defaultFormatVersion') ||
        e.affectsConfiguration('btview.customModelsInclude') ||
        e.affectsConfiguration('btview.rosPackageShareOverrides') ||
        e.affectsConfiguration('btview.rosWorkspaceSetup') ||
        e.affectsConfiguration('btview.rosDistro')
      ) {
        cache.clear();
        codeLens.refresh();
      }
    }),
  ];

  return vscode.Disposable.from(...disposables);
}
