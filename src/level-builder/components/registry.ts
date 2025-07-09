import { EcsRegistry } from "../../ecs/EcsRegistry";
import { frameComponentType } from "./FrameComponent";
import { registry as baseRegistry } from "../../ecs/components/registry";
import { textureAtlasComponentType } from "./TextureAtlasComponent";
import { levelComponentType } from "./LevelComponent";
import { animationComponentType } from "./AnimationComponent";
import { spawnComponentType } from "./SpawnComponent";

export const registry = new EcsRegistry([
  ...baseRegistry.componentTypes,
  animationComponentType,
  frameComponentType,
  levelComponentType,
  spawnComponentType,
  textureAtlasComponentType,
]);
