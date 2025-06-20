import {
  Component,
  createComputed,
  createMemo,
  on,
  onCleanup,
  Show,
  untrack,
} from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Vec2 } from "../../math/Vec2";
import { UndoUnit } from "../UndoManager";
import { createStore } from "solid-js/store";
import { drawFilledCircle, drawLine } from "../shapes";
import { Colour } from "../../Colour";

export class DrawPixelsMode implements Mode {
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
      let newColour = params.currentColour();
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
        let lastPos: Vec2 | undefined = undefined;
        let undoStack: UndoUnit[] = [];
        onCleanup(() => {
          if (undoStack.length != 0) {
            let undoStack2: UndoUnit[] = undoStack;
            undoStack2.reverse();
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
            // do without undo/redo if stroke thickness greater than 1
            let strokeThickness = params.strokeThickness();
            if (strokeThickness > 1) {
              let r = strokeThickness;
              if (lastPos == undefined) {
                drawFilledCircle(pt.x, pt.y, strokeThickness, (x, y) => {
                  let dummy = Vec2.create(x, y);
                  params.writePixel(dummy, params.currentColour());
                });
                lastPos = pt;
              } else {
                let lastPos2 = lastPos;
                drawFilledCircle(pt.x, pt.y, strokeThickness, (x, y) => {
                  let fromX = x - pt.x + lastPos2.x;
                  let fromY = y - pt.y + lastPos2.y;
                  drawLine(fromX, fromY, x, y, (x, y) => {
                    let dummy = Vec2.create(x, y);
                    params.writePixel(dummy, params.currentColour());
                  });
                });
                lastPos = pt;
              }
              return;
            }
            //
            if (lastPos == undefined) {
              let undoUnit = writePixel(pt);
              if (undoUnit != undefined) {
                undoStack.push(undoUnit);
              }
              lastPos = pt;
            } else {
              let lastPixels: Colour[] = [];
              let dummy = Vec2.zero;
              let colour = untrack(() => params.currentColour());
              drawLine(lastPos.x, lastPos.y, pt.x, pt.y, (x, y) => {
                dummy = Vec2.create(x, y);
                lastPixels.push(
                  params.readPixel(dummy) ?? new Colour(0, 0, 0, 0),
                );
                params.writePixel(dummy, colour);
              });
              let from = lastPos;
              lastPos = pt;
              let undoUnit: UndoUnit = {
                displayName: "Draw Pixel",
                run(isUndo) {
                  if (isUndo) {
                    let idx = 0;
                    drawLine(from.x, from.y, pt.x, pt.y, (x, y) => {
                      dummy = Vec2.create(x, y);
                      params.writePixel(dummy, lastPixels[idx++]);
                    });
                  } else {
                    drawLine(from.x, from.y, pt.x, pt.y, (x, y) => {
                      dummy = Vec2.create(x, y);
                      params.writePixel(dummy, colour);
                    });
                  }
                },
              };
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
