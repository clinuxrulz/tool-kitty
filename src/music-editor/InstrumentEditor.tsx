import { Component, ComponentProps, createMemo, createSignal, onCleanup, onMount, splitProps } from "solid-js";
import { Overwrite } from "../util";
import { Complex, EcsWorld, Transform2D, transform2DComponentType, Vec2 } from "../lib";
import { createStore } from "solid-js/store";
import { createPanZoomManager } from "../PanZoomManager";
import { ModeParams } from "./ModeParams";
import { UndoManager } from "../pixel-editor/UndoManager";
import { Mode } from "./Mode";
import { IdleMode } from "./modes/IdleMode";
import { NodesSystem } from "./systems/NodesSystem";
import { RenderSystem } from "./systems/RenderSystem";
import { sineWaveComponentType } from "./components/SineWaveComponent";

const InstrumentEditor: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      world: EcsWorld,
    }
  >
> = (props_) => {
  let [ props, rest, ] = splitProps(props_, [
    "world",
  ]);
  let [ state, setState, ] = createStore<{
    pan: Vec2,
    scale: number,
    mousePos: Vec2 | undefined,
    mkMode: () => Mode,
  }>({
    pan: Vec2.zero,
    scale: 1.0,
    mousePos: undefined,
    mkMode: () => new IdleMode(modeParams),
  });
  let undoManager = new UndoManager();
  let svgElement!: SVGSVGElement;
  let [ svgSize, setSvgSize, ] = createSignal<Vec2>(Vec2.zero);
  onMount(() => {
    {
      let rect = svgElement.getBoundingClientRect();
      setState("pan", Vec2.create(0.0, -rect.height));
    }
    let resizeObserver = new ResizeObserver(() => {
      let rect = svgElement.getBoundingClientRect();
      queueMicrotask(() => {
        setSvgSize(Vec2.create(rect.width, rect.height));
      });
    });
    resizeObserver.observe(svgElement);
    onCleanup(() => {
      resizeObserver.unobserve(svgElement);
      resizeObserver.disconnect();
    });
  });
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
  let setMode = (mkMode: () => Mode) => {
    setState("mkMode", () => mkMode);
  };
  let nodesSystem = new NodesSystem({
    world: () => props.world,
  });
  let renderSystem = new RenderSystem({
    nodes: () => nodesSystem.nodes(),
  });
  let modeParams: ModeParams = {
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
        (worldPt.x - state.pan.x) * state.scale,
        (worldPt.y - state.pan.y) * state.scale,
      );
    },
    world: () => props.world,
    onDone: () => {
      setMode(() => new IdleMode(modeParams));
    },
    pan: () => state.pan,
    setPan: (x) => setState("pan", x),
    scale: () => state.scale,
    setScale: (x) => setState("scale", x),
  };
  let mode = createMemo(() => state.mkMode());
  let onClick = () => {
    mode().click?.();
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
      Vec2.create(e.clientX - rect.left, e.clientY - rect.top),
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
  // test
  setTimeout(() => {
    let world = props.world;
    world.createEntity([
      sineWaveComponentType.create({
        frequency: undefined,
        amplitude: undefined,
        centre: undefined,
        out: [],
      }),
      transform2DComponentType.create({
        transform: Transform2D.create(
          Vec2.create(50, 50),
          Complex.rot0,
        ),
      }),
    ]);
  });
  //
  return (
    <div
      {...rest}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          "flex-direction": "column",
        }}
      >
        <div>
          Toolbar goes here!
        </div>
        <div
          style={{
            "flex-grow": "1",
            position: "relative",
          }}
        >
          <svg
            ref={svgElement}
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              width: "100%",
              height: "100%",
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
              <renderSystem.Render/>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default InstrumentEditor;
