import { batch, ComponentProps, createComputed, createMemo, createSignal, JSX, mapArray, on, onCleanup, onMount, Show, splitProps, untrack } from "solid-js";
import { Vec2 } from "tool-kitty-math";
import { EcsRegistry, EcsWorld } from "tool-kitty-ecs";
import { createStore } from "solid-js/store";
import { createPanZoomManager, Overwrite, UndoManager } from "tool-kitty-util";
import { ModeParams } from "./ModeParams";
import { Mode } from "./Mode";
import { IdleMode } from "./modes/IdleMode";
import { NodesSystem } from "./systems/NodesSystem";
import { RenderSystem } from "./systems/RenderSystem";
import { AddNodeMode } from "./modes/AddNodeMode";
import { PickingSystem } from "./systems/PickingSystem";
import { ReactiveSet } from "@solid-primitives/set";
import { NodeRegistry } from "./NodeRegistry";
import FileSaver from "file-saver";

export type NodeEditorController<TYPE_EXT,INST_EXT> = {
  nodesSystem: NodesSystem<TYPE_EXT,INST_EXT>,
};

function NodeEditorUI<TYPE_EXT,INST_EXT>(props_:
  Overwrite<
    ComponentProps<"div">,
    {
      onInit: (controller: NodeEditorController<TYPE_EXT,INST_EXT>) => void,
      componentRegistry: EcsRegistry,
      nodeRegistry: NodeRegistry<TYPE_EXT,INST_EXT>,
      world: EcsWorld,
      toolbar: JSX.Element,
    }
  >
): JSX.Element {
  let [ props, rest, ] = splitProps(props_, [
    "onInit",
    "componentRegistry",
    "nodeRegistry",
    "world",
    "toolbar",
  ]);
  let nodeRegistry = props.nodeRegistry;
  let [ state, setState, ] = createStore<{
    pan: Vec2,
    scale: number,
    mousePos: Vec2 | undefined,
    mkMode: () => Mode,
    showCode: boolean,
    makeSound: boolean,
    freezePanZoom: boolean,
    filename: string,
  }>({
    pan: Vec2.zero,
    scale: 1.0,
    mousePos: undefined,
    mkMode: () => new IdleMode(modeParams),
    showCode: false,
    makeSound: false,
    freezePanZoom: false,
    filename: "node-graph",
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
    nodeRegistry,
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
  let modeParams: ModeParams<TYPE_EXT,INST_EXT> = {
    undoManager,
    nodeRegistry,
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
      (mode().disablePan?.() ?? false) || state.freezePanZoom || nodesSystem.disablePan()
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
  let onPointerDown = (e: PointerEvent) => {
    let rect = svgElement.getBoundingClientRect();
    setState(
      "mousePos",
      Vec2.create(e.clientX - rect.left, e.clientY - rect.top),
    );
    mode().dragStart?.();
    dragging = true;
    panZoomManager.onPointerDown(e)
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
    let rect = svgElement.getBoundingClientRect();
    setState(
      "mousePos",
      Vec2.create(e.clientX - rect.left, e.clientY - rect.top),
    );
    panZoomManager.onPointerMove(e);
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
  //
  props.onInit({
    nodesSystem,
  });
  //
  let [ fileInputElement, setFileInputElement, ] = createSignal<HTMLInputElement>();
  const load = async (file: File) => {
    let data = await file.text().then((x) => JSON.parse(x));
    let newWorld = EcsWorld.fromJson(props.componentRegistry, data);
    if (newWorld.type == "Err") {
      alert(newWorld.message);
      return;
    }
    let newWorld2 = newWorld.value;
    batch(() => {
      let world = props.world;
      for (let entity of [...world.entities()]) {
        world.destroyEntity(entity);
      }
      for (let entity of newWorld2.entities()) {
        let components = newWorld2.getComponents(entity);
        world.createEntityWithId(entity, components);
      }
    });
    let filename = file.name;
    if (filename.endsWith(".json")) {
      filename = filename.slice(0, filename.length - 5);
    }
    setState("filename", filename);
  };
  const save = () => {
    let data = JSON.stringify(props.world.toJson(), undefined, 2);
    let blob = new Blob([ data ], { type: "application/json" });
    FileSaver.saveAs(blob, `${state.filename}.json`);
  };
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
            style="margin-left: 5px;"
            onClick={() => {
              let newName = window.prompt("Enter new filename:", state.filename);
              if (newName == null) {
                return;
              }
              newName = newName.trim();
              if (newName == "") {
                return;
              }
              setState("filename", newName);
            }}
          >
            <i class="fa-solid fa-t"></i>
          </button>
          <button
            class="btn btn-primary"
            style="margin-left: 5px;"
            onClick={() => fileInputElement()?.click()}
          >
            <i class="fa-solid fa-upload"></i>
          </button>
          <input
            ref={setFileInputElement}
            type="file"
            hidden
            onChange={(e) => {
              let files = e.currentTarget.files;
              if (files?.length != 1) {
                return;
              }
              let file = files[0];
              load(file);
              e.currentTarget.value = "";
            }}
          />
          <button
            class="btn btn-primary"
            style="margin-left: 5px;"
            onClick={() => save()}
          >
            <i class="fa-solid fa-download"></i>
          </button>
          <button
            class="btn btn-primary"
            style="margin-left: 5px;"
            onClick={() => setMode(() => new AddNodeMode(modeParams))}
          >
            Add Node
          </button>
          <button
            class="btn btn-primary"
            style="margin-left: 5px;"
            onClick={() => {
              deleteSelectedObjects();
            }}
            disabled={selectedEntitySet.size == 0}
          >
            Delete
          </button>
          {props.toolbar}
          <label class="label" style="margin-left: 5px;">
            <input
              type="checkbox"
              class="checkbox"
              checked={state.freezePanZoom}
              onChange={(e) => setState("freezePanZoom", e.currentTarget.checked)}
            />
            Freeze Pan/Zoom
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
              "user-select": "none",
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

export default NodeEditorUI;
