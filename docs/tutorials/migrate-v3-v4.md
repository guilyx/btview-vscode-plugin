# Migrating v3 → v4

BehaviorTree.CPP 4 changed the XML format: a `BTCPP_format="4"` attribute on `<root>`, renamed nodes, new port-remapping syntax for subtrees, and the scripting language (`Script`, `_skipIf`, `_failureIf`, …) replacing the blackboard helper nodes. BTView edits both formats faithfully and can do most of the migration for you.

## How BTView tells v3 and v4 apart

- `<root BTCPP_format="4">` → **v4**
- no `BTCPP_format` → **v3.8** by default. Override with `btview.defaultFormatVersion` (`"auto"`, `"3"`, `"4"`).

The badge in the graph header shows the detected format. Edits keep it: a v3 file stays v3 (`SequenceStar`, `SubTreePlus`, `__autoremap` are preserved on save), and v4-only nodes such as `Script` are flagged when used in a v3 file.

![A v3 file with SubTreePlus, graph and XML side by side](/screenshots/v3-format.png)

## Convert a file

1. Open the v3 file.
2. Run **BTView: Convert to BTCpp v4** from the Command Palette.
3. BTView opens a **diff editor**: your file on the left, the migrated v4 XML on the right (as an unsaved document).
4. Review the diff, copy what you want into your file (or save the right side as a new file).
5. Check **Output → BTView** and the warning notification for nodes that need manual work.

Nothing is overwritten until you save.

## What is converted automatically

| v3                                             | v4                                    |
| ---------------------------------------------- | ------------------------------------- |
| `<root>`                                       | `<root BTCPP_format="4">`             |
| `SequenceStar`                                 | `SequenceWithMemory`                  |
| `<SubTreePlus ID="X" __autoremap="true"/>`     | `<SubTree ID="X" _autoremap="true"/>` |
| `<SubTree ID="X" __shared_blackboard="true"/>` | `<SubTree ID="X" _autoremap="1"/>`    |

## What needs a human

These v3 nodes have no one-to-one v4 equivalent; BTView reports each one with its node path:

| v3 node                                  | v4 replacement                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `SetBlackboard output_key="k" value="v"` | `<Script code="k:='v'"/>`                                                |
| `BlackboardCheckInt/Double/String/Bool`  | a precondition on the child, e.g. `_skipIf="k!=3"`, or `ScriptCondition` |

After fixing them, re-open the file: validation will point at anything left, e.g. a v3-only node in a v4 file or ports your models don't declare. Then run the [simulator and verifier](./validate-simulate-verify.md) to make sure the migrated tree still behaves the same — or, better, write a `*.trace.json` before migrating and keep it green.

## Creating new files

**BTView: New Behavior Tree** asks for the format; the default comes from `btview.serializeNewFilesAs` (`"4"` unless you change it).
