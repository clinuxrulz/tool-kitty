import { Accessor } from "solid-js";
import { Colour } from "../Colour";
import { Vec2 } from "../math/Vec2";
import { UndoManager } from "./UndoManager";

export type ModeParams = {
  undoManager: UndoManager;
  snapDist: Accessor<number>;
  snapDistSquared: Accessor<number>;
  mousePos: Accessor<Vec2 | undefined>;
  screenPtToWorldPt(screenPt: Vec2): Vec2 | undefined;
  worldPtToScreenPt(worldPt: Vec2): Vec2 | undefined;
  currentColour: Accessor<Colour>;
  setCurrentColour: (colour: Colour) => void;
  strokeThickness: Accessor<number>;
  isInBounds(pt: Vec2): boolean;
  readPixel(pt: Vec2, out?: Colour): Colour | undefined;
  writePixel(pt: Vec2, colour: Colour): void;
};
