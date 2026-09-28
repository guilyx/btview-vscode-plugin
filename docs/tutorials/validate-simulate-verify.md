# Validate, simulate & verify a tree

BTView checks your tree at three levels, all offline and without compiling any C++:

1. **Validation** — static checks on the XML structure, ports and subtree wiring, live as you edit.
2. **Simulation** — tick the tree step by step with BehaviorTree.CPP control-flow semantics and watch statuses propagate.
3. **Verification & trace tests** — prove properties over _every_ leaf outcome, and pin expected behaviour down in `*.trace.json` files that run in CI.

Follow along with [`fixtures/showcase/`](https://github.com/guilyx/btview-vscode-plugin/tree/main/fixtures/showcase) or in the [live demo](../try.md).

## Validate

Open [`needs_fixes.xml`](https://github.com/guilyx/btview-vscode-plugin/blob/main/fixtures/showcase/needs_fixes.xml). The **Issues** panel above the graph lists every problem with the path of the offending node; the same diagnostics appear in VS Code's **Problems** view. Nodes with issues get a ⚠ badge.

![Issues panel with four validation errors](/screenshots/validation-issues.png)

Click an issue to select the node and center the viewport on it. What BTView checks:

| Check                      | Example message                                                          |
| -------------------------- | ------------------------------------------------------------------------ |
| Child count per kind       | `Inverter allows at most 1 child, found 2.`                              |
| Required ports             | `Required input port "goal" is missing on NavigateTo.`                   |
| Unknown port attributes    | `Unknown port attribute "exposure" on TakePhoto.`                        |
| Subtree references         | `SubTree references undefined tree "Inspect".`                           |
| Recursive subtrees         | `SubTree "A" forms a recursive cycle (would tick forever).`              |
| `main_tree_to_execute`     | `main_tree_to_execute "X" does not match any BehaviorTree in this file.` |
| Duplicate tree IDs         | `Duplicate BehaviorTree ID "X".`                                         |
| v4-only nodes in a v3 file | e.g. `Script` in a file without `BTCPP_format="4"`                       |

Port checks need a `<TreeNodesModel>` entry for the node — see [Ports & node models](./ports-and-models.md).

## Simulate ticks

The **Sim** group in the graph header drives an offline simulator of the active tree:

- **Step** — advance one tick (also **BTView: Simulate: Step One Tick**)
- **Play** / **Pause** — auto-step until the root returns SUCCESS or FAILURE
- **Reset** — stop and clear overlays (also **BTView: Simulate: Reset**)

Nodes light up **RUNNING** (amber), **SUCCESS** (green) or **FAILURE** (red) as ticks fire; the header shows the tick counter, the root status and the blackboard (values written by `Script` nodes, e.g. `station:='packing_3'`). Any edit to the document resets the run.

![Simulation mid-run with status overlays and blackboard](/screenshots/simulation.png)

The simulator implements BehaviorTree.CPP's semantics: memory vs reactive controls (`Sequence`, `SequenceWithMemory`, `ReactiveSequence`, `Fallback`, `ReactiveFallback`), `Parallel`, `IfThenElse`, decorators (`Inverter`, `ForceSuccess`/`ForceFailure`, `Repeat`, `Retry`/`RetryUntilSuccessful`, `RunOnce`), `SubTree` expansion and a minimal `Script` blackboard. In the extension, leaves report RUNNING on their first tick and SUCCESS afterwards, which walks visibly through the tree. (In the live demo, _Sim outcomes_ can also replay the mocks of a trace scenario, e.g. "navigation keeps failing".)

## Verify the tree

Run **BTView: Verify Tree (Bounded Check)**. BTView enumerates every SUCCESS/FAILURE combination of the active tree's leaves, simulates each one, and reports:

- **root can succeed** — with a witness assignment
- **root can fail** — with a witness assignment
- **always terminates within tick budget** — or a counterexample

Results appear as a notification and in **Output → BTView**. A tree that can never fail (or never succeed) is usually a wiring mistake — a missing `Inverter`, a `ForceSuccess` too high up, a fallback that swallows everything.

![Verifier output for the warehouse tree](/screenshots/verify-output.png)

## Trace tests in CI

A trace file sits next to its tree (`warehouse_delivery.xml` → `warehouse_delivery.trace.json`) and declares scenarios: leaf **mocks** keyed by instance name or registered ID, and **expectations** on node status, root status or blackboard, at a given tick or at the end of the run.

```json
[
  {
    "name": "navigation keeps failing, operator is called",
    "mocks": { "drive_to_packing": ["RUNNING", "FAILURE"] },
    "expect": [
      { "tick": 1, "rootStatus": "RUNNING" },
      { "rootStatus": "SUCCESS" },
      { "path": "0-3-0", "status": "FAILURE" },
      { "path": "0-3-1", "status": "SUCCESS" }
    ]
  }
]
```

A mock array is a per-tick script (the last value repeats), so `["RUNNING", "FAILURE"]` means "busy for one tick, then fail". Optional fields: `tree` (defaults to `main_tree_to_execute`) and `maxTicks` (default 100).

In this repository, a Vitest suite discovers every `fixtures/**/*.trace.json` and fails CI if a scenario no longer holds — so a behaviour change to a shipped tree must come with an updated trace. The runner lives in `src/btcpp/exec/trace.ts` (`runScenario`) if you want to wire the same gate into your own project.

![Trace test results](/screenshots/verify-traces.png)
