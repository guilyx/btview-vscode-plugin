# Working with subtrees and includes

Real behavior trees are split into reusable pieces: several `<BehaviorTree>` elements in one file, referenced with `<SubTree ID="…"/>`, and trees spread across files joined with `<include>`. BTView lets you move through all of them without leaving the graph.

## Several trees in one file

```xml
<root BTCPP_format="4" main_tree_to_execute="DeliverOrder">
  <BehaviorTree ID="DeliverOrder">
    <Sequence name="deliver_order">
      …
      <SubTree ID="PickItem" name="pick_item" item="{order_item}"/>
      …
    </Sequence>
  </BehaviorTree>
  <BehaviorTree ID="PickItem"> … </BehaviorTree>
</root>
```

- The **tree selector** in the graph header switches between trees; `(main)` marks `main_tree_to_execute`, also shown as **Entry:**.
- Subtree nodes carry an orange accent and a _double-click to open_ hint.

## Drill down and back

Right-click a subtree node → **Open subtree** (or double-click it). The graph switches to that tree and a **breadcrumb trail** appears in the header. Click any crumb to jump back up.

![Context menu on a subtree node](/screenshots/context-menu.png)

![Breadcrumbs after drilling into PickItem](/screenshots/subtree-breadcrumbs.png)

Port remapping on the `<SubTree>` element (`item="{order_item}"`) is edited like any other port in the inspector; with `<SubTree ID="PickItem">` declared in `TreeNodesModel`, its ports are typed too. In v4, `_autoremap="true"` shares the parent blackboard.

Validation checks subtree wiring for you: a `SubTree` whose ID matches no tree, a `SubTree` without an ID, and recursive cycles (`A → B → A`, which would tick forever) are all reported.

## Includes

`<include path="…"/>` pulls trees and models from another file. BTView resolves it, merges the included trees into the tree selector and the included models into port typing, and shows an **include chip** in the header. Click a chip to open that file; a red chip carries the resolution error in its tooltip.

```xml
<root BTCPP_format="4">
  <include path="./subtrees/child_v4.xml"/>
  <BehaviorTree ID="MainTree">
    <Sequence>
      <Action ID="SaySomething" message="Hello"/>
      <SubTree ID="ChildTree"/>
    </Sequence>
  </BehaviorTree>
</root>
```

![Include chip for a relative include](/screenshots/includes.png)

Paths resolve like BehaviorTree.CPP does:

| Form                               | Resolved against                            |
| ---------------------------------- | ------------------------------------------- |
| `path="./subtrees/x.xml"`          | the directory of the including file         |
| `path="/abs/path/x.xml"`           | the file system (absolute)                  |
| `ros_pkg="my_pkg" path="bt/x.xml"` | the share directory of ROS package `my_pkg` |

Includes nest up to 10 levels deep; the same file is loaded only once.

## ROS 2 packages (`ros_pkg`)

For `<include ros_pkg="swarm_behavior_trees" path="behavior_trees_xml/prod/subtrees/land_home.xml"/>`, BTView looks up the package share directory in this order:

1. `btview.rosPackageShareOverrides` — an explicit map, highest priority
2. `ros2 pkg prefix --share <pkg>` after sourcing `btview.rosWorkspaceSetup`
3. `install/<pkg>/share/<pkg>` inside your workspace folders
4. the `AMENT_PREFIX_PATH` index

The quickest reliable setup is to point BTView at your workspace's setup script:

```json
{
  "btview.rosWorkspaceSetup": "/home/me/ros2_ws/install/setup.bash",
  "btview.rosDistro": "jazzy"
}
```

or, without a sourced environment (e.g. in a container or on Windows), map packages directly:

```json
{
  "btview.rosPackageShareOverrides": {
    "swarm_behavior_trees": "/home/me/ros2_ws/install/swarm_behavior_trees/share/swarm_behavior_trees"
  }
}
```

If a package cannot be found, the include chip turns red with `ROS package "…" not found`, and the rest of the file still opens. See [Configuration](../getting-started/CONFIGURATION.md) for every setting.
