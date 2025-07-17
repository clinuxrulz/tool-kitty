import { EcsRegistry } from "../../ecs/EcsRegistry";
import { catmullRomSplineComponentType } from "./CatmullRomSplineComponent";
import { nurbsComponentType } from "./NurbsComponent";

export const registry = new EcsRegistry([
  catmullRomSplineComponentType,
  nurbsComponentType,
]);
