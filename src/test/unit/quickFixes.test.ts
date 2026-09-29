import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseDocument } from '../../btcpp/parser';
import { validateDocument, type ValidationError } from '../../btcpp/validation';
import {
  applyTextEdits,
  convertToV4Fix,
  findIssue,
  locateIssue,
  quickFixesForIssue,
} from '../../btcpp/quickFixes';

const fixtures = join(__dirname, '../../../fixtures');

function issuesOf(xml: string): ValidationError[] {
  return validateDocument(parseDocument(xml));
}

function issue(xml: string, code: string): ValidationError {
  const found = issuesOf(xml).find((e) => e.code === code);
  if (!found) {
    throw new Error(`no ${code} issue in:\n${xml}`);
  }
  return found;
}

/** Apply the first (or titled) fix for `code` and return the new XML. */
function fix(xml: string, code: string, title?: string): string {
  const e = issue(xml, code);
  const fixes = quickFixesForIssue(xml, parseDocument(xml), e);
  const chosen = title ? fixes.find((f) => f.title === title) : fixes[0];
  if (!chosen) {
    throw new Error(`no fix for ${code}: ${fixes.map((f) => f.title).join(', ')}`);
  }
  return applyTextEdits(xml, chosen.edits);
}

const UNDEFINED_SUBTREE = `<?xml version="1.0"?>
<root BTCPP_format="4" main_tree_to_execute="Main">
  <!-- keep me -->
  <BehaviorTree ID="Main">
    <Sequence>
      <SubTree ID="Dock"/>
    </Sequence>
  </BehaviorTree>
</root>
`;

describe('quickFixesForIssue', () => {
  it('creates a stub tree for an undefined SubTree and keeps comments', () => {
    const out = fix(UNDEFINED_SUBTREE, 'undefined-subtree');
    expect(out).toContain('<!-- keep me -->');
    expect(out).toContain(
      '  <BehaviorTree ID="Dock">\n    <AlwaysSuccess/>\n  </BehaviorTree>\n</root>',
    );
    expect(issuesOf(out)).toEqual([]);
  });

  it('sets main_tree_to_execute when several trees exist', () => {
    const xml = `<root BTCPP_format="4">
  <BehaviorTree ID="A"><AlwaysSuccess/></BehaviorTree>
  <BehaviorTree ID="B"><AlwaysSuccess/></BehaviorTree>
</root>`;
    const e = issue(xml, 'missing-main-tree');
    const fixes = quickFixesForIssue(xml, parseDocument(xml), e);
    expect(fixes.map((f) => f.title)).toEqual([
      'Set main_tree_to_execute to "A"',
      'Set main_tree_to_execute to "B"',
    ]);
    expect(fixes[0]!.isPreferred).toBe(true);
    const out = fix(xml, 'missing-main-tree', 'Set main_tree_to_execute to "B"');
    expect(out).toContain('<root BTCPP_format="4" main_tree_to_execute="B">');
    expect(issuesOf(out)).toEqual([]);
  });

  it('retargets or stubs an unknown main_tree_to_execute', () => {
    const xml = `<root BTCPP_format="4" main_tree_to_execute="Ghost">
  <BehaviorTree ID="Main"><AlwaysSuccess/></BehaviorTree>
</root>`;
    expect(fix(xml, 'unknown-main-tree')).toContain('main_tree_to_execute="Main"');
    const stubbed = fix(xml, 'unknown-main-tree', 'Create BehaviorTree "Ghost" stub');
    expect(issuesOf(stubbed)).toEqual([]);
  });

  it('adds a missing required port with a blackboard placeholder', () => {
    const xml = `<root BTCPP_format="4">
  <BehaviorTree ID="Main">
    <Move name="go"/>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="Move"><input_port name="goal"/></Action>
  </TreeNodesModel>
</root>`;
    const out = fix(xml, 'missing-required-port');
    expect(out).toContain('<Move name="go" goal="{goal}"/>');
    expect(issuesOf(out)).toEqual([]);
  });

  it('removes unknown attributes but never `_` directives', () => {
    const xml = `<root BTCPP_format="4">
  <BehaviorTree ID="Main">
    <Move goal="x"  typo="1" _skipIf="false"/>
  </BehaviorTree>
  <TreeNodesModel>
    <Action ID="Move"><input_port name="goal"/></Action>
  </TreeNodesModel>
</root>`;
    const errors = issuesOf(xml).filter((e) => e.code === 'unknown-port');
    expect(errors).toHaveLength(2);
    const doc = parseDocument(xml);
    const typo = errors.find((e) => e.data?.port === 'typo')!;
    const directive = errors.find((e) => e.data?.port === '_skipIf')!;
    expect(quickFixesForIssue(xml, doc, directive)).toEqual([]);
    const out = applyTextEdits(xml, quickFixesForIssue(xml, doc, typo)[0]!.edits);
    expect(out).toContain('<Move goal="x" _skipIf="false"/>');
  });

  it('renames the second of two duplicate tree IDs', () => {
    const xml = `<root BTCPP_format="4" main_tree_to_execute="Main">
  <BehaviorTree ID="Main"><AlwaysSuccess/></BehaviorTree>
  <BehaviorTree ID="Main"><AlwaysFailure/></BehaviorTree>
</root>`;
    const out = fix(xml, 'duplicate-tree-id');
    expect(out).toContain('<BehaviorTree ID="Main"><AlwaysSuccess/>');
    expect(out).toContain('<BehaviorTree ID="Main_2"><AlwaysFailure/>');
  });

  it('declares BTCPP_format when a file is parsed as v4 without it', () => {
    const xml = `<root main_tree_to_execute="Main">
  <BehaviorTree ID="Main"><AlwaysSuccess/></BehaviorTree>
</root>`;
    const doc = parseDocument(xml, { defaultFormatVersion: '4' });
    const e = validateDocument(doc).find((x) => x.code === 'missing-btcpp-format')!;
    const out = applyTextEdits(xml, quickFixesForIssue(xml, doc, e)[0]!.edits);
    expect(out.startsWith('<root BTCPP_format="4" main_tree_to_execute="Main">')).toBe(true);
    expect(validateDocument(parseDocument(out))).toEqual([]);
  });

  it('adds a first tree to a file without any', () => {
    const xml = '<root BTCPP_format="4">\n</root>\n';
    const out = fix(xml, 'no-behavior-tree');
    const doc = parseDocument(out);
    expect(doc.trees.map((t) => t.id)).toEqual(['MainTree']);
    expect(doc.mainTreeToExecute).toBe('MainTree');
    expect(issuesOf(out)).toEqual([]);
  });

  it('offers v3 → v4 conversion for v4-only nodes in v3 files', () => {
    const xml = `<root main_tree_to_execute="Main">
  <BehaviorTree ID="Main"><Sequence><Script code="x := 1"/></Sequence></BehaviorTree>
</root>`;
    const e = issue(xml, 'v4-only-node');
    const [convert] = quickFixesForIssue(xml, parseDocument(xml), e);
    expect(convert?.kind).toBe('convertToV4');
    const out = applyTextEdits(xml, convert!.edits);
    expect(parseDocument(out).formatVersion).toBe(4);
  });

  it('has no automatic fix for structural issues', () => {
    const xml = `<root BTCPP_format="4">
  <BehaviorTree ID="Main"><Inverter><A/><B/></Inverter></BehaviorTree>
</root>`;
    const e = issue(xml, 'too-many-children');
    expect(quickFixesForIssue(xml, parseDocument(xml), e)).toEqual([]);
  });
});

