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

## Diagnostics

`DiagnosticsService` publishes validation warnings to the Problems panel. `OutputChannel('BTView')` logs parse, include, and sync errors.
