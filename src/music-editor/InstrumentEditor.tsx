import { Component, ComponentProps, createComputed, createMemo, createSignal, mapArray, on, onCleanup, onMount, Show, splitProps, untrack } from "solid-js";
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
import { AddNodeMode } from "./modes/AddNodeMode";
import { PickingSystem } from "./systems/PickingSystem";
import { ReactiveSet } from "@solid-primitives/set";
import { generateCode } from "./code-gen";

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
    showCode: boolean,
  }>({
    pan: Vec2.zero,
    scale: 1.0,
    mousePos: undefined,
    mkMode: () => new IdleMode(modeParams),
    showCode: false,
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
  let transform = createMemo(
    () => `scale(${state.scale}) translate(${-state.pan.x} ${-state.pan.y})`,
  );
  let setMode = (mkMode: () => Mode) => {
    setState("mkMode", () => mkMode);
  };
  let screenPtToWorldPt = (screenPt: Vec2): Vec2 | undefined => {
    return Vec2.create(
      state.pan.x + screenPt.x / state.scale,
      -(state.pan.y + screenPt.y / state.scale),
    );
  };
  let worldPtToScreenPt = (worldPt: Vec2): Vec2 | undefined => {
    return Vec2.create(
      (worldPt.x - state.pan.x) * state.scale,
      ((-worldPt.y) - state.pan.y) * state.scale,
    );
  };
  let nodesSystem = new NodesSystem({
    world: () => props.world,
  });
  let pickingSystem = new PickingSystem({
    mousePos: () => state.mousePos,
    screenPtToWorldPt,
    worldPtToScreenPt,
    nodes: () => nodesSystem.nodes(),
  });
  let highlightedEntitySet = new ReactiveSet<string>();
  let selectedEntitySet = new ReactiveSet<string>();
  let renderSystem = new RenderSystem({
    nodes: () => nodesSystem.nodes(),
    lookupNodeById: (nodeId) => nodesSystem.lookupNodeById(nodeId),
    highlightedEntitySet,
    selectedEntitySet,
  });
  let modeParams: ModeParams = {
    undoManager,
    nodesSystem,
    pickingSystem,
    mousePos: () => state.mousePos,
    screenPtToWorldPt,
    worldPtToScreenPt,
    world: () => props.world,
    onDone: () => {
      setMode(() => new IdleMode(modeParams));
    },
    pan: () => state.pan,
    setPan: (x) => setState("pan", x),
    scale: () => state.scale,
    setScale: (x) => setState("scale", x),
    setMode,
  };
  let mode = createMemo(() => state.mkMode());
  let panZoomManager = createPanZoomManager({
    pan: () => state.pan,
    setPan: (x) => setState("pan", x),
    scale: () => state.scale,
    setScale: (x) => setState("scale", x),
    setPointerCapture: (pointerId) => svgElement.setPointerCapture(pointerId),
    releasePointerCapture: (pointerId) =>
      svgElement.releasePointerCapture(pointerId),
    disableOneFingerPan: createMemo(() =>
      mode().disablePan?.() ?? false
    ),
  });
  let highlightedObjectsById = createMemo(() =>
    mode().highlightedObjectsById?.() ?? []
  );
  let selectedObjectsById = createMemo(() =>
    mode().selectedObjectsById?.() ?? [],
  );
  createComputed(mapArray(
    highlightedObjectsById,
    (entity) => {
      highlightedEntitySet.add(entity);
      onCleanup(() => {
        highlightedEntitySet.delete(entity);
      });
    },
  ));
  createComputed(mapArray(
    selectedObjectsById,
    (entity) => {
      selectedEntitySet.add(entity);
      onCleanup(() => {
        selectedEntitySet.delete(entity);
      });
    },
  ));
  let onClick = () => {
    mode().click?.();
  };
  let dragStartTimerId: number | undefined = undefined;
  let dragging = false;
  //const START_DRAG_DELAY_MS = 200;
  let onPointerDown = (e: PointerEvent) => {
    panZoomManager.onPointerDown(e);
    dragStartTimerId = window.setTimeout(
      () => {
        window.clearTimeout(dragStartTimerId);
        dragStartTimerId = undefined;
        dragging = true;
        mode().dragStart?.();
      },
      //START_DRAG_DELAY_MS,
    );
  };
  let onPointerUp = (e: PointerEvent) => {
    panZoomManager.onPointerUp(e);
    if (panZoomManager.numTouches() == 0) {
      onClick();
    }
    if (dragging) {
      mode().dragEnd?.();
    }
    window.clearTimeout(dragStartTimerId);
    dragStartTimerId = undefined;
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
  //
  let deleteSelectedObjects = () => {
    for (let objectId of selectedObjectsById()) {
      props.world.destroyEntity(objectId);
    }
    selectedEntitySet.clear();
  };
  // test
  setTimeout(() => {
    let world = props.world;
    if (world.entities().length != 0) {
      return;
    }
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
          <button
            class="btn btn-primary"
            onClick={() => setMode(() => new AddNodeMode(modeParams))}
          >
            Add Node
          </button>
          <button
            class="btn btn-primary"
            onClick={() => {
              deleteSelectedObjects();
            }}
            disabled={selectedEntitySet.size == 0}
          >
            Delete
          </button>
          <label class="label" style="margin-left: 5px;">
            <input
              type="checkbox"
              class="checkbox"
              checked={state.showCode}
              onChange={(e) => setState("showCode", e.currentTarget.checked)}
            />
            Show Code
          </label>
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
              <Show when={mode().overlaySvg} keyed>
                {(OverlaySvg) =>
                  <OverlaySvg/>
                }
              </Show>
            </g>
          </svg>
          <Show when={mode().sideForm?.() == undefined}>
            <Show when={mode().instructions} keyed>
              {(Instructions) => (
                <div
                  style={{
                    "position": "absolute",
                    "left": "0",
                    "top": "0",
                  }}
                >
                  <Instructions/>
                </div>
              )}
            </Show>
          </Show>
          <Show when={mode().sideForm?.()} keyed>
            {(SideForm) => (
              <div
                style={{
                  position: "absolute",
                  left: "0",
                  top: "0",
                  height: "100%",
                  display: "flex",
                  "flex-direction": "row",
                  "pointer-events": "none",
                }}
              >
                <div
                  style={{
                    background: "black",
                    "pointer-events": "auto",
                  }}
                >
                  <SideForm/>
                </div>
                <Show when={mode().instructions} keyed>
                  {(Instructions) => (
                    <div>
                      <div
                        style={{
                          "pointer-events": "auto",
                        }}
                      >
                        <Instructions/>
                      </div>
                    </div>
                  )}
                </Show>
              </div>
            )}
          </Show>
          <Show when={state.showCode}>
            <div
              class="bg-base"
              style={{
                position: "absolute",
                right: "0",
                top: "0",
                width: "35%",
                overflow: "auto",
              }}
            >
              <pre>
                {untrack(() => {
                  let code = createMemo(() => generateCode({
                    nodesSystem,
                  }));
                  return (<>{code()}</>);
                })}
              </pre>
            </div>
          </Show>
          <Show when={mode().overlayHtmlUi} keyed>
            {(OverlayHtmlUi) => (
              <OverlayHtmlUi/>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
};

export default InstrumentEditor;
