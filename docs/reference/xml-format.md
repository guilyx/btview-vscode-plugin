# XML format support

BTView reads and writes the BehaviorTree.CPP XML dialects of **v3.8** and **v4**. The file on disk is the source of truth: the graph is a view over it, and every graph edit re-serializes the document in its original format.

## Format detection

| `<root …>`                   | Parsed as                                          |
| ---------------------------- | -------------------------------------------------- |
| `BTCPP_format="4"`           | v4                                                 |
| `BTCPP_format="3"` or absent | v3.8 (override with `btview.defaultFormatVersion`) |

## Document structure

| Element / attribute                         | Support                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `<root main_tree_to_execute="…">`           | Entry tree, shown as **Entry:** and `(main)` in the tree selector                                    |
| Multiple `<BehaviorTree ID="…">`            | Tree selector, drill-down, breadcrumbs                                                               |
| `<include path="…"/>`                       | Relative and absolute paths, nested up to 10 levels                                                  |
| `<include ros_pkg="…" path="…"/>`           | ROS 2 package share lookup ([details](../tutorials/subtrees-and-includes.md#ros-2-packages-ros-pkg)) |
| `<TreeNodesModel>`                          | Node kinds, typed ports, defaults; add / copy / delete models                                        |
| `input_port` / `output_port` / `inout_port` | Name, `type`, `default`                                                                              |
| XML comments                                | Ignored for layout; not preserved by graph edits (see below)                                         |

## Nodes

| Form                                               | Kind                                                           |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `<Action ID="X"/>`, `<Condition ID="X"/>`          | action / condition                                             |
| `<Control ID="X">`, `<Decorator ID="X">`           | control / decorator                                            |
| `<SubTree ID="X"/>` (v3 `SubTreePlus` too)         | subtree                                                        |
| `<Script code="…"/>` (v4)                          | script                                                         |
| Built-in compact tags (`<Sequence>`, `<Retry>`, …) | from the built-in registry                                     |
| Custom compact tags (`<ComputePathToPose/>`)       | from `TreeNodesModel`, then `btview.nodeTypeMap`, else unknown |

Built-in controls: `Sequence`, `Fallback`, `Parallel`, `ReactiveSequence`, `ReactiveFallback`, `IfThenElse`, `WhileDoElse`, `Switch`, plus `SequenceStar` (v3) or `SequenceWithMemory`, `AsyncSequence`, `AsyncFallback` (v4). Built-in decorators: `Inverter`, `Retry`, `Repeat`, `Timeout`, `ForceSuccess`, `ForceFailure`, `Delay`, `RunOnce`.

## Version differences handled

| Topic                | v3.8                                                | v4                                                                                                |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Memory sequence      | `SequenceStar`                                      | `SequenceWithMemory`                                                                              |
| Subtree remapping    | `SubTreePlus`, `__autoremap`, `__shared_blackboard` | `SubTree`, `_autoremap`                                                                           |
| Blackboard helpers   | `SetBlackboard`, `BlackboardCheck*`                 | `Script`, preconditions (`_skipIf`, …)                                                            |
| Scripting directives | —                                                   | `_successIf`, `_failureIf`, `_skipIf`, `_while`, `_onSuccess`, `_onFailure`, `_onHalted`, `_post` |

Using a v4-only node in a v3 file is reported by validation. **BTView: Convert to BTCpp v4** migrates a v3 file — see [Migrating v3 → v4](../tutorials/migrate-v3-v4.md).

## Round-trip behaviour

- Graph edits rewrite the whole document with the serializer for its format; nodes and attributes are kept, indentation is normalized.
- XML comments are dropped when the graph rewrites the file. Edit comment-heavy files in the text editor, or keep documentation in `name` attributes.
- Node positions you drag are stored in a sidecar `.btview/layouts/*.json`, never in the XML.
- Text edits in the XML editor refresh the graph live.
