import { Accessor } from "solid-js";
import { Node } from "./Node";
import { Vec2 } from "../math/Vec2";
import { PickingSystem } from "./systems/PickingSystem";

export type ModeParams = {
  mousePos: Accessor<Vec2 | undefined>;
  screenPtToWorldPt: (pt: Vec2) => Vec2 | undefined;
  worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined;
  nodes: Accessor<Node[]>;
  addNode: (node: Node) => void;
  removeNode: (node: Node) => void;
  onDone: () => void;
  pickingSystem: PickingSystem;
};
