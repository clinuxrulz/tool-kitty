import { Accessor } from "solid-js";
import { UndoManager } from "../../pixel-editor/UndoManager";
import { Vec2 } from "../../math/Vec2";
import { EcsWorld } from "../../ecs/EcsWorld";
import { PickingSystem } from "./systems/PickingSystem";
import { Mode } from "./Mode";
import { AsyncResult } from "../../AsyncResult";
import { TextureAtlasState } from "../components/TextureAtlasComponent";
import { FrameState } from "../components/FrameComponent";
import { LevelState } from "../components/LevelComponent";
import { IEcsWorld } from "../../ecs/IEcsWorld";

export type ModeParams = {
  undoManager: UndoManager;
  mousePos: Accessor<Vec2 | undefined>;
  screenSize: Accessor<Vec2 | undefined>;
  screenPtToWorldPt(screenPt: Vec2): Vec2 | undefined;
  worldPtToScreenPt(worldPt: Vec2): Vec2 | undefined;
  world: Accessor<IEcsWorld>;
  tileWidth: Accessor<number>;
  tileHeight: Accessor<number>;
  level: Accessor<LevelState | undefined>;
  writeTile: (params: {
    xIdx: number;
    yIdx: number;
    textureAtlasRef: string;
    frameRef: string;
  }) => void;
  pickingSystem: PickingSystem;
  textureAtlases: Accessor<
    AsyncResult<
      {
        textureAtlasFilename: Accessor<string>;
        textureAtlas: TextureAtlasState;
        image: HTMLImageElement;
        frames: { frameId: string; frame: FrameState }[];
      }[]
    >
  >;
  onDone: () => void;
  setMode: (mkMode: () => Mode) => void;
};
