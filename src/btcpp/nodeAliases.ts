/** Maps between v3 and v4 node names for display and serialization. */

export const V3_TO_V4_ALIASES: Record<string, string> = {
  SequenceStar: 'SequenceWithMemory',
  SubTreePlus: 'SubTree',
};

export const V4_TO_V3_ALIASES: Record<string, string> = {
  SequenceWithMemory: 'SequenceStar',
};

export function normalizeNodeId(id: string, formatVersion: 3 | 4): string {
  if (formatVersion === 4) {
    return V3_TO_V4_ALIASES[id] ?? id;
  }
  return V4_TO_V3_ALIASES[id] ?? id;
}

export function serializeNodeId(
  canonicalId: string,
  formatVersion: 3 | 4,
  legacyTag?: string,
): string {
  if (legacyTag) {
    return legacyTag;
  }
  if (formatVersion === 3 && canonicalId === 'SequenceWithMemory') {
    return 'SequenceStar';
  }
  if (formatVersion === 3 && canonicalId === 'SubTree' && legacyTag === 'SubTreePlus') {
    return 'SubTreePlus';
  }
  return normalizeNodeId(canonicalId, formatVersion);
}
