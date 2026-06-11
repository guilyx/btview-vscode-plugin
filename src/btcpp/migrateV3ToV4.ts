import { parseV3Document } from './v3/parser';
import { serializeV4Document } from './v4/serializer';
import type { BtDocument, BtNode } from './types';
import { V3_TO_V4_ALIASES } from './nodeAliases';
import { cloneNode } from './xmlUtils';

const V3_SCRIPT_NODES = new Set([
  'SetBlackboard',
  'BlackboardCheckInt',
  'BlackboardCheckBool',
  'BlackboardCheckDouble',
  'BlackboardCheckString',
]);

function migrateNode(node: BtNode, warnings: string[]): BtNode {
  const migrated = cloneNode(node);

  if (V3_SCRIPT_NODES.has(migrated.registeredId)) {
    warnings.push(
      `Node "${migrated.registeredId}" at path ${migrated.path} requires manual migration to v4 Script/preconditions.`,
    );
  }

  if (migrated.registeredId in V3_TO_V4_ALIASES) {
    migrated.registeredId = V3_TO_V4_ALIASES[migrated.registeredId];
    migrated.rawTag = migrated.registeredId;
  }

  if (migrated.legacyTag === 'SubTreePlus' || migrated.rawTag === 'SubTree') {
    if (migrated.attributes.__shared_blackboard === 'true') {
      delete migrated.attributes.__shared_blackboard;
      migrated.attributes._autoremap = '1';
      warnings.push(`Converted __shared_blackboard to _autoremap at path ${migrated.path}.`);
    }
    if (migrated.attributes.__autoremap) {
      migrated.attributes._autoremap = migrated.attributes.__autoremap;
      delete migrated.attributes.__autoremap;
    }
    migrated.legacyTag = undefined;
    migrated.rawTag = 'SubTree';
    migrated.registeredId = migrated.attributes.ID ?? migrated.registeredId;
  }

  migrated.children = migrated.children.map((c) => migrateNode(c, warnings));

  return migrated;
}

export function migrateV3ToV4(xmlText: string): { xml: string; warnings: string[] } {
  const doc = parseV3Document(xmlText);
  const warnings = [...doc.warnings];

  const migrated: BtDocument = {
    ...doc,
    formatVersion: 4,
    trees: doc.trees.map((tree) => ({
      ...tree,
      root: tree.root ? migrateNode(tree.root, warnings) : null,
    })),
    warnings,
  };

  return {
    xml: serializeV4Document(migrated),
    warnings,
  };
}
