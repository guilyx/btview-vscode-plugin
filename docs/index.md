---
layout: home
title: BTView
titleTemplate: Behavior Trees, visually

hero:
  name: BTView
  text: Behavior Trees, visually.
  tagline: A graph editor, simulator and verifier for BehaviorTree.CPP v3 & v4 XML — inside VS Code and Cursor.
  image:
    src: /logo.svg
    alt: BTView logo
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/INSTALLATION
    - theme: alt
      text: Try it live
      link: /try
    - theme: alt
      text: GitHub
      link: https://github.com/guilyx/btview-vscode-plugin

features:
  - title: Graph ↔ XML, always in sync
    details: Open any BehaviorTree.CPP file as an interactive graph. Every edit in the graph is written back to the XML — version-faithful for v3.8 and v4.
    link: /getting-started/USER_GUIDE
    linkText: User guide
  - title: Typed ports & node models
    details: The inspector groups inputs, outputs and in/out ports with their C++ types from TreeNodesModel. Add, copy and delete models from the panel.
    link: /tutorials/ports-and-models
    linkText: Ports tutorial
  - title: Subtrees, includes, ROS packages
    details: Drill into subtrees with breadcrumbs, follow relative, absolute and ros_pkg includes, and see the whole mission at once.
    link: /tutorials/subtrees-and-includes
    linkText: Subtrees tutorial
  - title: Validation you can click
    details: Missing ports, unknown attributes, undefined subtrees, recursive cycles and bad arity show up in the issues panel and the Problems view — click to jump.
    link: /tutorials/validate-simulate-verify
    linkText: Validation
  - title: Offline simulation
    details: Step or play ticks of the real BT.CPP control-flow semantics and watch RUNNING, SUCCESS and FAILURE fire across the tree, with a live blackboard.
    link: /tutorials/validate-simulate-verify#simulate-ticks
    linkText: Simulation
  - title: Verification & trace tests
    details: A bounded exhaustive checker proves reachability and termination; declarative *.trace.json scenarios turn tree behaviour into CI tests.
    link: /tutorials/validate-simulate-verify#verify-the-tree
    linkText: Verification
---

<script setup>
import { withBase } from 'vitepress'
</script>

<div class="bt-home">

## See it in action

<video class="bt-video" controls muted playsinline preload="none" :poster="withBase('/media/poster.png')" :src="withBase('/media/promo.mp4')"></video>

Everything in this video is a real capture of the extension's webview UI, running on the same parser, validator and simulator that ship in the VS Code extension.

## A tour in screenshots

<div class="bt-gallery">
<figure>

![Nav2 behavior tree rendered as a graph](/screenshots/overview.png)

<figcaption>Nav2 "navigate with replanning and recovery", laid out as a tidy tree.</figcaption>
</figure>
<figure>

![Inspector with typed input and output ports](/screenshots/inspector-ports.png)

<figcaption>Typed ports from <code>TreeNodesModel</code> in the inspector.</figcaption>
</figure>
<figure>

![Simulation with status overlays](/screenshots/simulation.png)

<figcaption>Offline tick simulation with RUNNING / SUCCESS / FAILURE overlays and blackboard.</figcaption>
</figure>
<figure>

![Validation issues panel](/screenshots/validation-issues.png)

<figcaption>Validation issues — click one to select and center the node.</figcaption>
</figure>
<figure>

![Graph edits synchronised to XML](/screenshots/xml-sync.png)

<figcaption>Edit a port in the graph, the XML changes (highlighted) immediately.</figcaption>
</figure>
<figure>

![Light theme](/screenshots/light-theme.png)

<figcaption>Picks up your VS Code color theme — here, Light Modern.</figcaption>
</figure>
</div>

## Install

| Editor      | How                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| **VS Code** | `ext install rangonomics.btview` or search **BTView** in Extensions                                  |
| **Cursor**  | Search **BTView** in Extensions ([Open VSX](https://open-vsx.org/extension/rangonomics/btview))      |
| **Any**     | Download the `.vsix` from [GitHub Releases](https://github.com/guilyx/btview-vscode-plugin/releases) |

Then open a behavior tree XML file and press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>. New here? Start with [your first behavior tree in 5 minutes](/tutorials/first-tree).

</div>
