# BTView Architecture

## Layers

```text
extension.ts          Commands, activation, config listeners
    ↓
BtGraphController     Facade: messages, refresh, auto-open
    ├── WebviewPanelManager    Webview bindings, side panels
    ├── DocumentRefreshScheduler   Debounce, skip self-edits
    └── DocumentSyncService      Parse ↔ edit ↔ serialize ↔ WorkspaceEdit
            ↓
        src/btcpp/          Domain (parser, validation, edit ops)
            ↓
        webview/            React Flow UI (postMessage protocol)
```

## Message protocol

Types live in `src/shared/protocol.ts`:

- Host → webview: `loadDocument`, `documentChanged`, `error`, `validationError`
- Webview → host: `ready`, `loaded`, `selectTree`, `editNode`, `changeNodeType`, `addNode`, `deleteNode`, `reparentNode`, `reorderChildren`, `openInclude`

## Webview boot

See **[Webview guide](WEBVIEW.md)** for HTML generation, `__BTVIEW_BOOT__`, defer script rules, and the 0.4.x infinite-loading postmortem.

## Custom editor model

`CustomTextEditorProvider` (`btview.graph`) shares webview bindings per document URI with optional side preview panel. XML remains the source of truth on disk; the graph is a view that applies `WorkspaceEdit` on structural changes.

## Text editor language features

`src/language/` makes the XML text editor BT-aware without touching the graph pipeline:

- `xmlScanner.ts` — small tolerant, offset-aware XML scanner (elements, attributes, value ranges, cursor context). Never throws on half-typed input.
- `btIndex.ts` — per-document index over the scan: trees, TreeNodesModel entries, includes, node definitions (local → includes → workspace models → built-ins → `nodeTypeMap`) and `{blackboard}` usages.
- `completion.ts`, `hover.ts`, `navigation.ts` (definition / references / rename), `symbols.ts` (outline + CodeLens data) — pure functions over offsets, unit-tested with Vitest.
- `externals.ts` — resolves includes (relative and `ros_pkg`) and the workspace models file into external definitions with line/character locations.
- `providers.ts` — the only VS Code-dependent file: thin providers registered for `{ language: 'xml' }`, a per-document-version cache, and the `btview.openTreeInGraph` CodeLens command. Gated by `btview.languageFeatures.enabled`.

## Diagnostics

`DiagnosticsService` publishes validation warnings to the Problems panel. `OutputChannel('BTView')` logs parse, include, and sync errors.
