import { Accessor, createMemo, mapArray } from "solid-js";
import { Vec2 } from "../../../math/Vec2";
import { EcsWorld } from "../../../ecs/EcsWorld";
import {
  frameComponentType,
  FrameState,
} from "../../components/FrameComponent";
import { makeRefCountedMakeReactiveObject } from "../../../util";
import { opToArr } from "../../../kitty-demo/util";
import { IEcsWorld } from "../../../ecs/IEcsWorld";

const SNAP_DIST = 10;
const SNAP_DIST_SQUARED = SNAP_DIST * SNAP_DIST;

export class PickingSystem {
  mkEntityUnderMouse: () => Accessor<string | undefined>;

  constructor(params: {
    mousePos: Accessor<Vec2 | undefined>;
    screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined;
    worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined;
    world: Accessor<IEcsWorld>;
  }) {
    this.mkEntityUnderMouse = () => () => undefined;
  }
}
