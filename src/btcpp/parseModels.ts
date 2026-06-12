import type { NodeModel, PortModel, ParseOptions, NodeKind } from './types';
import type { XmlElement } from './xmlUtils';
import { getAttrs, getChildren, getTagName, findChildElements } from './xmlUtils';
import { inferNodeKind } from './nodeRegistry';

function modelExplicitWrapper(tag: string): string | undefined {
  if (
    tag === 'SubTree' ||
    tag === 'Action' ||
    tag === 'Condition' ||
    tag === 'Control' ||
    tag === 'Decorator'
  ) {
    return tag;
  }
  return undefined;
}

function parseModelElement(
  el: XmlElement,
  nodeTypeMap?: Record<string, NodeKind>,
): NodeModel | null {
  const tag = getTagName(el);
  const attrs = getAttrs(el);
  const id = attrs.ID ?? tag;
  if (!id) {
    return null;
  }

  const ports: PortModel[] = [];
  for (const child of getChildren(el)) {
    const childTag = getTagName(child);
    if (childTag === 'input_port' || childTag === 'output_port' || childTag === 'inout_port') {
      const portAttrs = getAttrs(child);
      const direction =
        childTag === 'input_port' ? 'input' : childTag === 'output_port' ? 'output' : 'inout';
      if (portAttrs.name) {
        ports.push({
          name: portAttrs.name,
          direction,
          type: portAttrs.type,
          defaultValue: portAttrs.default,
        });
      }
    }
  }

  return {
    id,
    kind: inferNodeKind(id, modelExplicitWrapper(tag), nodeTypeMap),
    ports,
  };
}

export function parseTreeNodesModel(
  root: XmlElement,
  options: Pick<ParseOptions, 'nodeTypeMap'> = {},
): Map<string, NodeModel> {
  const models = new Map<string, NodeModel>();
  const modelRoots = findChildElements(root, 'TreeNodesModel');

  for (const modelRoot of modelRoots) {
    for (const child of getChildren(modelRoot)) {
      const tag = getTagName(child);
      if (!tag || tag === '#comment') {
        continue;
      }
      const model = parseModelElement(child, options.nodeTypeMap);
      if (model) {
        models.set(model.id, model);
      }
    }
  }

  return models;
}
