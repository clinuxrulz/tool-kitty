import {
  Accessor,
  Component,
  createComputed,
  createMemo,
  createUniqueId,
  on,
  onCleanup,
  untrack,
} from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { createStore } from "solid-js/store";
import { Vec2 } from "../../math/Vec2";
import { catmullRomSplineComponentType } from "../components/CatmullRomSplineComponent";
import { opToArr } from "../../kitty-demo/util";

export class InsertCatmullRomSplineMode implements Mode {
  instructions: Component;
  click: () => void;
  constructor(modeParams: ModeParams) {
    let [state, setState] = createStore<{
      controlPoints: Vec2[];
      isClosed: boolean;
    }>({
      controlPoints: [],
      isClosed: false,
    });
    let workingPt = createMemo(() => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      return modeParams.screenPtToWorldPt(mousePos);
    });
    let wipControlPoints = createMemo(() => {
      if (state.controlPoints.length == 0) {
        return undefined;
      }
      let workingPt2 = workingPt();
      if (state.controlPoints.length == 1 && workingPt2 == undefined) {
        return undefined;
      }
      return [...state.controlPoints, ...opToArr(workingPt2)];
    });
    let doInsert: () => void = () => {};
    {
      let hasWipControlPoints = createMemo(
        () => wipControlPoints() != undefined,
      );
      createComputed(() => {
        if (!hasWipControlPoints()) {
          return;
        }
        let wipControlPoints2 = wipControlPoints as Accessor<
          NonNullable<ReturnType<typeof wipControlPoints>>
        >;
        let world = modeParams.world();
        let spline = catmullRomSplineComponentType.create({
          controlPoints: untrack(wipControlPoints2),
          isClosed: untrack(() => state.isClosed),
        });
        let entity = untrack(() => world.createEntity([spline]));
        let keepIt = false;
        doInsert = () => {
          keepIt = true;
          modeParams.onDone();
        };
        onCleanup(() => {
          doInsert = () => {};
          if (keepIt) {
            return;
          }
          world.destroyEntity(entity);
        });
        createComputed(
          on(wipControlPoints2, () => {
            spline.setState("controlPoints", wipControlPoints2());
          }),
        );
        createComputed(
          on(
            () => state.isClosed,
            () => {
              spline.setState("isClosed", state.isClosed);
            },
          ),
        );
      });
    }
    this.instructions = () => {
      let closedId = createUniqueId();
      return (
        <>
          Click in the control points for your curve.
          <br />
          <button class="btn" onClick={() => doInsert()}>
            End Mode
          </button>
          <br />
          <br />
          <input
            id={closedId}
            type="checkbox"
            checked={state.isClosed}
            onChange={(e) => {
              setState("isClosed", e.currentTarget.checked);
            }}
          />
          <label
            for={closedId}
            style={{
              "padding-left": "5px",
            }}
          >
            Closed
          </label>
        </>
      );
    };
    this.click = () => {
      let pt = workingPt();
      if (pt != undefined) {
        setState("controlPoints", (x) => [...x, pt]);
      }
    };
  }
}
