import { NodeType } from "../Node";
import { addNodeType } from "./AddNode";
import { attackNodeType } from "./AttackNode";
import { multNodeType } from "./MultNode";
import { noisekNodeType } from "./NoiseWaveNode";
import { numberkNodeType } from "./NumberNode";
import { releaseNodeType } from "./ReleaseNode";

const nodeTypes: NodeType<any>[] = [
  addNodeType,
  attackNodeType,
  multNodeType,
  noisekNodeType,
  numberkNodeType,
  releaseNodeType,
];

const nodeTypeNameToNodeTypeMap = new Map<string,NodeType<any>>(
  nodeTypes.map((nodeType) => [ nodeType.componentType.typeName, nodeType, ])
);

export function getNodeTypes(): NodeType<any>[] {
  return nodeTypes;
}

export function lookupNodeType(typeName: string): NodeType<any> | undefined {
  return nodeTypeNameToNodeTypeMap.get(typeName);
}
