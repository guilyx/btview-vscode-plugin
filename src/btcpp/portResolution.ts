import type { NodeKind, NodeModel, PortModel } from './types';
import type { BtNode } from './types';

export interface ResolvedPort {
  name: string;
  direction: PortModel['direction'];
  type?: string;
  defaultValue?: string;
  value?: string;
  fromModel: boolean;
}

export interface ResolvedPorts {
  inputs: ResolvedPort[];
  outputs: ResolvedPort[];
  inouts: ResolvedPort[];
  custom: ResolvedPort[];
}

export function resolveNodePorts(
  node: Pick<BtNode, 'registeredId' | 'attributes'>,
  models: Map<string, NodeModel> | NodeModel[],
): ResolvedPorts {
  const modelMap =
    models instanceof Map ? models : new Map(models.map((m) => [m.id, m] as [string, NodeModel]));

  const model = modelMap.get(node.registeredId);
  const result: ResolvedPorts = { inputs: [], outputs: [], inouts: [], custom: [] };
  const modelPortNames = new Set<string>();

  if (model) {
    for (const port of model.ports) {
      modelPortNames.add(port.name);
      const entry: ResolvedPort = {
        name: port.name,
        direction: port.direction,
        type: port.type,
        defaultValue: port.defaultValue,
        value: node.attributes[port.name],
        fromModel: true,
      };
      if (port.direction === 'input') {
        result.inputs.push(entry);
      } else if (port.direction === 'output') {
        result.outputs.push(entry);
      } else {
        result.inouts.push(entry);
      }
    }
  }

  for (const [name, value] of Object.entries(node.attributes)) {
    if (!modelPortNames.has(name)) {
      result.custom.push({
        name,
        direction: 'input',
        value,
        fromModel: false,
      });
    }
  }

  return result;
}

export function collectNodeTypeMap(doc: import('./types').BtDocument): Record<string, NodeKind> {
  const map: Record<string, NodeKind> = {};

  for (const model of doc.models.values()) {
    if (model.kind !== 'unknown') {
      map[model.id] = model.kind;
    }
  }

  function walk(node: BtNode): void {
    if (node.kind !== 'unknown') {
      map[node.registeredId] = node.kind;
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  for (const tree of doc.trees) {
    if (tree.root) {
      walk(tree.root);
    }
  }

  return map;
}
