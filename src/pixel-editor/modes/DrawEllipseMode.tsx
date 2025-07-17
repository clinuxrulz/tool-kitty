import { createStore } from "solid-js/store";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Vec2 } from "../../math/Vec2";
import {
  Accessor,
  batch,
  Component,
  createComputed,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from "solid-js";
import { drawEllipse } from "../shapes";
import { Colour } from "../../Colour";
import { UndoUnit } from "../UndoManager";
import { ResizeHelper } from "../../level-builder/texture-atlas/modes/ResizeHelper";

export class DrawEllipseMode implements Mode {
  overlaySvgUI: Component;
  dragStart: () => void;
  dragEnd: () => void;
  disableOneFingerPan: () => boolean = () => true;
  done: () => void;

  constructor(modeParams: ModeParams) {
    let [state, setState] = createStore<{
      pos: Vec2 | undefined;
      size: Vec2 | undefined;
      isDragging: boolean;
    }>({
      pos: undefined,
      size: undefined,
      isDragging: false,
    });
    let workingPoint = createMemo(
      () => {
        let mousePos = modeParams.mousePos();
        if (mousePos == undefined) {
          return undefined;
        }
        let pt = modeParams.screenPtToWorldPt(mousePos);
        if (pt == undefined) {
          return undefined;
        }
        return Vec2.create(Math.floor(pt.x), Math.floor(pt.y));
      },
      undefined,
      {
        equals: (a, b) => {
          if (a == undefined || b == undefined) {
            return a == b;
          }
          return a.x == b.x && a.y == b.y;
        },
      },
    );
    createComputed(() => {
      if (!state.isDragging) {
        return;
      }
      if (state.pos == undefined) {
        return;
      }
      let pt = workingPoint();
      if (pt != undefined) {
        let minX = Math.min(state.pos.x, pt.x);
        let minY = Math.min(state.pos.y, pt.y);
        let maxX = Math.max(state.pos.x, pt.x);
        let maxY = Math.max(state.pos.y, pt.y);
        if (minX == maxX && minY == maxY) {
          return;
        }
        batch(() => {
          if (minX != state.pos?.x || minY != state.pos?.y) {
            setState("pos", Vec2.create(minX, minY));
          }
          setState("size", Vec2.create(maxX - minX, maxY - minY));
        });
      }
    });
    let hasRect = createMemo(
      () => state.pos != undefined && state.size != undefined,
    );
    let resizeHelper = createMemo(() => {
      if (!hasRect()) {
        return;
      }
      let pos = (() => state.pos) as Accessor<NonNullable<typeof state.pos>>;
      let size = (() => state.size) as Accessor<NonNullable<typeof state.size>>;
      return new ResizeHelper({
        mousePos: modeParams.mousePos,
        screenPtToWorldPt: modeParams.screenPtToWorldPt,
        worldPtToScreenPt: modeParams.worldPtToScreenPt,
        rect: {
          pos,
          size: createMemo(() => Vec2.create(size().x + 1, size().y + 1)),
          setPos: (pos) => {
            setState("pos", Vec2.create(Math.round(pos.x), Math.round(pos.y)));
          },
          setSize: (size) => {
            setState(
              "size",
              Vec2.create(Math.round(size.x) - 1, Math.round(size.y) - 1),
            );
          },
        },
      });
    });
    let doLine: () => void = () => {};
    {
      createComputed(() => {
        if (!hasRect()) {
          return;
        }
        let pos = (() => state.pos) as Accessor<NonNullable<typeof state.pos>>;
        let size = (() => state.size) as Accessor<
          NonNullable<typeof state.size>
        >;
        let undoStack: Colour[] = [];
        let posAndSize = createMemo(() => ({
          pos: pos(),
          size: size(),
        }));
        createComputed(() => {
          let newColour = modeParams.currentColour();
          let { pos: pos2, size: size2 } = posAndSize();
          drawEllipse(pos2.x, pos2.y, size2.x, size2.y, (x, y) => {
            let pos = Vec2.create(x, y);
            let oldColour = modeParams.readPixel(pos) ?? new Colour(0, 0, 0, 0);
            undoStack.push(oldColour);
          });
          drawEllipse(pos2.x, pos2.y, size2.x, size2.y, (x, y) => {
            let pos = Vec2.create(x, y);
            modeParams.writePixel(pos, newColour);
          });
          let keepIt = false;
          doLine = () => {
            keepIt = true;
            let undoStack2 = undoStack.splice(0, undoStack.length);
            let colour = modeParams.currentColour();
            let undoUnit: UndoUnit = {
              displayName: "Draw Line",
              run(isUndo) {
                if (isUndo) {
                  let atI = 0;
                  drawEllipse(pos2.x, pos2.y, size2.x, size2.y, (x, y) => {
                    let pos = Vec2.create(x, y);
                    modeParams.writePixel(pos, undoStack2[atI++]);
                  });
                } else {
                  drawEllipse(pos2.x, pos2.y, size2.x, size2.y, (x, y) => {
                    let pos = Vec2.create(x, y);
                    modeParams.writePixel(pos, colour);
                  });
                }
              },
            };
            modeParams.undoManager.pushUndoUnit(undoUnit);
            batch(() => {
              setState("pos", undefined);
              setState("size", undefined);
            });
          };
          onCleanup(() => {
            if (keepIt) {
              debugger;
              return;
            }
            let atI = 0;
            drawEllipse(pos2.x, pos2.y, size2.x, size2.y, (x, y) => {
              let pos = Vec2.create(x, y);
              modeParams.writePixel(pos, undoStack[atI++]);
            });
            undoStack.splice(0, undoStack.length);
          });
        });
      });
    }
    this.overlaySvgUI = () => {
      let pixelRect = createMemo(() => {
        let resizeHelper2 = resizeHelper();
        if (resizeHelper2 != undefined) {
          if (resizeHelper2.isOverAnchor()) {
            return undefined;
          }
        }
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
        <>
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
          <Show when={resizeHelper()}>
            {(resizeHelper2) => <>{resizeHelper2().overlaySvgUI({})}</>}
          </Show>
        </>
      );
    };
    this.dragStart = () => {
      let resizeHelper2 = resizeHelper();
      if (resizeHelper2 != undefined) {
        if (resizeHelper2.isOverAnchor()) {
          resizeHelper2.dragStart();
          return;
        }
      }
      if (state.pos != undefined && state.size != undefined) {
        doLine();
      }
      setState("isDragging", true);
      if (state.pos == undefined) {
        let pt = workingPoint();
        if (pt != undefined) {
          setState("pos", pt);
        }
        return;
      }
    };
    this.dragEnd = () => {
      resizeHelper()?.dragEnd?.();
      setState("isDragging", false);
      if (workingPoint() != undefined) {
        //doLine();
      }
    };
    this.done = () => {
      debugger;
      if (state.pos != undefined && state.size != undefined) {
        doLine();
      }
    };
  }
}
