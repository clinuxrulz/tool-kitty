import { EcsRegistry, defaultRegistry } from "tool-kitty-ecs";
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
import { noteComponentType } from "./NoteComponent";
import { knobComponentType } from "./KnobComponent";
import { transform2DComponentType } from "tool-kitty-math-ecs";

export const registry = new EcsRegistry([
  ...defaultRegistry.componentTypes,
  addComponentType,
  attackComponentType,
  delayComponentType,
  gotoComponentType,
  knobComponentType,
  meowComponentType,
  multComponentType,
  noiseWaveComponentType,
  noteComponentType,
  numberComponentType,
  pianoKeysComponentType,
  releaseComponentType,
  sawWaveComponentType,
  setVariableComponentType,
  sineWaveComponentType,
  speakerComponentType,
  squareWaveComponentType,
  startComponentType,
  transform2DComponentType,
  variableComponentType,
]);
