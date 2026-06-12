# BTView Webview — Agent Instructions

React 19 + Vite + `@xyflow/react`. Parent: [AGENTS.md](../AGENTS.md).

## Rules

- Use `vscodeApi.ts` for extension communication — no direct `acquireVsCodeApi` elsewhere
- Style with `--vscode-*` CSS variables only (`styles.css`)
- Message types: import from shared protocol / `types.ts`
- Debounce `editNode` in Inspector — do not post per keystroke
- `fitView` only on first load or tree switch, not every document refresh

## Layout

```
webview/src/
  App.tsx           # document state, message handler
  graph/BtGraph.tsx # React Flow canvas
  graph/layout.ts   # tree layout (pure, testable)
  nodes/BtNode.tsx  # custom node renderer
  panels/           # Inspector, Toolbar, NodePicker, WarningsPanel
```
