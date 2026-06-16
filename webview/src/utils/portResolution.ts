import type { NodeModel, PortModel } from '../../../src/btcpp/types';

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
  node: { registeredId: string; attributes: Record<string, string> },
  models: { id: string; kind: string; ports: PortModel[] }[],
): ResolvedPorts {
  const model = models.find((m) => m.id === node.registeredId);
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
      result.custom.push({ name, direction: 'input', value, fromModel: false });
    }
  }

  return result;
}
