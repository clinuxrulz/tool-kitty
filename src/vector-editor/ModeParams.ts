import { Accessor } from "solid-js";
import { EcsWorld } from "../ecs/EcsWorld";
import { Vec2 } from "../math/Vec2";

export type ModeParams = {
  mousePos: Accessor<Vec2 | undefined>;
  screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined;
  worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined;
  world: Accessor<EcsWorld>;
  onDone: () => void;
};
