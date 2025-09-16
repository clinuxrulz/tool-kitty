import { EcsRegistry } from "../../ecs/EcsRegistry";
import { registry as baseRegistry } from "../../ecs/components/registry";
import { attackComponentType } from "./AttackComponent";
import { releaseComponentType } from "./ReleaseComponentType";
import { multComponentType } from "./MultComponentType";
import { noiseWaveComponentType } from "./NoiseWaveComponent";
import { numberComponentType } from "./NumberComponent";
import { sawWaveComponentType } from "./SawWaveComponent";
import { sineWaveComponentType } from "./SineWaveComponent";
import { squareWaveComponentType } from "./SquareWaveComponent";
import { addComponentType } from "./AddComponent";
import { speakerComponentType } from "./SpeakerComponent";
import { pianoKeysComponentType } from "./PianoKeysComponent";
import { startComponentType } from "./StartComponent";
import { delayComponentType } from "./DelayComponent";
import { variableComponentType } from "./VariableComponent";
import { setVariableComponentType } from "./SetVariableComponent";
import { meowComponentType } from "./MeowComponent";
import { gotoComponentType } from "./GotoComponent";

export const registry = new EcsRegistry([
  ...baseRegistry.componentTypes,
  addComponentType,
  attackComponentType,
  delayComponentType,
  gotoComponentType,
  meowComponentType,
  multComponentType,
  noiseWaveComponentType,
  numberComponentType,
  pianoKeysComponentType,
  releaseComponentType,
  sawWaveComponentType,
  setVariableComponentType,
  sineWaveComponentType,
  speakerComponentType,
  squareWaveComponentType,
  startComponentType,
  variableComponentType,
]);
