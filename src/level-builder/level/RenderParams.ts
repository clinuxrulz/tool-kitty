import { Accessor } from "solid-js";
import { Vec2 } from "../../math/Vec2";
import { AsyncResult } from "../../AsyncResult";
import { TextureAtlasState } from "../components/TextureAtlasComponent";
import { FrameState } from "../components/FrameComponent";
import { LevelState } from "../components/LevelComponent";

export interface RenderParams {
  worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined;
  tileWidth: Accessor<number>;
  tileHeight: Accessor<number>;
  level: Accessor<LevelState | undefined>;
  tileIndexToFrameMap: Accessor<
    | Map<
        number,
        {
          textureAtlasRef: string;
          frameRef: string;
        }
      >
    | undefined
  >;
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
}
