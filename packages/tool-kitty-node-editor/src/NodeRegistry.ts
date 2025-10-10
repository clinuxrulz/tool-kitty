import { NodeType } from "./Node";

export class NodeRegistry<TYPE_EXT,INST_EXT> {
  readonly nodeTypes: NodeType<TYPE_EXT,INST_EXT,any>[] = [];
  private noteTypeNameToNodeTypeMap = new Map<string,NodeType<TYPE_EXT,INST_EXT,any>>();

  registerNodeType(nodeType: NodeType<TYPE_EXT,INST_EXT,any>) {
    this.nodeTypes.push(nodeType);
    this.noteTypeNameToNodeTypeMap.set(nodeType.componentType.typeName, nodeType);
  }

  registerNodeTypes(nodeTypes: NodeType<TYPE_EXT,INST_EXT,any>[]) {
    for (let nodeType of nodeTypes) {
      this.registerNodeType(nodeType);
    }
  }

  lookupNodeType(typeName: string): NodeType<TYPE_EXT,INST_EXT,any> | undefined {
    return this.noteTypeNameToNodeTypeMap.get(typeName);
  }
}
