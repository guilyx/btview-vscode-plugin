import type { BtDocument } from './types';
import { serializeV3Document } from './v3/serializer';
import { serializeV4Document } from './v4/serializer';

export function serializeDocument(doc: BtDocument): string {
  if (doc.formatVersion === 4) {
    return serializeV4Document(doc);
  }
  return serializeV3Document(doc);
}
