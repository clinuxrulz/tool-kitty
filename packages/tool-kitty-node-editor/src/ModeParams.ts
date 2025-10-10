import { Accessor } from "solid-js";
import { UndoManager } from "tool-kitty-util";
import { Vec2 } from "tool-kitty-math";
import { IEcsWorld } from "tool-kitty-ecs";
import { PickingSystem } from "./systems/PickingSystem";
import { NodesSystem } from "./systems/NodesSystem";
import { Mode } from "./Mode";
import { NodeRegistry } from "./NodeRegistry";

export type ModeParams<TYPE_EXT,INST_EXP> = {
  undoManager: UndoManager;
  nodeRegistry: NodeRegistry<TYPE_EXT,INST_EXP>;
  nodesSystem: NodesSystem<TYPE_EXT,INST_EXP>;
  pickingSystem: PickingSystem<TYPE_EXT,INST_EXP>;
  mousePos: Accessor<Vec2 | undefined>;
  screenPtToWorldPt(screenPt: Vec2): Vec2 | undefined;
  worldPtToScreenPt(worldPt: Vec2): Vec2 | undefined;
  world: Accessor<IEcsWorld>;
  onDone: () => void;
  pan: () => Vec2,
  setPan: (x: Vec2) => void,
  scale: () => number,
  setScale: (x: number) => void,
  setMode: (mkMode: () => Mode) => void,
};
