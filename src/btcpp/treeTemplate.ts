export interface NewTreeOptions {
  formatVersion: 3 | 4;
  treeId: string;
  mainTreeId?: string;
  rootControl?: string;
  emptyCanvas?: boolean;
}

export function buildNewTreeXml(options: NewTreeOptions): string {
  const mainTree = options.mainTreeId ?? options.treeId;
  const rootLine =
    options.emptyCanvas || !options.rootControl ? '' : `    <${options.rootControl}/>\n`;

  if (options.formatVersion === 4) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<root BTCPP_format="4" main_tree_to_execute="${mainTree}">
  <BehaviorTree ID="${options.treeId}">
${rootLine}  </BehaviorTree>
</root>
`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<root main_tree_to_execute="${mainTree}">
  <BehaviorTree ID="${options.treeId}">
${rootLine}  </BehaviorTree>
</root>
`;
}