describe('convertToV4Fix', () => {
  it('only applies to v3 documents', () => {
    const v4 = readFileSync(join(fixtures, 'v4', 'simple_sequence.xml'), 'utf8');
    expect(convertToV4Fix(v4, parseDocument(v4))).toBeNull();
    const v3 = readFileSync(join(fixtures, 'v3', 'simple_sequence.xml'), 'utf8');
    expect(convertToV4Fix(v3, parseDocument(v3))?.edits[0]!.newText).toContain('BTCPP_format="4"');
  });
});

describe('locateIssue', () => {
  it('anchors node issues on the tag name and tree issues on the ID value', () => {
    const range = locateIssue(UNDEFINED_SUBTREE, issue(UNDEFINED_SUBTREE, 'undefined-subtree'))!;
    expect(UNDEFINED_SUBTREE.slice(range.start, range.end)).toBe('SubTree');

    const dup = `<root BTCPP_format="4" main_tree_to_execute="A">
  <BehaviorTree ID="A"><X/></BehaviorTree>
  <BehaviorTree ID="A"><Y/></BehaviorTree>
</root>`;
    const r = locateIssue(dup, issue(dup, 'duplicate-tree-id'))!;
    expect(r.start).toBeGreaterThan(dup.indexOf('<X/>'));
    expect(dup.slice(r.start, r.end)).toBe('A');
  });

  it('falls back to <root> for document-level issues', () => {
    const xml = '<root BTCPP_format="4"></root>';
    const r = locateIssue(xml, issue(xml, 'no-behavior-tree'))!;
    expect(xml.slice(r.start, r.end)).toBe('root');
    expect(locateIssue('not xml', issue(xml, 'no-behavior-tree'))).toBeNull();
  });
});

describe('findIssue / applyTextEdits', () => {
  it('matches issues by code, tree, path and message', () => {
    const errors = issuesOf(UNDEFINED_SUBTREE);
    const target = errors[0]!;
    expect(
      findIssue(errors, {
        code: target.code!,
        path: target.path,
        treeId: target.treeId,
        message: target.message,
      }),
    ).toBe(target);
    expect(
      findIssue(errors, { code: 'unknown-port', path: target.path, message: '' }),
    ).toBeUndefined();
  });

  it('applies edits in any order', () => {
    expect(
      applyTextEdits('abcdef', [
        { start: 1, end: 2, newText: 'B' },
        { start: 4, end: 4, newText: '-' },
      ]),
    ).toBe('aBcd-ef');
  });
});
