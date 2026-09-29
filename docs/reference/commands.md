<script setup>
import { data } from './package.data.mts'
const pretty = (k) => k ? k.split(' ').map((c) => c.split('+').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('+')).join(' ') : ''
</script>

# Commands & keybindings

## Command Palette

Every command lives under the **BTView:** category (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>). Generated from `package.json` (v{{ data.version }}).

<table>
  <thead>
    <tr><th>Command</th><th>ID</th><th>Default key</th></tr>
  </thead>
  <tbody>
    <tr v-for="c in data.commands" :key="c.command">
      <td>{{ c.category ? c.category + ': ' : '' }}{{ c.title }}</td>
      <td><code>{{ c.command }}</code></td>
      <td>
        <span v-if="c.keys"><kbd>{{ pretty(c.keys) }}</kbd><span v-if="c.mac"> · macOS <kbd>{{ pretty(c.mac) }}</kbd></span></span>
      </td>
    </tr>
  </tbody>
</table>

The editor-title keybindings apply when an XML text editor has focus. Any command can be rebound in **Keyboard Shortcuts** (<kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>S</kbd>) — search for `btview`.

## In the graph

These shortcuts are handled by the graph webview itself (press <kbd>?</kbd> in the graph to see them). On macOS, <kbd>Ctrl</kbd> is <kbd>Cmd</kbd>.

| Action                                    | Shortcut                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Navigate tree (parent / child / siblings) | <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>                                                            |
| Delete node                               | <kbd>Del</kbd>                                                                                                 |
| Deselect / close menu                     | <kbd>Esc</kbd>                                                                                                 |
| Rename                                    | <kbd>F2</kbd>                                                                                                  |
| Undo / Redo                               | <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> (or <kbd>Ctrl</kbd>+<kbd>Y</kbd>) |
| Search nodes                              | <kbd>Ctrl</kbd>+<kbd>F</kbd>                                                                                   |
| Next / previous search match              | <kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Enter</kbd>                                                           |
| Fit view                                  | <kbd>Ctrl</kbd>+<kbd>0</kbd>                                                                                   |
| Toggle legend                             | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd>                                                                  |
| Toggle port labels                        | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>P</kbd>                                                                    |
| Copy / Cut / Paste subtree                | <kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd>                                                     |
| Duplicate subtree                         | <kbd>Ctrl</kbd>+<kbd>D</kbd>                                                                                   |
| Reset layout                              | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd>                                                                  |
| Go to XML source                          | <kbd>Alt</kbd>+<kbd>Enter</kbd>                                                                                |
| Shortcut help                             | <kbd>?</kbd>                                                                                                   |

![Shortcut cheat sheet](/screenshots/shortcuts.png)

## Context menus

- **Node**: Inspect, Rename, Delete, Copy subtree, Cut subtree, Go to XML source, Open subtree (subtree nodes).
- **Canvas**: Fit view, Show/hide legend, Show/hide port labels, Paste subtree, Reset layout, Export workspace config.
- **Staged node**: Delete staged node, Cancel.

`btview.simpleMode` hides the advanced entries (cut subtree, export config). The full inventory and design notes are in [Command surfaces](../planning/COMMAND_SURFACES.md).
