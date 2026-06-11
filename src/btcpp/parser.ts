import type { BtDocument, ParseOptions } from './types';
import { detectFormatVersion } from './versionDetector';
import { parseV3Document } from './v3/parser';
import { parseV4Document } from './v4/parser';

export function parseDocument(xmlText: string, options: ParseOptions = {}): BtDocument {
  const { formatVersion } = detectFormatVersion(xmlText, options);
  if (formatVersion === 4) {
    return parseV4Document(xmlText, options);
  }
  return parseV3Document(xmlText, options);
}
