import type { BtDocument, ParseOptions } from './types';
import { detectFormatVersion } from './versionDetector';
import { parseV3Document } from './v3/parser';
import { parseV4Document } from './v4/parser';
import { applyModelKinds } from './nodeRegistry';

export function parseDocument(xmlText: string, options: ParseOptions = {}): BtDocument {
  const { formatVersion } = detectFormatVersion(xmlText, options);
  const doc =
    formatVersion === 4 ? parseV4Document(xmlText, options) : parseV3Document(xmlText, options);
  return applyModelKinds(doc);
}
