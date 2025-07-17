import {
  Accessor,
  batch,
  Component,
  createComputed,
  createMemo,
  on,
  onCleanup,
  Show,
  untrack,
} from "solid-js";
import { createStore } from "solid-js/store";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Vec2 } from "../../../math/Vec2";
import { frameComponentType } from "../../components/FrameComponent";
import { UndoUnit } from "../../../pixel-editor/UndoManager";

export class MakeFrameMode implements Mode {
  instructions: Component;
  overlaySvgUI: Component;
  dragStart: () => void;
  dragEnd: () => void;
  disableOneFingerPan = () => true;

  constructor(modeParams: ModeParams) {
    let [state, setState] = createStore<{
      corner1: Vec2 | undefined;
      corner2: Vec2 | undefined;
    }>({
      corner1: undefined,
      corner2: undefined,
    });
    let workingPoint = createMemo(() => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let pt = modeParams.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return undefined;
      }
      return Vec2.create(Math.round(pt.x), Math.round(pt.y));
    });
    //
    let wipFrame = createMemo(() => {
      let pt1 = state.corner1;
      if (pt1 == undefined) {
        return undefined;
      }
      let pt2 = state.corner2 ?? workingPoint();
      if (pt2 == undefined) {
        return undefined;
      }
      let minX = Math.min(pt1.x, pt2.x);
      let minY = Math.min(pt1.y, pt2.y);
      let maxX = Math.max(pt1.x, pt2.x);
      let maxY = Math.max(pt1.y, pt2.y);
      return {
        pos: Vec2.create(minX, minY),
        size: Vec2.create(maxX - minX, maxY - minY),
      };
    });
    //
    let doInsertFrame: () => void = () => {};
    {
      let hasWipFrame = createMemo(() => wipFrame() != undefined);
      createComputed(() => {
        if (!hasWipFrame()) {
          return;
        }
        let wipFrame2 = wipFrame as Accessor<
          NonNullable<ReturnType<typeof wipFrame>>
        >;
        let frameComponent = frameComponentType.create({
          name: "TODO",
          pos: untrack(() => wipFrame2().pos),
          size: untrack(() => wipFrame2().size),
          numCells: Vec2.create(1, 1),
          metaData: null,
        });
        let world = modeParams.world();
        let entityId = untrack(() => world.createEntity([frameComponent]));
        createComputed(
          on(
            wipFrame2,
            () => {
              batch(() => {
                frameComponent.setState("pos", wipFrame2().pos);
                frameComponent.setState("size", wipFrame2().size);
              });
            },
            { defer: true },
          ),
        );
        let keepIt = false;
        doInsertFrame = () => {
          keepIt = true;
          let undoUnit: UndoUnit = {
            displayName: "Make Frame",
            run(isUndo) {
              if (isUndo) {
                world.destroyEntity(entityId);
              } else {
                world.createEntityWithId(entityId, [frameComponent]);
              }
            },
          };
          modeParams.undoManager.pushUndoUnit(undoUnit);
          batch(() => {
            setState("corner1", undefined);
            setState("corner2", undefined);
          });
        };
        onCleanup(() => {
          if (keepIt) {
            doInsertFrame = () => {};
            return;
          }
          world.destroyEntity(entityId);
        });
      });
    }
    //
    this.instructions = () => {
      return (
        <>
          <button class="btn" onClick={() => modeParams.onDone()}>
            End Mode
          </button>
          <br />
          Drag rectangles around stuff to make frames for.
        </>
      );
    };
    this.overlaySvgUI = () => {
      let pt = createMemo(() => {
        let pt2 = workingPoint();
        if (pt2 == undefined) {
          return undefined;
        }
        return modeParams.worldPtToScreenPt(pt2);
      });
      return (
        <Show when={pt()}>
          {(pt2) => (
            <Show when={modeParams.screenSize()}>
              {(screenSize) => (
                <>
                  <line
                    x1="0"
                    y1={pt2().y}
                    x2={screenSize().x}
                    y2={pt2().y}
                    stroke="gray"
                    stroke-width="2"
                    pointer-events="none"
                  />
                  <line
                    x1={pt2().x}
                    y1="0"
                    x2={pt2().x}
                    y2={screenSize().y}
                    stroke="gray"
                    stroke-width="2"
                    pointer-events="none"
                  />
                </>
              )}
            </Show>
          )}
        </Show>
      );
    };
    this.dragStart = () => {
      if (state.corner1 == undefined) {
        let pt = workingPoint();
        if (pt != undefined) {
          setState("corner1", pt);
        }
        return;
      }
    };
    this.dragEnd = () => {
      if (state.corner1 != undefined && state.corner2 == undefined) {
        let pt = workingPoint();
        if (pt != undefined) {
          setState("corner2", pt);
          doInsertFrame();
        }
        return;
      }
    };
  }
}
