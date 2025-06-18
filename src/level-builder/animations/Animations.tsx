import {
  Component,
  ComponentProps,
  createMemo,
  mergeProps,
  Show,
  splitProps,
} from "solid-js";
import { IEcsWorld } from "../../ecs/IEcsWorld";
import { Overwrite } from "@bigmistqke/solid-fs-components";
import { createPanZoomManager } from "../../PanZoomManager";
import { createStore } from "solid-js/store";
import { Vec2 } from "../../math/Vec2";
import { ModeParams } from "./ModeParams";
import { UndoManager } from "../../pixel-editor/UndoManager";
import { Mode } from "./Mode";
import { IdleMode } from "./modes/IdleMode";
import { NewAnimationMode } from "./modes/NewAnimationMode";

const Animations: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      image: HTMLImageElement,
      world: IEcsWorld;
    }
  >
> = (props_) => {
  const [props, rest] = splitProps(props_, ["image", "world"]);
  let [state, setState] = createStore<{
    pan: Vec2;
    scale: number;
    mousePos: Vec2 | undefined;
    mkMode: () => Mode;
  }>({
    pan: Vec2.zero,
    scale: 2.0,
    mousePos: undefined,
    mkMode: () => new IdleMode(modeParams),
  });
  let undoManager = new UndoManager();
  let setMode = (mkMode: () => Mode) => {
    setState("mkMode", () => mkMode);
  };
  let modeParams: ModeParams = {
    image: props.image,
    undoManager,
    mousePos: () => state.mousePos,
    screenPtToWorldPt(screenPt) {
      return Vec2.create(
        state.pan.x + screenPt.x / state.scale,
        state.pan.y + screenPt.y / state.scale,
      );
    },
    worldPtToScreenPt(worldPt) {
      return Vec2.create(
        worldPt.x * state.scale - state.pan.x,
        worldPt.y * state.scale - state.pan.y,
      );
    },
    world: () => props.world,
    onDone: () => {
      setMode(() => new IdleMode(modeParams));
    },
  };
  let mode = createMemo(() => state.mkMode());
  let svgElement!: SVGSVGElement;
  let panZoomManager = createPanZoomManager({
    pan: () => state.pan,
    setPan: (x) => setState("pan", x),
    scale: () => state.scale,
    setScale: (x) => setState("scale", x),
    setPointerCapture: (pointerId) => svgElement.setPointerCapture(pointerId),
    releasePointerCapture: (pointerId) =>
      svgElement.releasePointerCapture(pointerId),
  });
  let transform = createMemo(
    () => `scale(${state.scale}) translate(${-state.pan.x} ${-state.pan.y})`,
  );
  let onClick = () => {

  };
  let onPointerDown = (e: PointerEvent) => {
    panZoomManager.onPointerDown(e);
  };
  let onPointerUp = (e: PointerEvent) => {
    panZoomManager.onPointerUp(e);
    if (panZoomManager.numTouches() == 0) {
      onClick();
    }
  };
  let onPointerCancel = (e: PointerEvent) => {
    panZoomManager.onPointerCancel(e);
  };
  let onPointerMove = (e: PointerEvent) => {
    panZoomManager.onPointerMove(e);
    let rect = svgElement.getBoundingClientRect();
    setState(
      "mousePos",
      Vec2.create(
        e.clientX - rect.left,
        e.clientY - rect.top,
      )
    );
  };
  let onPointerOut = (e: PointerEvent) => {
    if (panZoomManager.numTouches() == 0) {
      setState("mousePos", undefined);
    }
  };
  let onWheel = (e: WheelEvent) => {
    panZoomManager.onWheel(e);
  };
  //
  let newAnimation = () => {
    setMode(() => new NewAnimationMode(modeParams));
  };
  return (
    <div {...rest}>
      <div style={{
        "width": "100%",
        "height": "100%",
        "display": "flex",
        "flex-direction": "row",
      }}>
        <div>
          <button
            class="btn"
            style={{
              "white-space": "nowrap",
            }}
            onClick={() => newAnimation}
          >
            New Animation
          </button>
        </div>
        <div style={{
          "flex-grow": "1",
          "position": "relative",
        }}>
          <svg
            ref={svgElement}
            style={{
              "position": "absolute",
              "left": "0",
              "top": "0",
              "right": "0",
              "bottom": "0",
              "touch-action": "none",
            }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onPointerMove={onPointerMove}
            onWheel={onWheel}
            onPointerOut={onPointerOut}
          >
            <g transform={transform()}>
              <circle cx={50} cy={50} r={5} fill="red" />
              <Show when={mode().overlaySvg} keyed>
                {(ModeOverlaySvg) => (
                  <ModeOverlaySvg/>
                )}
              </Show>
            </g>
          </svg>
          <Show when={mode().instructions} keyed>
            {(ModeInstructions) => (
              <div
                style={{
                  "position": "absolute",
                  "left": "0",
                  "top": "0",
                  "padding-left": "5px",
                  "padding-top": "5px",
                }}
              >
                <ModeInstructions/>
              </div>
            )}
          </Show>
          <Show when={mode().overlayHtmlUi} keyed>
            {(ModeOverlayHtmlUi) => (
              <ModeOverlayHtmlUi/>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
};

export default Animations;
