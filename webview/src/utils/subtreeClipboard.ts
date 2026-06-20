import type { BtNodeData } from '../types';

export function btNodeDataToPayload(node: BtNodeData): {
  kind: string;
  registeredId: string;
  instanceName?: string;
  attributes: Record<string, string>;
  children: ReturnType<typeof btNodeDataToPayload>[];
} {
  return {
    kind: node.kind,
    registeredId: node.registeredId,
    instanceName: node.instanceName,
    attributes: { ...node.attributes },
    children: node.children.map(btNodeDataToPayload),
  };
}
