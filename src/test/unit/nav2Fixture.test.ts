import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseDocument } from '../../btcpp/parser';
import { detectFormatVersion } from '../../btcpp/versionDetector';

const fixture = readFileSync(
  join(__dirname, '../../../fixtures/nav2/navigate_w_replanning_and_recovery.xml'),
  'utf8',
);

describe('Nav2 navigate_w_replanning_and_recovery fixture', () => {
  it('is detected as v3 (no BTCPP_format attribute)', () => {
    expect(detectFormatVersion(fixture).formatVersion).toBe(3);
  });

  it('parses the full recovery tree', () => {
    const doc = parseDocument(fixture);
    expect(doc.mainTreeToExecute).toBe('MainTree');
    expect(doc.trees).toHaveLength(1);

    const root = doc.trees[0].root;
    expect(root?.registeredId).toBe('RecoveryNode');
    expect(root?.children).toHaveLength(2);
    expect(root?.children[0].registeredId).toBe('PipelineSequence');
    expect(root?.children[1].registeredId).toBe('ReactiveFallback');
  });

  it('exposes the custom Nav2 nodes via TreeNodesModel', () => {
    const doc = parseDocument(fixture);
    expect(doc.models.has('RecoveryNode')).toBe(true);
    expect(doc.models.has('PipelineSequence')).toBe(true);
    expect(doc.models.has('ComputePathToPose')).toBe(true);

    const compute = doc.models.get('ComputePathToPose');
    expect(compute?.ports.map((p) => p.name)).toEqual(
      expect.arrayContaining(['goal', 'path', 'planner_id']),
    );
  });
});
