import { Accessor } from "solid-js";
import { UndoManager } from "../../pixel-editor/UndoManager";
import { Vec2 } from "../../math/Vec2";
import { IEcsWorld } from "../../ecs/IEcsWorld";
import { AnimationState } from "../components/AnimationComponent";
import { Mode } from "./Mode";

export type ModeParams = {
  image: HTMLImageElement;
  undoManager: UndoManager;
  mousePos: Accessor<Vec2 | undefined>;
  screenPtToWorldPt(screenPt: Vec2): Vec2 | undefined;
  worldPtToScreenPt(worldPt: Vec2): Vec2 | undefined;
  world: Accessor<IEcsWorld>;
  animationLayout: Accessor<({
      size: Accessor<Vec2>;
      entity: string;
      animation: AnimationState;
      pos: Vec2;
  })[]>;
  onDone: () => void;
  setMode: (mkMode: () => Mode) => void;
  pan: () => Vec2,
  setPan: (x: Vec2) => void,
  scale: () => number,
  setScale: (x: number) => void,
};
