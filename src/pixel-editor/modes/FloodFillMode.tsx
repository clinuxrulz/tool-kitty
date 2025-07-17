import {
  Component,
  createComputed,
  createMemo,
  on,
  onCleanup,
  Show,
} from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Vec2 } from "../../math/Vec2";
import { UndoUnit } from "../UndoManager";
import { createStore } from "solid-js/store";
import { floodFill } from "../shapes";
import { Colour } from "../../Colour";

export class FloodFillMode implements Mode {
  overlaySvgUI: Component;
  click: () => void;
  disableOneFingerPan: () => boolean = () => true;

  constructor(modeParams: ModeParams) {
    let workingPoint = createMemo(() => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let pt = modeParams.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return undefined;
      }
      return Vec2.create(Math.floor(pt.x), Math.floor(pt.y));
    });
    //
    let doFloodFill = () => {
      let pt = workingPoint();
      if (pt == undefined) {
        return;
      }
      let sourceColour = modeParams.readPixel(pt) ?? new Colour(0, 0, 0, 0);
      let dummy1 = Vec2.zero;
      let dummy2 = new Colour(0, 0, 0, 0);
      let fillColour = modeParams.currentColour();
      if (
        fillColour.r == sourceColour.r &&
        fillColour.g == sourceColour.g &&
        fillColour.b == sourceColour.b &&
        fillColour.a == sourceColour.a
      ) {
        return;
      }
      let undoStack: Vec2[] = [];
      floodFill(
        pt.x,
        pt.y,
        (x, y) => {
          dummy1 = Vec2.create(x, y);
          if (!modeParams.isInBounds(dummy1)) {
            return false;
          }
          modeParams.readPixel(dummy1, dummy2);
          return (
            dummy2.r == sourceColour.r &&
            dummy2.g == sourceColour.g &&
            dummy2.b == sourceColour.b &&
            dummy2.a == sourceColour.a
          );
        },
        (x, y) => {
          dummy1 = Vec2.create(x, y);
          undoStack.push(dummy1);
          modeParams.writePixel(dummy1, fillColour);
        },
      );
      let undoUnit: UndoUnit = {
        displayName: "Flood Fill",
        run(isUndo) {
          if (isUndo) {
            for (let pt of undoStack) {
              modeParams.writePixel(pt, sourceColour);
            }
          } else {
            for (let pt of undoStack) {
              modeParams.writePixel(pt, fillColour);
            }
          }
        },
      };
      modeParams.undoManager.pushUndoUnit(undoUnit);
    };
    //
    this.overlaySvgUI = () => {
      let pixelRect = createMemo(() => {
        let pt1 = workingPoint();
        if (pt1 == undefined) {
          return undefined;
        }
        let pt2 = Vec2.create(1, 1).add(pt1);
        let pt12 = modeParams.worldPtToScreenPt(pt1);
        if (pt12 == undefined) {
          return undefined;
        }
        let pt22 = modeParams.worldPtToScreenPt(pt2);
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
      if (pt != undefined) {
        doFloodFill();
      }
    };
  }
}
