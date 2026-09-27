# Editing ports & node models (TreeNodesModel)

BehaviorTree.CPP nodes talk to each other through **ports**: typed inputs, outputs and in/out values, usually bound to blackboard entries such as `{goal}`. BTView reads the `<TreeNodesModel>` section of your file to know which ports each node has, what their C++ types are, and which ones are required.

This tutorial uses the showcase tree [`fixtures/showcase/warehouse_delivery.xml`](https://github.com/guilyx/btview-vscode-plugin/blob/main/fixtures/showcase/warehouse_delivery.xml) — open it in VS Code, or pick **Warehouse delivery** in the [live demo](../try.md).

## Declaring models

A model lists a node's kind and ports:

```xml
<TreeNodesModel>
  <Action ID="DetectObject">
    <input_port name="target" type="std::string"/>
    <output_port name="pose" type="geometry_msgs::msg::PoseStamped"/>
  </Action>
  <Condition ID="IsBatteryOk">
    <input_port name="min_percent" type="double" default="15"/>
  </Condition>
</TreeNodesModel>
```

Models are also how BTView classifies compact custom tags. In a v3 Nav2 tree, `<RecoveryNode>` or `<RateController>` would be "unknown" on their own; with `<Control ID="RecoveryNode"/>` and `<Decorator ID="RateController"/>` in the model they render — and simulate — as a control and a decorator. Models from `<include>`d files count too.

## Typed ports in the inspector

Click a node. The inspector groups its ports into **Inputs** (←), **In / Out** (↔), **Outputs** (→) and **Custom attributes** (anything not declared in the model), each labelled with its C++ type. Defaults from the model appear as placeholders.

![Inspector showing typed input and output ports of DetectObject](/screenshots/inspector-ports.png)

Type a value — a literal (`12.5`) or a blackboard reference (`{item_pose}`) — and BTView writes the attribute into the XML after a short pause. The **×** button removes an attribute. Changing **Kind** or **Type (registered ID)** rewrites the element, e.g. `<Action ID="Grasp">` → `<Condition ID="IsGrasped">`.

Toggle port chips directly on the graph cards with <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>P</kbd> (or set `btview.showNodePorts`).

![Editing a port in the graph updates the XML](/screenshots/xml-sync.png)

## The node models panel

Under the inspector, **Node models** lists every `TreeNodesModel` entry with its kind and port count:

- **Add** — type an ID, pick a kind, press **Add**: an empty model is appended to the file. Add its ports in XML (or copy a snippet from a similar model).
- **Copy XML** — copies the model's XML snippet, handy for moving a model into a shared `models.xml`.
- **Delete** — removes the model from the file (nodes using it keep working, but lose port typing).

Models also feed the palette's **From model** section, with port-count badges and tooltips.

![Palette entries from models and the node models panel](/screenshots/palette-models.png)

## Port validation

With a model in place, BTView checks every instance:

- a required port (input or in/out **without** a `default`) that is never set → `Required input port "goal" is missing on NavigateTo.`
- an attribute that is not a declared port → `Unknown port attribute "exposure" on TakePhoto.`

Both show up in the graph's issues panel and in VS Code's **Problems** view. See [Validate, simulate & verify](./validate-simulate-verify.md).

## Share types across files

**Save types** in the graph header (or **BTView: Export Workspace Config (Save Types)**) writes the file's models to `.btview/models.xml` (configurable with `btview.customModelsInclude`) and merges their kinds into `btview.nodeTypeMap`, so every tree in the workspace classifies your custom nodes — even files that have no `TreeNodesModel` of their own.
