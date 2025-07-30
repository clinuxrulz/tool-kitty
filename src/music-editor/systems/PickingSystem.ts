import { Accessor, createMemo } from "solid-js";
import { NodesSystemNode } from "./NodesSystem";
import { Vec2 } from "../../lib";

export class PickingSystem {
  nodeUnderMouseById: Accessor<string | undefined>;

  constructor(params: {
    mousePos: Accessor<Vec2 | undefined>,
    screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined,
    nodes: Accessor<NodesSystemNode[]>,
  }) {
    let nodeUnderMouseById = createMemo(() => {
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
        return node.node.nodeParams.entity;
      }
      return undefined;
    });
    this.nodeUnderMouseById = nodeUnderMouseById;
  }
}
