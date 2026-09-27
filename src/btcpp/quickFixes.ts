/**
 * Quick fixes for validation issues, expressed as minimal text edits on the XML source.
 * Shared by the XML `CodeActionProvider` and the graph Issues panel so both surfaces
 * apply identical edits (and comments/formatting outside the edit are preserved).
 */

import type { BtDocument } from './types';
import { localTrees, type ValidationError } from './validation';
import { migrateV3ToV4 } from './migrateV3ToV4';
import {
  findAttr,
  findNodeSpan,
  findRootSpan,
  findTreeSpan,
  scanXmlElements,
  tagNameRange,
  type OffsetRange,
  type XmlElementSpan,
} from './xmlLocator';

export type QuickFixKind =
  | 'createTree'
  | 'setMainTree'
  | 'addRequiredPort'
  | 'removeUnknownPort'
  | 'renameDuplicateTree'
  | 'declareFormat'
  | 'convertToV4';

export interface TextEditSpan {
  start: number;
  end: number;
  newText: string;
}

export interface QuickFix {
  kind: QuickFixKind;
  title: string;
  edits: TextEditSpan[];
  /** Marked as the preferred fix (auto-fix / first in lists). */
  isPreferred?: boolean;
}

/** Identifies an issue independently of its index in the validation list. */
export interface IssueRef {
  code: string;
  path: string;
  treeId?: string;
  message: string;
}

const TREE_ID_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** Cap on per-tree fixes (e.g. "set main tree to X") so menus stay short. */
const MAX_TREE_CHOICES = 5;

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Leading whitespace of the line containing `offset`. */
function lineIndent(xml: string, offset: number): string {
  const lineStart = xml.lastIndexOf('\n', offset - 1) + 1;
  return /^[ \t]*/.exec(xml.slice(lineStart))?.[0] ?? '';
}

/** Detect the file's indent unit from the first indented line (defaults to two spaces). */
function indentUnit(xml: string): string {
  const m = /\n([ \t]+)</.exec(xml);
  return m?.[1] ?? '  ';
}

/** Insert ` name="value"` after the last attribute (or the tag name) of a start tag. */
function insertAttrEdit(el: XmlElementSpan, name: string, value: string): TextEditSpan {
  const at = el.attrs.length > 0 ? el.attrs[el.attrs.length - 1]!.end : el.nameEnd;
  return { start: at, end: at, newText: ` ${name}="${escapeAttr(value)}"` };
}

/** Set an attribute: replace its value if present, otherwise insert it. */
function setAttrEdit(el: XmlElementSpan, name: string, value: string): TextEditSpan {
  const attr = findAttr(el, name);
  if (attr) {
    return { start: attr.valueStart, end: attr.valueEnd, newText: escapeAttr(value) };
  }
  return insertAttrEdit(el, name, value);
}

/** Insert a new `<BehaviorTree ID>` after the last tree (or before `</root>`). */
function createTreeEdit(
  xml: string,
  root: XmlElementSpan,
  treeId: string,
  stub: boolean,
): TextEditSpan | null {
  if (root.selfClosing || root.closeStart === undefined) {
    return null;
  }
  const unit = indentUnit(xml);
  const trees = root.children.filter((c) => c.tag === 'BehaviorTree');
  const anchor = trees[trees.length - 1];
  const indent = anchor ? lineIndent(xml, anchor.start) : lineIndent(xml, root.start) + unit;
  const body = stub
    ? `${indent}<BehaviorTree ID="${escapeAttr(treeId)}">\n${indent}${unit}<AlwaysSuccess/>\n${indent}</BehaviorTree>`
    : `${indent}<BehaviorTree ID="${escapeAttr(treeId)}">\n${indent}</BehaviorTree>`;
  if (anchor) {
    return { start: anchor.end, end: anchor.end, newText: `\n${body}` };
  }
  // Before `</root>`: reuse the close tag's line when it starts on its own line.
  const lineStart = xml.lastIndexOf('\n', root.closeStart - 1) + 1;
  if (xml.slice(lineStart, root.closeStart).trim() === '') {
    return { start: lineStart, end: lineStart, newText: `${body}\n` };
  }
  return { start: root.closeStart, end: root.closeStart, newText: `\n${body}\n` };
}

