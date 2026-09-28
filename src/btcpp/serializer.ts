import type { BtDocument } from './types';
import { serializeV3Document } from './v3/serializer';
import { serializeV4Document } from './v4/serializer';

/** True when `sourceUri` names a file other than the document being serialized. */
function isForeign(sourceUri: string | undefined, doc: BtDocument): boolean {
  return sourceUri !== undefined && sourceUri !== doc.sourceUri;
}

/**
 * Drop trees and models that were merged in from `<include>`d files, so writing the
 * document back only emits what the file itself declares.
 */
export function localDocument(doc: BtDocument): BtDocument {
  return {
    ...doc,
    trees: doc.trees.filter((t) => !isForeign(t.sourceUri, doc)),
    models: new Map([...doc.models].filter(([, m]) => !isForeign(m.sourceUri, doc))),
  };
}

export function serializeDocument(doc: BtDocument): string {
  const local = localDocument(doc);
  if (local.formatVersion === 4) {
    return serializeV4Document(local);
  }
  return serializeV3Document(local);
}
