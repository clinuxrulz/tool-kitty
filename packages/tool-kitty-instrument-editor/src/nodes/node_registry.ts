import { addNodeType } from "./AddNode";
import { attackNodeType } from "./AttackNode";
import { delayNodeType } from "./DelayNode";
import { gotoNodeType } from "./GotoNode";
import { knobNodeType } from "./KnobNode";
import { meowNodeType } from "./MeowNode";
import { multNodeType } from "./MultNode";
import { noiseNodeType } from "./NoiseWaveNode";
import { noteNodeType } from "./NoteNode";
import { numberNodeType } from "./NumberNode";
import { pianoKeysNodeType } from "./PianoKeysNode";
import { releaseNodeType } from "./ReleaseNode";
import { sawWaveNodeType } from "./SawWaveNode";
import { setVariableNodeType } from "./SetVariableNode";
import { sineWaveNodeType } from "./SineWaveNode";
import { speakerNodeType } from "./SpeakerNode";
import { squareWaveNodeType } from "./SquareWaveNode";
import { startNodeType } from "./StartNode";
import { variableNodeType } from "./VariableNode";
import { NodeRegistry } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export const nodeRegistry = new NodeRegistry<NodeTypeExt,NodeExt>();

nodeRegistry.registerNodeTypes([
  addNodeType,
  attackNodeType,
  delayNodeType,
  gotoNodeType,
  knobNodeType,
  meowNodeType,
  multNodeType,
  noiseNodeType,
  noteNodeType,
  numberNodeType,
  pianoKeysNodeType,
  releaseNodeType,
  sawWaveNodeType,
  setVariableNodeType,
  sineWaveNodeType,
  speakerNodeType,
  squareWaveNodeType,
  startNodeType,
  variableNodeType,
]);
