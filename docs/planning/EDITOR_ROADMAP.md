# Editor roadmap (E-01 … E-47)

Master checklist for the **Editor Complete** train (0.5.x → 1.0.0). Feature PRs target **`devel`**; Marketplace releases land on **`main`** at 1.0.

Related: [Roadmap](../ROADMAP.md) · [Command surfaces](COMMAND_SURFACES.md) · [Groot parity](GROOT_PARITY.md)

---

## PR template

```markdown
### E-XX: Title

- **Branch:** feat/slug
- **Target:** 0.X.x
- **Depends on:** E-YY
- **Acceptance:**
  - [ ] criterion
- **CHANGELOG:** Added/Changed/Fixed
```

---

## Phase 0.5 — Editor UX

| ID   | Feature                                                       | Branch                    | Status |
| ---- | ------------------------------------------------------------- | ------------------------- | ------ |
    |
    |
    |
    |
    |
    |

**Acceptance:** Hobbyist can understand colors, right-click Delete/Rename, use `Del`/`F2`, undo edits.

---

## Phase 0.6 — Typed ports

| ID   | Feature                                             | Branch                       | Status |
| ---- | --------------------------------------------------- | ---------------------------- | ------ |
    |
    |
    |
    |
    |
    |

---

## Phase 0.7 — Model authoring

| ID   | Feature                                                        | Branch                         | Status |
| ---- | -------------------------------------------------------------- | ------------------------------ | ------ |
    |
| E-21 | Create / delete custom node models                             | `feat/model-crud`              | [ ]    |
| E-22 | Palette grouped by kind + port tooltips                        | `feat/palette-models`          | [ ]    |
| E-23 | Export model snippet to clipboard                              | `feat/export-model-snippet`    | [ ]    |
    |

---

## Phase 0.8 — Pro graph operations

| ID   | Feature                           | Branch                    | Status |
| ---- | --------------------------------- | ------------------------- | ------ |
    |
    |
    |
    |
    |
    |

---

## Phase 0.9 — Hobbyist polish (deferred)

| ID   | Feature                                   | Branch                          | Status |
| ---- | ----------------------------------------- | ------------------------------- | ------ |
| E-40 | Simple mode (`btview.simpleMode`)         | `feat/simple-mode`              | [ ]    |
| E-41 | Onboarding empty states                   | `feat/onboarding`               | [ ]    |
| E-42 | Nav2 fixture pack                         | `feat/nav2-fixtures`            | [ ]    |
| E-43 | Validation quick-fixes                    | `feat/validation-quickfix`      | [ ]    |
| E-44 | Accessibility pass                        | `feat/a11y-pass`                | [ ]    |
| E-45 | Editor RC integration tests               | `feat/editor-integration-tests` | [ ]    |
| E-46 | Shortcut cheat sheet (`?`)                | `feat/shortcut-help`            | [ ]    |
| E-47 | Command Palette `btview.graph.*` commands | `feat/graph-commands`           | [ ]    |

---

## 1.0.0 release criteria

- E-01 … E-35 complete (or deferred with issue links)
- E-46, E-47 complete
- [COMMAND_SURFACES.md](COMMAND_SURFACES.md) matches shipped actions
- GROOT_PARITY P0/P1 editing rows green
- CI green; coverage gate on `src/btcpp/`
- USER_GUIDE updated

---

## Dev tags (pre-Marketplace)

| Tag            | Milestone             |
| -------------- | --------------------- |
| `v0.5.0-dev.0` | Roadmap docs baseline |
| `v0.5.0-dev.1` | Phase 0.5 complete    |
| `v0.6.0-dev.1` | Phase 0.6 complete    |
| `v0.7.0-dev.1` | Phase 0.7 complete    |
| `v0.8.0-dev.1` | Phase 0.8 complete    |
| `v0.9.0-rc.1`  | Editor RC soak test   |