function uniqueTreeId(doc: BtDocument, base: string): string {
  const taken = new Set(doc.trees.map((t) => t.id));
  for (let n = 2; ; n++) {
    const candidate = `${base}_${n}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
}

/** The start tag a node-level issue points at, if it lives in this file. */
function issueNodeSpan(
  root: XmlElementSpan,
  issue: Pick<ValidationError, 'path' | 'treeId'>,
): XmlElementSpan | undefined {
  if (!issue.treeId || !issue.path) {
    return undefined;
  }
  const tree = findTreeSpan(root, issue.treeId);
  return tree ? findNodeSpan(tree, issue.path) : undefined;
}

/** Source range an issue should be reported at (tag name of the offending element). */
export function locateIssue(xml: string, issue: ValidationError): OffsetRange | null {
  const root = findRootSpan(scanXmlElements(xml));
  if (!root) {
    return null;
  }
  if (issue.code === 'duplicate-tree-id' && issue.treeId) {
    const tree = findTreeSpan(root, issue.treeId, Number(issue.data?.occurrence ?? 0));
    const id = tree && findAttr(tree, 'ID');
    return id ? { start: id.valueStart, end: id.valueEnd } : null;
  }
  if (issue.code === 'unknown-port' && issue.data?.port) {
    const node = issueNodeSpan(root, issue);
    const attr = node && findAttr(node, issue.data.port);
    if (attr) {
      return { start: attr.start, end: attr.end };
    }
  }
  const node = issueNodeSpan(root, issue);
  if (node) {
    return tagNameRange(node);
  }
  if (issue.code === 'unknown-main-tree') {
    const attr = findAttr(root, 'main_tree_to_execute');
    if (attr) {
      return { start: attr.valueStart, end: attr.valueEnd };
    }
  }
  if (issue.treeId) {
    const tree = findTreeSpan(root, issue.treeId);
    if (tree) {
      return tagNameRange(tree);
    }
  }
  return tagNameRange(root);
}

/** Candidate fixes for one issue. Empty when the issue has no safe automatic fix. */
export function quickFixesForIssue(
  xml: string,
  doc: BtDocument,
  issue: ValidationError,
): QuickFix[] {
  const root = findRootSpan(scanXmlElements(xml));
  if (!root) {
    return [];
  }
  const treeChoices = localTrees(doc)
    .map((t) => t.id)
    .filter((id) => id.length > 0)
    .slice(0, MAX_TREE_CHOICES);
  const fixes: QuickFix[] = [];

  switch (issue.code) {
    case 'no-behavior-tree': {
      const edit = createTreeEdit(xml, root, 'MainTree', false);
      if (edit) {
        const edits = [edit];
        if (!findAttr(root, 'main_tree_to_execute')) {
          edits.push(insertAttrEdit(root, 'main_tree_to_execute', 'MainTree'));
        }
        fixes.push({
          kind: 'createTree',
          title: 'Add <BehaviorTree ID="MainTree">',
          edits,
          isPreferred: true,
        });
      }
      break;
    }
    case 'undefined-subtree': {
      const target = issue.data?.target;
      const edit =
        target && TREE_ID_RE.test(target) ? createTreeEdit(xml, root, target, true) : null;
      if (edit) {
        fixes.push({
          kind: 'createTree',
          title: `Create BehaviorTree "${target}" stub`,
          edits: [edit],
          isPreferred: true,
        });
      }
      break;
    }
    case 'missing-main-tree':
    case 'unknown-main-tree': {
      treeChoices.forEach((id, i) => {
        fixes.push({
          kind: 'setMainTree',
          title: `Set main_tree_to_execute to "${id}"`,
          edits: [setAttrEdit(root, 'main_tree_to_execute', id)],
          isPreferred: i === 0,
        });
      });
      const target = issue.data?.target;
      if (issue.code === 'unknown-main-tree' && target && TREE_ID_RE.test(target)) {
        const edit = createTreeEdit(xml, root, target, true);
        if (edit) {
          fixes.push({
            kind: 'createTree',
            title: `Create BehaviorTree "${target}" stub`,
            edits: [edit],
          });
        }
      }
      break;
    }
    case 'missing-required-port': {
      const port = issue.data?.port;
      const node = issueNodeSpan(root, issue);
      if (port && node) {
        // `{port}` binds the port to a blackboard entry of the same name — a sensible placeholder.
        fixes.push({
          kind: 'addRequiredPort',
          title: `Add required port ${port}="{${port}}"`,
          edits: [insertAttrEdit(node, port, `{${port}}`)],
          isPreferred: true,
        });
      }
      break;
    }
    case 'unknown-port': {
      const port = issue.data?.port;
      const node = issueNodeSpan(root, issue);
      const attr = port && node ? findAttr(node, port) : undefined;
      // `_`-prefixed attributes are BTCpp directives (`_skipIf`, `_autoremap`, …) — never strip them.
      if (attr && !attr.name.startsWith('_')) {
        let start = attr.start;
        while (start > 0 && /\s/.test(xml[start - 1]!)) {
          start--;
        }
        fixes.push({
          kind: 'removeUnknownPort',
          title: `Remove unknown attribute "${attr.name}"`,
          edits: [{ start, end: attr.end, newText: '' }],
        });
      }
      break;
    }
    case 'duplicate-tree-id': {
      const treeId = issue.treeId;
      const tree = treeId
        ? findTreeSpan(root, treeId, Number(issue.data?.occurrence ?? 1))
        : undefined;
      const id = tree && findAttr(tree, 'ID');
      if (treeId && id) {
        const renamed = uniqueTreeId(doc, treeId);
        fixes.push({
          kind: 'renameDuplicateTree',
          title: `Rename duplicate tree to "${renamed}"`,
          edits: [{ start: id.valueStart, end: id.valueEnd, newText: renamed }],
          isPreferred: true,
        });
      }
      break;
    }
    case 'missing-btcpp-format':
      fixes.push({
        kind: 'declareFormat',
        title: 'Declare BTCPP_format="4" on <root>',
        edits: [
          findAttr(root, 'BTCPP_format')
            ? setAttrEdit(root, 'BTCPP_format', '4')
            : { start: root.nameEnd, end: root.nameEnd, newText: ' BTCPP_format="4"' },
        ],
        isPreferred: true,
      });
      break;
    case 'v4-only-node': {
      const convert = convertToV4Fix(xml, doc);
      if (convert) {
        fixes.push(convert);
      }
      break;
    }
    default:
      break;
  }
  return fixes;
}

/**
 * Whole-file v3 → v4 migration as a single edit. Offered for v3 files only; the
 * rewrite normalizes formatting (same output as `BTView: Convert to BTCpp v4`).
 */
export function convertToV4Fix(xml: string, doc: BtDocument): QuickFix | null {
  if (doc.formatVersion !== 3) {
    return null;
  }
  try {
    const { xml: migrated } = migrateV3ToV4(xml);
    return {
      kind: 'convertToV4',
      title: 'Convert file to BTCpp v4',
      edits: [
        {
          start: 0,
          end: xml.length,
          newText: migrated.endsWith('\n') ? migrated : `${migrated}\n`,
        },
      ],
    };
  } catch {
    return null;
  }
}

/** Find the issue in `issues` matching `ref` (code + tree + path + message). */
export function findIssue(issues: ValidationError[], ref: IssueRef): ValidationError | undefined {
  return issues.find(
    (e) =>
      e.code === ref.code &&
      e.path === ref.path &&
      (e.treeId ?? '') === (ref.treeId ?? '') &&
      e.message === ref.message,
  );
}

/** Apply non-overlapping edits to `xml` (edits may be given in any order). */
export function applyTextEdits(xml: string, edits: TextEditSpan[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  let out = xml;
  for (const edit of sorted) {
    out = out.slice(0, edit.start) + edit.newText + out.slice(edit.end);
  }
  return out;
}
