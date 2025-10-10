import { defaultRegistry, EcsRegistry } from "tool-kitty-ecs";
import { sphereComponentType } from "./SphereComponent";
import { numberComponentType } from "./NumberComponent";
import { displayComponentType } from "./DisplayComponent";

export const registry = new EcsRegistry([
  ...defaultRegistry.componentTypes,
  displayComponentType,
  numberComponentType,
  sphereComponentType,
]);
