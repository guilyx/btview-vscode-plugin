export { BtIndex, isBtDocumentText, includeKey, EMPTY_EXTERNALS } from './btIndex';
export type { ExternalDefinitions, NodeDefinition, SourceLocation } from './btIndex';
export { getCompletions, type BtCompletion } from './completion';
export { getHover, type BtHover } from './hover';
export {
  getDefinition,
  getReferences,
  getRenameEdits,
  prepareRename,
  type TextEdit,
} from './navigation';
export {
  getCodeLensInfo,
  getDocumentSymbols,
  type BtCodeLensInfo,
  type BtDocumentSymbol,
} from './symbols';
export { loadExternalDefinitions } from './externals';
