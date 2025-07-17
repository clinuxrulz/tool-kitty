import { Accessor, createMemo } from "solid-js";
import { Vec2 } from "../../math/Vec2";
import { Node, NODE_RADIUS, NODE_RADIUS_SQUARED } from "../Node";

export class PickingSystem {
  nodeUnderMouse: Accessor<Node | undefined>;

  constructor(params: {
    mousePos: Accessor<Vec2 | undefined>;
    screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined;
    nodes: Accessor<Node[]>;
  }) {
    let workingPt = createMemo(() => {
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      return params.screenPtToWorldPt(mousePos);
    });
    let nodeUnderMouse = createMemo(() => {
      let pt = workingPt();
      if (pt == undefined) {
        return undefined;
      }
      let closest: Node | undefined;
      let closestDist: number | undefined;
      for (let node of params.nodes()) {
        let dist = pt.distanceSquared(node.state.position);
        if (dist > NODE_RADIUS_SQUARED) {
          continue;
        }
        if (closestDist == undefined || dist < closestDist) {
          closest = node;
          closestDist = dist;
        }
      }
      return closest;
    });
    //
    this.nodeUnderMouse = nodeUnderMouse;
  }
}
