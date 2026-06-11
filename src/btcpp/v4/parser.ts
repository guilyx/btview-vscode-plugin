import type { BtDocument, BtTree, IncludeRef, ParseOptions } from '../types';
import { SCRIPT_DIRECTIVES } from '../types';
import { detectFormatVersion } from '../versionDetector';
import {
  xmlParser,
  findRootElements,
  findChildElements,
  parseNodeElement,
  assignPaths,
  getAttrs,
  getChildren,
  getTagName,
} from '../xmlUtils';
import { parseTreeNodesModel } from '../parseModels';

export function parseV4Document(xmlText: string, options: ParseOptions = {}): BtDocument {
  const { warnings: detectWarnings } = detectFormatVersion(xmlText, options);
  const warnings = [...detectWarnings];

  const parsed = xmlParser.parse(xmlText) as import('../xmlUtils').XmlElement[];
  const root = findRootElements(parsed);
  if (!root) {
    throw new Error('Invalid XML: missing <root> element');
  }

  const rootAttrs = getAttrs(root);
  if (rootAttrs.BTCPP_format !== '4') {
    warnings.push('Missing or invalid BTCPP_format="4" on <root>; treating as v4.');
  }

  const mainTreeToExecute = rootAttrs.main_tree_to_execute;
  const includes: IncludeRef[] = [];

  for (const incl of findChildElements(root, 'include')) {
    const attrs = getAttrs(incl);
    if (attrs.path) {
      includes.push({ path: attrs.path, rosPkg: attrs.ros_pkg });
    }
  }

  const models = parseTreeNodesModel(root);
  const trees: BtTree[] = [];

  for (const btEl of findChildElements(root, 'BehaviorTree')) {
    const attrs = getAttrs(btEl);
    const id = attrs.ID;
    if (!id) {
      warnings.push('Skipping <BehaviorTree> without ID attribute');
      continue;
    }

    const childNodes = getChildren(btEl).filter((c) => getTagName(c) !== '#comment');
    let rootNode = null;
    if (childNodes.length > 0) {
      rootNode = parseNodeElement(childNodes[0], '0');
      if (rootNode) {
        validateScriptDirectives(rootNode, warnings);
        assignPaths(rootNode, '0');
      }
    }

    trees.push({
      id,
      root: rootNode,
      sourceUri: options.sourceUri,
    });
  }

  return {
    formatVersion: 4,
    mainTreeToExecute,
    trees,
    models,
    includes,
    sourceUri: options.sourceUri,
    warnings,
  };
}

function validateScriptDirectives(node: import('../types').BtNode, _warnings: string[]): void {
  if (node.kind !== 'script') {
    for (const key of Object.keys(node.attributes)) {
      if ((SCRIPT_DIRECTIVES as readonly string[]).includes(key)) {
        // valid on any node in v4
      }
    }
  }
  for (const child of node.children) {
    validateScriptDirectives(child, _warnings);
  }
}
