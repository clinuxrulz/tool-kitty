import { Accessor, createMemo } from "solid-js";
import { NodesSystem, NodesSystemNode } from "./NodesSystem";
import { QuadraticBezier, Vec2 } from "tool-kitty-math";

const SNAP_DIST = 20;
const SNAP_DIST_SQUARED = SNAP_DIST * SNAP_DIST;

export class PickingSystem<TYPE_EXT,INST_EXT> {
  nodeUnderMouseById: Accessor<string | undefined>;
  edgeUnderMouse: Accessor<{
    id: `${string}-${string}-${string}-${string}-${string}`;
    source: {
        target: string;
        pin: string;
    };
    sink: {
        target: string;
        pin: string;
    };
    beziers: QuadraticBezier[];
  } | undefined>;
  pinUnderMouse: Accessor<{
    type: "Input";
    nodeId: string,
    name: string;
  } | {
    type: "Output";
    nodeId: string,
    name: string;
  } | undefined>;

  constructor(params: {
    mousePos: Accessor<Vec2 | undefined>,
    scale: Accessor<number>,
    screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined,
    worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined,
    nodesSystem: NodesSystem<TYPE_EXT,INST_EXT>,
  }) {
    let edgeUnderMouse = createMemo(() => {
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return;
      }
      let pt = params.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return;
      }
      let scale = params.scale();
      let closestDist: number | undefined = undefined;
      let closetsEdge: ReturnType<typeof params.nodesSystem.edges>[number] | undefined = undefined;
      for (let edge of params.nodesSystem.edges()) {
        for (let bezier of edge.beziers) {
          let dist = bezier.sdfWithLimit(pt, 10.0 / scale);
          if (dist == undefined) {
            continue;
          }
          if (closestDist == undefined || dist < closestDist) {
            closestDist = dist;
            closetsEdge = edge;
          }
        }
      }
      return closetsEdge;
    });
    let nodeUnderMouse = createMemo(() => {
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let pt = params.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return undefined;
      }
      for (let node of params.nodesSystem.nodes()) {
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
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let closest: { type: "Input" | "Output", nodeId: string, name: string } | undefined = undefined;
      let closestDist: number | undefined = undefined;
      for (let node of params.nodesSystem.nodes()) {
        let inputPinPositionsMap = node.inputPinPositionMap();
        if (inputPinPositionsMap != undefined) {
          for (let [ name, pos ] of inputPinPositionsMap.entries()) {
            let pt = node.space().pointFromSpace(pos);
            let pt2 = params.worldPtToScreenPt(pt);
            if (pt2 == undefined) {
              continue;
            }
            let dist = pt2.distanceSquared(mousePos);
            if (dist > SNAP_DIST_SQUARED) {
              continue;
            }
            if (closestDist == undefined || dist < closestDist) {
              closest = { type: "Input", nodeId: node.node.nodeParams.entity, name, };
              closestDist = dist;
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
            if (dist > SNAP_DIST_SQUARED) {
              continue;
            }
            if (closestDist == undefined || dist < closestDist) {
              closest = { type: "Output", nodeId: node.node.nodeParams.entity, name, };
              closestDist = dist;
            }
          }
        }
      }
      return closest;
    });
    this.nodeUnderMouseById = nodeUnderMouseById;
    this.edgeUnderMouse = edgeUnderMouse;
    this.pinUnderMouse = pinUnderMouse;
  }
}
