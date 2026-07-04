import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseDocument } from '../../btcpp/parser';
import { runScenario, type TraceScenario } from '../../btcpp/exec/trace';

const FIXTURES = path.resolve(__dirname, '../../../fixtures');

const seqXml = `<?xml version="1.0"?>
<root BTCPP_format="4" main_tree_to_execute="Main">
  <BehaviorTree ID="Main">
    <Sequence>
      <Action ID="A" name="a"/>
      <Action ID="B" name="b"/>
    </Sequence>
  </BehaviorTree>
</root>`;

describe('runScenario', () => {
  it('passes when assertions hold', () => {
    const doc = parseDocument(seqXml);
    const res = runScenario(doc, { expect: [{ rootStatus: 'SUCCESS' }] });
    expect(res.passed).toBe(true);
  });

  it('fails and reports the actual status when an assertion is wrong', () => {
    const doc = parseDocument(seqXml);
    const res = runScenario(doc, {
      mocks: { a: 'FAILURE' },
      expect: [{ rootStatus: 'SUCCESS' }],
    });
    expect(res.passed).toBe(false);
    expect(res.results[0].message).toContain('was FAILURE');
  });

  it('supports per-tick assertions on a RUNNING action', () => {
    const doc = parseDocument(seqXml);
    const res = runScenario(doc, {
      mocks: { a: ['RUNNING', 'SUCCESS'] },
      expect: [
        { tick: 1, rootStatus: 'RUNNING' },
        { tick: 2, rootStatus: 'SUCCESS' },
      ],
    });
    expect(res.passed).toBe(true);
  });
});

/** Discover every `*.trace.json` and run it against its sibling `*.xml`. This is the
 *  CI gate for behavior of the trees we ship as fixtures. */
function findTraceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findTraceFiles(full));
    } else if (entry.name.endsWith('.trace.json')) {
      out.push(full);
    }
  }
  return out;
}

describe('trace fixtures', () => {
  const traceFiles = findTraceFiles(FIXTURES);

  it('discovers at least one trace fixture', () => {
    expect(traceFiles.length).toBeGreaterThan(0);
  });

  for (const traceFile of traceFiles) {
    const xmlFile = traceFile.replace(/\.trace\.json$/, '.xml');
    const rel = path.relative(FIXTURES, traceFile);
    it(rel, () => {
      const doc = parseDocument(fs.readFileSync(xmlFile, 'utf8'), { sourceUri: xmlFile });
      const scenarios = JSON.parse(fs.readFileSync(traceFile, 'utf8')) as
        | TraceScenario
        | TraceScenario[];
      const list = Array.isArray(scenarios) ? scenarios : [scenarios];
      for (const scenario of list) {
        const res = runScenario(doc, scenario);
        const failures = res.results.filter((r) => !r.ok).map((r) => r.message);
        expect(failures, `${scenario.name}: ${failures.join('; ')}`).toEqual([]);
      }
    });
  }
});
