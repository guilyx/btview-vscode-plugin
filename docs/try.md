---
title: Try it live
aside: false
---

<script setup>
import { withBase } from 'vitepress'
</script>

# Try BTView in your browser

This is the **same webview UI** that runs inside VS Code and Cursor, driven by an in-page host built on the extension's real parser, edit operations, validator, simulator and verifier. Nothing is uploaded anywhere — edits live in memory until you reload.

<iframe class="bt-demo-frame" :src="withBase('/demo/index.html')" title="BTView live demo" loading="lazy"></iframe>

<p><a :href="withBase('/demo/index.html')" target="_blank" rel="noopener">Open the demo full screen ↗</a></p>

## Things to try

- **Pick a file** in the top bar — the warehouse showcase (v4, subtrees, typed ports), the Nav2 recovery tree (v3), or the tree with validation issues.
- **Click a node** and edit a port in the inspector: the XML pane on the right highlights the lines that changed.
- **Right-click** a subtree node → **Open subtree**, then use the breadcrumbs to come back.
- **Search** with <kbd>Ctrl</kbd>+<kbd>F</kbd>, cycle matches with <kbd>Enter</kbd>, and walk the tree with the arrow keys. Press <kbd>?</kbd> for every shortcut.
- **Simulate**: choose a scenario under _Sim outcomes_ and press **Play** in the graph toolbar.
- **Verify tree** and **Run trace tests** print results to the output panel — the same checks as `BTView: Verify Tree (Bounded Check)` and the `*.trace.json` CI gate.

## What's different from the extension

| In VS Code / Cursor                                   | In the browser demo                             |
| ----------------------------------------------------- | ----------------------------------------------- |
| Edits are applied to the XML document (undoable)      | Edits update an in-memory copy of the file      |
| **XML Source** / **Go to XML source** open the editor | They reveal the line in the read-only XML pane  |
| `ros_pkg` includes resolve via your ROS workspace     | Only relative includes between bundled fixtures |
| **Save types** writes `.btview/models.xml`            | Shows a notice                                  |

Ready for the real thing? [Install BTView](./getting-started/INSTALLATION.md).
