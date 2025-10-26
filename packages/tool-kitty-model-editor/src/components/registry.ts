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
import { sinXYZFieldComponentType } from "./SinXYZFieldComponent";
import { displaceComponentType } from "./DisplaceComponent";
import { repeatRotationalComponentType } from "./RepeatRotationalComponent";
import { bendComponentType } from "./BendComponent";
import { textureComponentType } from "./TextureComponent";
import { applyTextureComponentType } from "./ApplyTextureComponent";
import { coneComponentType } from "./ConeComponent";
import { torusComponentType } from "./TorusComponent";
import { mirrorComponentType } from "./MirrorComponent";
import { intersectionComponentType } from "./IntersectionComponent";
import { xorComponentType } from "./XorComponent";
import { octahedronComponentType } from "./OctahedronComponent";
import { roundComponentType } from "./RoundComponent";
import { heart2DComponentType } from "./Heart2DComponent";
import { extrusionComponentType } from "./ExtrusionComponent";
import { revolutionComponentType } from "./RevolutionComponent";
import { scaleXComponentType } from "./ScaleXComponent";
import { capsuleComponentType } from "./CapsuleComponent";

export const registry = new EcsRegistry([
  ...defaultRegistry.componentTypes,
  applyCheckersComponentType,
  applyColourComponentType,
  applyTextureComponentType,
  bendComponentType,
  boxComponentType,
  capsuleComponentType,
  colourComponentType,
  coneComponentType,
  cylinderComponentType,
  differenceComponentType,
  displaceComponentType,
  displayComponentType,
  extrusionComponentType,
  heart2DComponentType,
  infiniteCylinderComponentType,
  intersectionComponentType,
  mirrorComponentType,
  knobComponentType,
  numberComponentType,
  octahedronComponentType,
  repeatComponentType,
  repeatRotationalComponentType,
  revolutionComponentType,
  rotateComponentType,
  roundComponentType,
  scaleComponentType,
  scaleXComponentType,
  sinXYZFieldComponentType,
  sphereComponentType,
  textureComponentType,
  torusComponentType,
  transform2DComponentType,
  translateComponentType,
  unboundKnobComponentType,
  unionComponentType,
  vec3ComponentType,
  xorComponentType,
]);
