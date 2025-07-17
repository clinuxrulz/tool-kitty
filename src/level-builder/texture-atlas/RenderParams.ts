import { Vec2 } from "../../math/Vec2";

export interface RenderParams {
  worldPtToScreenPt: (pt: Vec2) => Vec2 | undefined;
}
