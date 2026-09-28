# Your first behavior tree in 5 minutes

In this tutorial you create a small BehaviorTree.CPP v4 tree from scratch, build it visually, and watch it run — without writing XML by hand.

You need BTView installed ([Installation](../getting-started/INSTALLATION.md)). No ROS or C++ toolchain is required.

## 1. Create the file

Run **BTView: New Behavior Tree** from the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) and answer the prompts:

| Prompt     | Choose                             |
| ---------- | ---------------------------------- |
| Format     | **BTCpp v4** (recommended)         |
| Tree ID    | `MainTree`                         |
| Start mode | **With root control** → `Sequence` |
| Save as    | `first_tree.xml` in your workspace |

BTView writes a minimal file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <Sequence/>
  </BehaviorTree>
</root>
```

Open it as a graph with <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>V</kbd> so the XML stays visible beside the graph — every change you make below shows up in the text immediately.

## 2. Add nodes from the palette

The **Nodes** palette on the left lists the built-in controls, decorators and scripts for the file's format, plus every node declared in `<TreeNodesModel>`.

1. Click (or drag) a palette entry. It appears on the canvas as a **staged** node — dashed, not yet in the XML.
2. Connect it: drag from the **bottom handle** of the parent (your `Sequence`) to the **top handle** of the staged node. The node is inserted into the XML under that parent.
3. Select the node and set its **Type (registered ID)** and **Instance name** in the inspector, for example `Action` / `OpenGripper` named `open_gripper`.

![Palette with a staged node and the node model panel](/screenshots/palette-models.png)

::: tip Custom action names
For your own leaves, pick **Kind** = `action` or `condition` in the inspector and type the registered ID (e.g. `ApproachObject`). BTView writes `<Action ID="ApproachObject"/>` so the file stays valid even before you declare a model. Declaring models is covered in [Ports & node models](./ports-and-models.md).
:::

Add three actions under the `Sequence`: `approach_object`, `open_gripper`, `close_gripper`. Your XML now reads:

```xml
<Sequence>
  <Action ID="ApproachObject" name="approach_object"/>
  <Action ID="OpenGripper" name="open_gripper"/>
  <Action ID="CloseGripper" name="close_gripper"/>
</Sequence>
```

## 3. Rearrange and refine

- **Reorder / reparent**: drag a node onto another parent. Invalid moves (e.g. a second child under a decorator) are rejected with a message.
- **Rename**: select a node and press <kbd>F2</kbd>.
- **Undo / redo**: <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> — edits go through VS Code's document, so the text editor's undo works too.
- **Copy / paste / duplicate** whole subtrees with <kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>V</kbd> / <kbd>D</kbd>.
- Right-click a node or the canvas for the context menu.

![Node context menu](/screenshots/context-menu.png)

## 4. Navigate like a pro

Press <kbd>?</kbd> in the graph for the full cheat sheet. The essentials: arrow keys walk the tree (<kbd>↑</kbd> parent, <kbd>↓</kbd> first child, <kbd>←</kbd>/<kbd>→</kbd> siblings), <kbd>Ctrl</kbd>+<kbd>F</kbd> searches, <kbd>Ctrl</kbd>+<kbd>0</kbd> fits the view.

![Keyboard shortcut cheat sheet](/screenshots/shortcuts.png)

## 5. Run it

Click **Step** in the **Sim** group of the graph header. Each click advances the tree by one tick using BehaviorTree.CPP semantics; leaves report `RUNNING` on their first tick and `SUCCESS` after, so you can watch the `Sequence` walk through its children. **Play** auto-steps until the root finishes; **Reset** clears the overlays.

That's a complete tree. Next: give your nodes typed ports in [Ports & node models](./ports-and-models.md), or explore everything in the [live demo](../try.md).
