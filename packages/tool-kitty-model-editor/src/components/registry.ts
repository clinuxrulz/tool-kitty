import { defaultRegistry, EcsRegistry } from "tool-kitty-ecs";
import { sphereComponentType } from "./SphereComponent";
import { numberComponentType } from "./NumberComponent";
import { displayComponentType } from "./DisplayComponent";
import { vec3ComponentType } from "./Vec3Component";
import { boxComponentType } from "./BoxComponent";
import { translateComponentType } from "./TranslateComponent";
import { unionComponentType } from "./UnionComponent";
import { differenceComponentType } from "./DifferenceComponent";
import { repeatComponentType } from "./RepeatComponent";
import { transform2DComponentType } from "tool-kitty-math-ecs";
import { scaleComponentType } from "./ScaleComponent";
import { rotateComponentType } from "./RotateComponent";
import { infiniteCylinderComponentType } from "./InfiniteCylinderComponent";
import { colourComponentType } from "./ColourComponent";
import { applyColourComponentType } from "./ApplyColourComponent";
import { applyCheckersComponentType } from "./ApplyCheckersComponent";
import { knobComponentType } from "tool-kitty-instrument-editor/src/components/KnobComponent";
import { unboundKnobComponentType } from "./UnboundKnobComponent";
import { cylinderComponentType } from "./CylinderComponent";

export const registry = new EcsRegistry([
  ...defaultRegistry.componentTypes,
  applyCheckersComponentType,
  applyColourComponentType,
  boxComponentType,
  colourComponentType,
  cylinderComponentType,
  differenceComponentType,
  displayComponentType,
  infiniteCylinderComponentType,
  knobComponentType,
  numberComponentType,
  repeatComponentType,
  rotateComponentType,
  scaleComponentType,
  sphereComponentType,
  transform2DComponentType,
  translateComponentType,
  unboundKnobComponentType,
  unionComponentType,
  vec3ComponentType,
]);
