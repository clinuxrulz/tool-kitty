import { Component, createMemo, Show } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Vec2 } from "../../math/Vec2";

export class EyeDropperMode implements Mode {
  instructions: Component;
  overlaySvgUI: Component;
  click: () => void;

  constructor(params: ModeParams) {
    let workingPoint = createMemo(() => {
      let mousePos = params.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let pt = params.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return undefined;
      }
      return Vec2.create(Math.floor(pt.x), Math.floor(pt.y));
    });
    //
    this.instructions = () => {
      return "Click on a pixel to grab the colour of.";
    };
    this.overlaySvgUI = () => {
      let pixelRect = createMemo(() => {
        let pt1 = workingPoint();
        if (pt1 == undefined) {
          return undefined;
        }
        let pt2 = Vec2.create(1, 1).add(pt1);
        let pt12 = params.worldPtToScreenPt(pt1);
        if (pt12 == undefined) {
          return undefined;
        }
        let pt22 = params.worldPtToScreenPt(pt2);
        if (pt22 == undefined) {
          return undefined;
        }
        return {
          x: pt12.x - 1,
          y: pt12.y - 1,
          w: pt22.x - pt12.x + 2,
          h: pt22.y - pt12.y + 2,
        };
      });
      return (
        <Show when={pixelRect()}>
          {(pixelRect2) => (
            <rect
              x={pixelRect2().x}
              y={pixelRect2().y}
              width={pixelRect2().w}
              height={pixelRect2().h}
              stroke="black"
              stroke-width={2}
              fill="none"
              pointer-events="none"
            />
          )}
        </Show>
      );
    };
    this.click = () => {
      let pt = workingPoint();
      if (pt == undefined) {
        return;
      }
      let c = params.readPixel(pt);
      if (c != undefined) {
        params.setCurrentColour(c);
      }
    };
  }
}
