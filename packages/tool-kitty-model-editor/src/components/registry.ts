import { defaultRegistry, EcsRegistry } from "tool-kitty-ecs";
import { sphereComponentType } from "./SphereComponent";
import { numberComponentType } from "./NumberComponent";
import { displayComponentType } from "./DisplayComponent";
import { vec3ComponentType } from "./Vec3Component";

export const registry = new EcsRegistry([
  ...defaultRegistry.componentTypes,
  displayComponentType,
  numberComponentType,
  sphereComponentType,
  vec3ComponentType,
]);
