import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseDocument } from '../../btcpp/parser';
import { serializeDocument } from '../../btcpp/serializer';
import { detectFormatVersion } from '../../btcpp/versionDetector';
import { migrateV3ToV4 } from '../../btcpp/migrateV3ToV4';

const fixtures = join(__dirname, '../../../fixtures');

function loadFixture(...parts: string[]): string {
  return readFileSync(join(fixtures, ...parts), 'utf8');
}

describe('versionDetector', () => {
  it('detects v4 from BTCPP_format', () => {
    const xml = loadFixture('v4', 'simple_sequence.xml');
    expect(detectFormatVersion(xml).formatVersion).toBe(4);
  });

  it('detects v3 when BTCPP_format absent', () => {
    const xml = loadFixture('v3', 'simple_sequence.xml');
    expect(detectFormatVersion(xml).formatVersion).toBe(3);
  });
});

describe('parseDocument v3', () => {
  it('parses compact syntax sequence', () => {
    const doc = parseDocument(loadFixture('v3', 'simple_sequence.xml'));
    expect(doc.formatVersion).toBe(3);
    expect(doc.mainTreeToExecute).toBe('MainTree');
    expect(doc.trees).toHaveLength(1);
    expect(doc.trees[0].root?.registeredId).toBe('Sequence');
    expect(doc.trees[0].root?.children).toHaveLength(4);
  });

  it('parses SequenceStar', () => {
    const doc = parseDocument(loadFixture('v3', 'sequence_star.xml'));
    expect(doc.trees[0].root?.registeredId).toBe('SequenceStar');
  });
});

describe('parseDocument v4', () => {
  it('parses v4 sequence', () => {
    const doc = parseDocument(loadFixture('v4', 'simple_sequence.xml'));
    expect(doc.formatVersion).toBe(4);
    expect(doc.trees[0].root?.registeredId).toBe('Sequence');
  });

  it('parses script and preconditions', () => {
    const doc = parseDocument(loadFixture('v4', 'script_preconditions.xml'));
    const children = doc.trees[0].root?.children ?? [];
    expect(children[0].registeredId).toBe('Script');
    expect(children[1].attributes._failureIf).toBe('port_A!=port_B');
  });
});

describe('serializer round-trip', () => {
  it('v3 round-trip preserves format', () => {
    const xml = loadFixture('v3', 'simple_sequence.xml');
    const doc = parseDocument(xml);
    const out = serializeDocument(doc);
    expect(out).toContain('main_tree_to_execute="MainTree"');
    expect(out).not.toContain('BTCPP_format');
    const reparsed = parseDocument(out);
    expect(reparsed.formatVersion).toBe(3);
    expect(reparsed.trees[0].root?.children).toHaveLength(4);
  });

  it('v4 round-trip preserves BTCPP_format', () => {
    const xml = loadFixture('v4', 'simple_sequence.xml');
    const doc = parseDocument(xml);
    const out = serializeDocument(doc);
    expect(out).toContain('BTCPP_format="4"');
    const reparsed = parseDocument(out);
    expect(reparsed.formatVersion).toBe(4);
  });
});

describe('migrateV3ToV4', () => {
  it('converts SequenceStar and adds BTCPP_format', () => {
    const xml = loadFixture('v3', 'sequence_star.xml');
    const { xml: migrated } = migrateV3ToV4(xml);
    expect(migrated).toContain('BTCPP_format="4"');
    expect(migrated).toContain('SequenceWithMemory');
    expect(migrated).not.toContain('SequenceStar');
  });
});
