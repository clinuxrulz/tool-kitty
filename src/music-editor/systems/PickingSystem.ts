import { Accessor, createMemo } from "solid-js";
import { NodesSystemNode } from "./NodesSystem";
import { Vec2 } from "../../lib";

const SNAP_DIST = 10;
const SNAP_DIST_SQUARED = SNAP_DIST * SNAP_DIST;

export class PickingSystem {
  nodeUnderMouseById: Accessor<string | undefined>;
  pinUnderMouse: Accessor<{
    type: "Input" | "Output";
    name: string;
  } | undefined>;

  constructor(params: {
    mousePos: Accessor<Vec2 | undefined>,
    screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined,
    worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined,
    nodes: Accessor<NodesSystemNode[]>,
  }) {
    let nodeUnderMouse = createMemo(() => {
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let pt = params.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return undefined;
      }
      for (let node of params.nodes()) {
        let renderSize = node.renderSize();
        if (renderSize == undefined) {
          continue;
        }
        let pt2 = node.space().pointToSpace(pt);
        if (pt2.x < 0 || pt2.y < 0 || pt2.x > renderSize.x || pt2.y > renderSize.y) {
          continue;
        }
        return node;
      }
      return undefined;
    });
    let nodeUnderMouseById = () => nodeUnderMouse()?.node.nodeParams.entity;
    let pinUnderMouse = createMemo(() => {
      let node = nodeUnderMouse();
      if (node == undefined) {
        return undefined;
      }
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let inputPinPositionsMap = node.inputPinPositionMap();
      if (inputPinPositionsMap != undefined) {
        for (let [ name, pos ] of inputPinPositionsMap.entries()) {
          let pt = node.space().pointFromSpace(pos);
          let pt2 = params.worldPtToScreenPt(pt);
          if (pt2 == undefined) {
            continue;
          }
          let dist = pt2.distanceSquared(mousePos);
          if (dist < SNAP_DIST_SQUARED) {
            return { type: "Input" as const, name, };
          }
        }
      }
      let outputPinPositionsMap = node.outputPinPositionMap();
      if (outputPinPositionsMap != undefined) {
        for (let [ name, pos ] of outputPinPositionsMap.entries()) {
          let pt = node.space().pointFromSpace(pos);
          let pt2 = params.worldPtToScreenPt(pt);
          if (pt2 == undefined) {
            continue;
          }
          let dist = pt2.distanceSquared(mousePos);
          if (dist < SNAP_DIST_SQUARED) {
            return { type: "Output" as const, name, };
          }
        }
      }
    });
    this.nodeUnderMouseById = nodeUnderMouseById;
    this.pinUnderMouse = pinUnderMouse;
  }
}
