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

export const registry = new EcsRegistry([
  ...defaultRegistry.componentTypes,
  boxComponentType,
  differenceComponentType,
  displayComponentType,
  numberComponentType,
  repeatComponentType,
  sphereComponentType,
  transform2DComponentType,
  translateComponentType,
  unionComponentType,
  vec3ComponentType,
]);
