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
    let frameEntitites = createMemo(() =>
      params.world().entitiesWithComponentType(frameComponentType),
    );
    let frames: Accessor<{ entity: string; state: FrameState }[]>;
    {
      let frames_ = createMemo(
        mapArray(frameEntitites, (entity) => {
          let state = params
            .world()
            .getComponent(entity, frameComponentType)?.state;
          if (state == undefined) {
            return undefined;
          }
          return {
            entity,
            state,
          };
        }),
      );
      frames = createMemo(() => frames_().flatMap((x) => opToArr(x)));
    }
    let mkEntityUnderMouse = makeRefCountedMakeReactiveObject(() => {
      let workingPt = createMemo(() => {
        let mousePos = params.mousePos();
        if (mousePos == undefined) {
          return undefined;
        }
        return params.screenPtToWorldPt(mousePos);
      });
      return createMemo(() => {
        let mousePos = params.mousePos();
        if (mousePos == undefined) {
          return undefined;
        }
        let pt = workingPt();
        if (pt == undefined) {
          return undefined;
        }
        let closest: string | undefined;
        let closestDist: number | undefined = undefined;
        for (let { entity, state: frame } of frames()) {
          let minX = frame.pos.x;
          let maxX = frame.pos.x + frame.size.x;
          let minY = frame.pos.y;
          let maxY = frame.pos.y + frame.size.y;
          let pt1 = Vec2.create(minX, Math.max(minY, Math.min(maxY, pt.y)));
          let pt2 = Vec2.create(maxX, Math.max(minY, Math.min(maxY, pt.y)));
          let pt3 = Vec2.create(Math.max(minX, Math.min(maxX, pt.x)), minY);
          let pt4 = Vec2.create(Math.max(minX, Math.min(maxX, pt.x)), maxY);
          let pt5 = params.worldPtToScreenPt(pt1);
          let pt6 = params.worldPtToScreenPt(pt2);
          let pt7 = params.worldPtToScreenPt(pt3);
          let pt8 = params.worldPtToScreenPt(pt4);
          if (
            pt5 == undefined ||
            pt6 == undefined ||
            pt7 == undefined ||
            pt8 == undefined
          ) {
            return;
          }
          let dist = Math.min(
            pt5.distanceSquared(mousePos),
            pt6.distanceSquared(mousePos),
            pt7.distanceSquared(mousePos),
            pt8.distanceSquared(mousePos),
          );
          if (dist > SNAP_DIST_SQUARED) {
            continue;
          }
          if (closestDist == undefined || dist < closestDist) {
            closestDist = dist;
            closest = entity;
          }
        }
        return closest;
      });
    });
    this.mkEntityUnderMouse = mkEntityUnderMouse;
  }
}
