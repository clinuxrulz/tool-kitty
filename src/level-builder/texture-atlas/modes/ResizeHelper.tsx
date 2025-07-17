import {
  Accessor,
  batch,
  Component,
  createComputed,
  createMemo,
  For,
  on,
  Show,
  untrack,
} from "solid-js";
import { Vec2 } from "../../../math/Vec2";
import { ModeParams } from "../ModeParams";
import { createStore } from "solid-js/store";
import { NoTrack } from "../../../util";

const ANCHOR_SIZE = 30.0;
const SNAP_DIST = 30.0;
const SNAP_DIST_SQUARED = SNAP_DIST * SNAP_DIST;

export class ResizeHelper {
  overlaySvgUI: Component;
  dragStart: () => void;
  dragEnd: () => void;
  disableOneFingerPan: Accessor<boolean>;
  isOverAnchor: Accessor<boolean>;

  constructor(params: {
    mousePos: Accessor<Vec2 | undefined>;
    screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined;
    worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined;
    rect: {
      pos: Accessor<Vec2>;
      size: Accessor<Vec2>;
      setPos: (x: Vec2) => void;
      setSize: (x: Vec2) => void;
    };
  }) {
    let [state, setState] = createStore<{
      draggingAnchor:
        | NoTrack<{
            xType: "Left" | "Centre" | "Right";
            yType: "Top" | "Centre" | "Bottom";
            pickupPt: Vec2;
          }>
        | undefined;
    }>({
      draggingAnchor: undefined,
    });
    let anchors: {
      xType: "Left" | "Centre" | "Right";
      yType: "Top" | "Centre" | "Bottom";
      pt: Accessor<Vec2>;
    }[] = [
      {
        xType: "Left" as const,
        yType: "Top" as const,
        pt: createMemo(() => params.rect.pos()),
      },
      {
        xType: "Centre" as const,
        yType: "Top" as const,
        pt: createMemo(() =>
          Vec2.create(
            params.rect.pos().x + 0.5 * params.rect.size().x,
            params.rect.pos().y,
          ),
        ),
      },
      {
        xType: "Right" as const,
        yType: "Top" as const,
        pt: createMemo(() =>
          Vec2.create(
            params.rect.pos().x + params.rect.size().x,
            params.rect.pos().y,
          ),
        ),
      },
      {
        xType: "Left" as const,
        yType: "Centre" as const,
        pt: createMemo(() =>
          Vec2.create(
            params.rect.pos().x,
            params.rect.pos().y + 0.5 * params.rect.size().y,
          ),
        ),
      },
      {
        xType: "Right" as const,
        yType: "Centre" as const,
        pt: createMemo(() =>
          Vec2.create(
            params.rect.pos().x + params.rect.size().x,
            params.rect.pos().y + 0.5 * params.rect.size().y,
          ),
        ),
      },
      {
        xType: "Left" as const,
        yType: "Bottom" as const,
        pt: createMemo(() =>
          Vec2.create(
            params.rect.pos().x,
            params.rect.pos().y + params.rect.size().y,
          ),
        ),
      },
      {
        xType: "Centre" as const,
        yType: "Bottom" as const,
        pt: createMemo(() =>
          Vec2.create(
            params.rect.pos().x + 0.5 * params.rect.size().x,
            params.rect.pos().y + params.rect.size().y,
          ),
        ),
      },
      {
        xType: "Right" as const,
        yType: "Bottom" as const,
        pt: createMemo(() =>
          Vec2.create(
            params.rect.pos().x + params.rect.size().x,
            params.rect.pos().y + params.rect.size().y,
          ),
        ),
      },
    ];
    //
    let workingPt = createMemo(() => {
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      return params.screenPtToWorldPt(mousePos);
    });
    let anchorUnderMouse = createMemo(() => {
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let pt = workingPt();
      if (pt == undefined) {
        return undefined;
      }
      let closest: (typeof anchors)[0] | undefined;
      let closestDist: number | undefined = undefined;
      for (let anchor of anchors) {
        let pt2 = params.worldPtToScreenPt(anchor.pt());
        if (pt2 == undefined) {
          continue;
        }
        let dist = pt2.distanceSquared(mousePos);
        if (dist > SNAP_DIST_SQUARED) {
          continue;
        }
        if (closestDist == undefined || dist < closestDist) {
          closestDist = dist;
          closest = anchor;
        }
      }
      return closest;
    });
    //
    createComputed(
      on(
        () => state.draggingAnchor,
        () => {
          if (state.draggingAnchor == undefined) {
            return;
          }
          let resizeCorner = state.draggingAnchor.value;
          let initPos = untrack(params.rect.pos);
          let initSize = untrack(params.rect.size);
          createComputed(
            on(workingPt, () => {
              let workingPt2 = workingPt();
              if (workingPt2 == undefined) {
                return;
              }
              let offsetX = workingPt2.x - resizeCorner.pickupPt.x;
              let newX: number | undefined;
              let newWidth: number | undefined;
              if (resizeCorner.xType == "Left") {
                newX = initPos.x + offsetX;
                newWidth = initSize.x - offsetX;
              } else if (resizeCorner.xType == "Right") {
                newX = undefined;
                newWidth = initSize.x + offsetX;
              } else {
                newX = undefined;
                newWidth = undefined;
              }
              let offsetY = workingPt2.y - resizeCorner.pickupPt.y;
              let newY: number | undefined;
              let newHeight: number | undefined;
              if (resizeCorner.yType == "Top") {
                newY = initPos.y + offsetY;
                newHeight = initSize.y - offsetY;
              } else if (resizeCorner.yType == "Bottom") {
                newY = undefined;
                newHeight = initSize.y + offsetY;
              } else {
                newY = undefined;
                newHeight == undefined;
              }
              batch(() => {
                if (newX != undefined || newY != undefined) {
                  params.rect.setPos(
                    Vec2.create(newX ?? initPos.x, newY ?? initPos.y),
                  );
                }
                params.rect.setSize(
                  Vec2.create(newWidth ?? initSize.x, newHeight ?? initSize.y),
                );
              });
            }),
          );
        },
      ),
    );
    //
    this.overlaySvgUI = () => (
      <For each={anchors}>
        {(anchor) => {
          let pt = createMemo(() => params.worldPtToScreenPt(anchor.pt()));
          return (
            <Show when={pt()}>
              {(pt2) => (
                <circle
                  cx={pt2().x}
                  cy={pt2().y}
                  r={0.5 * ANCHOR_SIZE}
                  stroke="black"
                  stroke-width="2"
                  fill="none"
                  pointer-events="none"
                />
              )}
            </Show>
          );
        }}
      </For>
    );
    this.dragStart = () => {
      if (state.draggingAnchor == undefined) {
        let anchor = anchorUnderMouse();
        if (anchor != undefined) {
          let pt = workingPt();
          if (pt != undefined) {
            setState(
              "draggingAnchor",
              new NoTrack({
                xType: anchor.xType,
                yType: anchor.yType,
                pickupPt: pt,
              }),
            );
          }
        }
        return;
      }
    };
    this.dragEnd = () => {
      if (state.draggingAnchor != undefined) {
        setState("draggingAnchor", undefined);
      }
    };
    this.disableOneFingerPan = createMemo(() => {
      return (
        anchorUnderMouse() != undefined || state.draggingAnchor != undefined
      );
    });
    this.isOverAnchor = createMemo(() => anchorUnderMouse() != undefined);
  }
}
