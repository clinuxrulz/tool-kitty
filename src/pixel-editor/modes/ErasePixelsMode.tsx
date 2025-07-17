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
import { Colour } from "../../Colour";

export class ErasePixelsMode implements Mode {
  instructions: Component;
  overlaySvgUI: Component;
  dragStart: () => void;
  dragEnd: () => void;
  disableOneFingerPan: () => boolean = () => true;

  constructor(params: ModeParams) {
    let [state, setState] = createStore<{
      dragging: boolean;
    }>({
      dragging: false,
    });
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
    let writePixel = (pt: Vec2): UndoUnit | undefined => {
      let oldColour = params.readPixel(pt);
      if (oldColour == undefined) {
        return undefined;
      }
      let newColour = new Colour(0, 0, 0, 0);
      if (
        newColour.r == oldColour.r &&
        newColour.g == oldColour.g &&
        newColour.b == oldColour.b &&
        newColour.a == oldColour.a
      ) {
        return undefined;
      }
      params.writePixel(pt, newColour);
      let undoUnit: UndoUnit = {
        displayName: "Draw Pixel",
        run(isUndo) {
          if (isUndo) {
            params.writePixel(pt, oldColour);
          } else {
            params.writePixel(pt, newColour);
          }
        },
      };
      return undoUnit;
    };
    //
    createComputed(
      on([() => state.dragging], () => {
        if (!state.dragging) {
          return;
        }
        let undoStack: UndoUnit[] = [];
        onCleanup(() => {
          if (undoStack.length != 0) {
            let undoStack2: UndoUnit[] = undoStack;
            undoStack = [];
            let undoUnit: UndoUnit = {
              displayName: undoStack2[0].displayName,
              run(isUndo) {
                for (let x of undoStack2) {
                  x.run(isUndo);
                }
              },
            };
            params.undoManager.pushUndoUnit(undoUnit);
          }
        });
        createComputed(
          on(workingPoint, () => {
            let pt = workingPoint();
            if (!pt) {
              return;
            }
            let undoUnit = writePixel(pt);
            if (undoUnit != undefined) {
              undoStack.push(undoUnit);
            }
          }),
        );
      }),
    );
    //
    this.instructions = () => {
      return "Click to draw pixels, press escape when done.";
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
    this.dragStart = () => {
      setState("dragging", true);
    };
    this.dragEnd = () => {
      setState("dragging", false);
    };
  }
}
