import { describe, expect, it } from 'vitest';
import { parseDocument } from '../../btcpp/parser';
import { enumerateOutcomes, findLeaves, verifyTree } from '../../btcpp/verify/boundedCheck';

function prop(results: ReturnType<typeof verifyTree>, name: string) {
  const r = results.find((x) => x.property === name);
  if (!r) {
    throw new Error(`missing property ${name}`);
  }
  return r;
}

const seqXml = `<?xml version="1.0"?>
<root BTCPP_format="4" main_tree_to_execute="Main">
  <BehaviorTree ID="Main">
    <Sequence>
      <Action ID="A" name="a"/>
      <Action ID="B" name="b"/>
    </Sequence>
  </BehaviorTree>
</root>`;

const fallbackXml = `<?xml version="1.0"?>
<root BTCPP_format="4" main_tree_to_execute="Main">
  <BehaviorTree ID="Main">
    <Fallback>
      <Action ID="A" name="a"/>
      <Action ID="B" name="b"/>
    </Fallback>
  </BehaviorTree>
</root>`;

describe('findLeaves', () => {
  it('collects action leaves', () => {
    const doc = parseDocument(seqXml);
    expect(findLeaves(doc.trees[0].root!)).toEqual(['0-0', '0-1']);
  });
});

describe('verifyTree — Sequence', () => {
  const results = verifyTree(parseDocument(seqXml));

  it('explores all 2^2 leaf combinations', () => {
    expect(prop(results, 'root can succeed').checked).toBe(4);
  });

  it('can succeed (when both leaves succeed) and can fail (when one fails)', () => {
    expect(prop(results, 'root can succeed').holds).toBe(true);
    expect(prop(results, 'root can fail').holds).toBe(true);
  });

  it('witness for success has both leaves SUCCESS', () => {
    const witness = prop(results, 'root can succeed').counterexample!;
    expect(witness).toEqual({ '0-0': 'SUCCESS', '0-1': 'SUCCESS' });
  });

  it('always terminates within the tick budget', () => {
    expect(prop(results, 'always terminates within tick budget').holds).toBe(true);
  });
});

describe('verifyTree — Fallback', () => {
  const results = verifyTree(parseDocument(fallbackXml));

  it('can still fail when every branch fails', () => {
    expect(prop(results, 'root can fail').holds).toBe(true);
    const cex = prop(results, 'root can fail').counterexample!;
    expect(cex).toEqual({ '0-0': 'FAILURE', '0-1': 'FAILURE' });
  });
});

describe('enumerateOutcomes guard', () => {
  it('refuses trees with too many leaves', () => {
    const doc = parseDocument(seqXml);
    expect(() => enumerateOutcomes(doc, { maxLeaves: 1 })).toThrow(/refusing to enumerate/);
  });
});
