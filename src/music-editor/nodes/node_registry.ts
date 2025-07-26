import { NodeType } from "../Node";
import { addNodeType } from "./AddNode";
import { attackNodeType } from "./AttackNode";
import { multNodeType } from "./MultNode";
import { noiseNodeType } from "./NoiseWaveNode";
import { numberNodeType } from "./NumberNode";
import { releaseNodeType } from "./ReleaseNode";
import { sawWaveNodeType } from "./SawWaveNode";
import { sineWaveNodeType } from "./SineWaveNode";
import { squareWaveNodeType } from "./SquareWaveNode";

const nodeTypes: NodeType<any>[] = [
  addNodeType,
  attackNodeType,
  multNodeType,
  noiseNodeType,
  numberNodeType,
  releaseNodeType,
  sawWaveNodeType,
  sineWaveNodeType,
  squareWaveNodeType,
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
