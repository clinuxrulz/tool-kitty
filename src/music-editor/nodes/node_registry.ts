import { NodeType } from "../Node";
import { addNodeType } from "./AddNode";
import { attackNodeType } from "./AttackNode";
import { delayNodeType } from "./DelayNode";
import { multNodeType } from "./MultNode";
import { noiseNodeType } from "./NoiseWaveNode";
import { numberNodeType } from "./NumberNode";
import { pianoKeysNodeType } from "./PianoKeysNode";
import { releaseNodeType } from "./ReleaseNode";
import { sawWaveNodeType } from "./SawWaveNode";
import { sineWaveNodeType } from "./SineWaveNode";
import { speakerNodeType } from "./SpeakerNode";
import { squareWaveNodeType } from "./SquareWaveNode";
import { startNodeType } from "./StartNode";

const nodeTypes: NodeType<any>[] = [
  addNodeType,
  attackNodeType,
  delayNodeType,
  multNodeType,
  noiseNodeType,
  numberNodeType,
  pianoKeysNodeType,
  releaseNodeType,
  sawWaveNodeType,
  sineWaveNodeType,
  speakerNodeType,
  squareWaveNodeType,
  startNodeType,
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
