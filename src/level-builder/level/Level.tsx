import {
  Accessor,
  batch,
  Component,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  mapArray,
  mergeProps,
  on,
  onCleanup,
  Show,
} from "solid-js";
import { AsyncResult } from "../../AsyncResult";
import { VirtualFileSystem } from "../VirtualFileSystem";
import { createStore, produce } from "solid-js/store";
import { EcsWorld } from "../../ecs/EcsWorld";
import { UndoManager, UndoUnit } from "../../pixel-editor/UndoManager";
import { Vec2 } from "../../math/Vec2";
import { PickingSystem } from "./systems/PickingSystem";
import { ModeParams } from "./ModeParams";
import { Mode } from "./Mode";
import { RenderSystem } from "./systems/RenderSystem";
import { IdleMode } from "./modes/IdleMode";
import { RenderParams } from "./RenderParams";
import { registry } from "../components/registry";
import { TextureAtlasState } from "../components/TextureAtlasComponent";
import { FrameState } from "../components/FrameComponent";
import { InsertTileMode } from "./modes/InsertTileMode";
import { levelComponentType, LevelState } from "../components/LevelComponent";
import { EcsComponent } from "../../ecs/EcsComponent";
import { ReactiveVirtualFileSystem } from "../../ReactiveVirtualFileSystem";
import {
  AutomergeVfsFolder,
  AutomergeVirtualFileSystem,
} from "solid-fs-automerge";
import { EcsWorldAutomergeProjection } from "../../ecs/EcsWorldAutomergeProjection";
import { IEcsWorld } from "../../ecs/IEcsWorld";
import { NoTrack } from "../../util";
import ImageTileMatcher from "./ImageTileMatcher";
import { createPanZoomManager } from "../../PanZoomManager";
import { InsertSpawnMode } from "./modes/InsertSpawnMode";

const AUTO_SAVE_TIMEOUT = 2000;

export class Level {
  readonly Render: Component<{
    style?: JSX.CSSProperties;
    onBurger?: () => void;
  }>;

  constructor(params: {
    vfs: AutomergeVirtualFileSystem;
    imagesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
    textureAtlasesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
    levelFileId: Accessor<string | undefined>;
    textureAtlasWithImageAndFramesList: Accessor<
      AsyncResult<
        {
          textureAtlasFilename: Accessor<string>;
          textureAtlas: TextureAtlasState;
          image: HTMLImageElement;
          frames: { frameId: string; frame: FrameState }[];
        }[]
      >
    >;
  }) {
    // Short name
    let textureAtlases = params.textureAtlasWithImageAndFramesList;
    //
    let tileWidth: Accessor<number> = () => 16*3;
    let tileHeight: Accessor<number> = () => 16*3;
    //
    let [state, setState] = createStore<{
      mousePos: Vec2 | undefined;
      pan: Vec2;
      scale: number;
      //
      mkMode: (() => Mode) | undefined;
      //
      autoSaving: boolean;
      world: IEcsWorld;
      overlayApp:
        | NoTrack<{
            Title: Component;
            View: Component;
          }>
        | undefined;
    }>({
      mousePos: undefined,
      pan: Vec2.create(-1, -1),
      scale: 30.0,
      mkMode: undefined,
      autoSaving: false,
      world: new EcsWorld(),
      overlayApp: undefined,
    });
    let undoManager = new UndoManager();
    createEffect(
      on([params.levelFileId], () => {
        let levelFileId = params.levelFileId();
        if (levelFileId == undefined) {
          setState("world", new EcsWorld());
          return;
        }
        let levelFileId2 = levelFileId;
        let levelData = params.vfs.readFile(levelFileId2);
        createEffect(async () => {
          let levelData2 = levelData();
          if (levelData2.type != "Success") {
            return;
          }
          let levelData3 = levelData2.value;
          let r = EcsWorldAutomergeProjection.create(registry, levelData3);
          if (r.type == "Err") {
            return;
          }
          let world = r.value;
          setState("world", world);
        });
      }),
    );
    let [svg, setSvg] = createSignal<SVGSVGElement>();
    let [screenSize, setScreenSize] = createSignal<Vec2>();
    createComputed(
      on(svg, () => {
        let svg2 = svg();
        if (svg2 == undefined) {
          return;
        }
        let resizeObserver = new ResizeObserver(() => {
          let rect = svg2.getBoundingClientRect();
          setScreenSize(Vec2.create(rect.width, rect.height));
        });
        resizeObserver.observe(svg2);
        onCleanup(() => {
          resizeObserver.unobserve(svg2);
          resizeObserver.disconnect();
          setScreenSize(undefined);
        });
      }),
    );
    //
    let screenPtToWorldPt = (screenPt: Vec2): Vec2 | undefined => {
      return screenPt.multScalar(1.0 / state.scale).add(state.pan);
    };
    let worldPtToScreenPt = (worldPt: Vec2): Vec2 | undefined => {
      return worldPt.sub(state.pan).multScalar(state.scale);
    };
    //
    let levelComponent: Accessor<EcsComponent<LevelState> | undefined>;
    {
      let levelEntities = createMemo(() =>
        state.world.entitiesWithComponentType(levelComponentType),
      );
      levelComponent = createMemo(() => {
        let levelEntities2 = levelEntities();
        if (levelEntities2.length != 1) {
          return undefined;
        }
        let levelEntity = levelEntities2[0];
        return state.world.getComponent(levelEntity, levelComponentType);
      });
    }
    let level = createMemo(() => levelComponent()?.state);
    let tileIndexToFrameMap = createMemo(() => {
      let level2 = level();
      if (level2 == undefined) {
        return undefined;
      }
      let result = new Map<
        number,
        { textureAtlasRef: string; frameRef: string }
      >();
      for (let { textureAtlasRef, frames } of level2.tileToShortIdTable) {
        for (let frame of frames) {
          result.set(frame.shortId, {
            textureAtlasRef,
            frameRef: frame.frameId,
          });
        }
      }
      return result;
    });
    let maxTileIndex = createMemo(() => {
      let tileIndexToFrameMap2 = tileIndexToFrameMap();
      if (tileIndexToFrameMap2 == undefined) {
        return 0;
      }
      let maxTileIndex = 0;
      for (let tileIndex of tileIndexToFrameMap2.keys()) {
        maxTileIndex = Math.max(maxTileIndex, tileIndex);
      }
      return maxTileIndex;
    });
    let frameToTileIndexSep = "/";
    let frameToTileIndexMap = createMemo(() => {
      let level2 = level();
      if (level2 == undefined) {
        return undefined;
      }
      let result = new Map<string, number>();
      for (let { textureAtlasRef, frames } of level2.tileToShortIdTable) {
        for (let frame of frames) {
          result.set(
            textureAtlasRef + frameToTileIndexSep + frame.frameId,
            frame.shortId,
          );
        }
      }
      return result;
    });
    let frameToTileIndexOrCreate = (params: {
      textureAtlasRef: string;
      frameRef: string;
    }) => {
      let frameToTileIndexMap2 = frameToTileIndexMap();
      if (frameToTileIndexMap2 == undefined) {
        return undefined;
      }
      let r = frameToTileIndexMap2.get(
        params.textureAtlasRef + frameToTileIndexSep + params.frameRef,
      );
      if (r != undefined) {
        return r;
      }
      let maxIndex = maxTileIndex();
      let newIndex = maxIndex + 1;
      let levelComponent2 = levelComponent();
      if (levelComponent2 == undefined) {
        return undefined;
      }
      let idx1 = levelComponent2.state.tileToShortIdTable.findIndex(
        (x) => x.textureAtlasRef == params.textureAtlasRef,
      );
      if (idx1 == -1) {
        // FIX ME: We don't use the closure approach due to
        // the array proxy underneath not working 100%
        levelComponent2.setState(
          "tileToShortIdTable",
          produce((x) => {
            x.push({
              textureAtlasRef: params.textureAtlasRef,
              frames: [
                {
                  frameId: params.frameRef,
                  shortId: newIndex,
                },
              ],
            });
          }),
        );
      } else {
        levelComponent2.setState("tileToShortIdTable", idx1, "frames", [
          ...levelComponent2.state.tileToShortIdTable[idx1].frames,
          {
            frameId: params.frameRef,
            shortId: newIndex,
          },
        ]);
      }
      return newIndex;
    };
    let writeTile = (params: {
      xIdx: number;
      yIdx: number;
      textureAtlasRef: string;
      frameRef: string;
    }) => {
      let xIdx = params.xIdx;
      let yIdx = params.yIdx;
      let textureAtlasRef = params.textureAtlasRef;
      let frameRef = params.frameRef;
      let levelComponent2 = levelComponent();
      if (levelComponent2 == undefined) {
        return undefined;
      }
      let level2 = level();
      if (level2 == undefined) {
        return undefined;
      }
      if (yIdx < 0 || yIdx >= level2.mapData.length) {
        return;
      }
      let row = level2.mapData[yIdx];
      if (xIdx < 0 || xIdx >= row.length) {
        return;
      }
      let tileIndex = frameToTileIndexOrCreate({
        textureAtlasRef,
        frameRef,
      });
      if (tileIndex == undefined) {
        return;
      }
      levelComponent2.setState("mapData", yIdx, xIdx, tileIndex);
    };
    //
    let renderParams: RenderParams = {
      worldPtToScreenPt,
      textureAtlases,
      tileWidth,
      tileHeight,
      level,
      tileIndexToFrameMap,
    };
    //
    let pickingSystem = new PickingSystem({
      mousePos: () => state.mousePos,
      screenPtToWorldPt,
      worldPtToScreenPt,
      world: () => state.world,
    });
    //
    let setMode = (mkMode: () => void) => {
      setState("mkMode", () => mkMode);
    };
    let modeParams: ModeParams = {
      undoManager,
      mousePos: () => state.mousePos,
      screenSize,
      screenPtToWorldPt,
      worldPtToScreenPt,
      world: () => state.world,
      tileWidth,
      tileHeight,
      level,
      writeTile,
      pickingSystem,
      textureAtlases,
      onDone: () => idle(),
      setMode,
    };
    let idle = () => {
      setMode(() => new IdleMode({ modeParams }));
    };
    const insertTile = () => {
      setMode(() => new InsertTileMode(modeParams));
    };
    const insertSpawn = () => {
      setMode(() => new InsertSpawnMode(modeParams));
    };
    const launchImageTileMatcher = () => {
      setState(
        "overlayApp",
        new NoTrack({
          Title: () => "Image Tile Matcher",
          View: () => (
            <ImageTileMatcher
              textureAtlases={(() => {
                let result = textureAtlases();
                if (result.type != "Success") {
                  return [];
                }
                return result.value;
              })()}
              levelComponent={levelComponent()}
            />
          ),
        }),
      );
    };
    let mode = createMemo<Mode>(() => {
      if (state.mkMode == undefined) {
        return new IdleMode({ modeParams });
      }
      return state.mkMode();
    });
    let highlightedEntitiesSet = createMemo(() => {
      return new Set(mode().highlightedEntities?.() ?? []);
    });
    let selectedEntitiesSet = createMemo(() => {
      return new Set(mode().selectedEntities?.() ?? []);
    });
    let renderSystem = new RenderSystem({
      renderParams,
      world: () => state.world,
      highlightedEntitiesSet,
      selectedEntitiesSet,
    });
    let Instructions = () => <>{mode().instructions?.({})}</>;
    let OverlaySvgUI = () => <>{mode().overlaySvgUI?.({})}</>;
    let OverlayHtmlUI = () => <>{mode().overlayHtmlUI?.({})}</>;
    let disableOneFingerPan = createMemo(
      () => mode().disableOneFingerPan?.() ?? false,
    );
    let panZoomManager = createPanZoomManager({
      pan: () => state.pan,
      setPan: (x) => setState("pan", x),
      scale: () => state.scale,
      setScale: (x) => setState("scale", x),
      disableOneFingerPan,
      setPointerCapture: (pointerId) => {
        svg()?.setPointerCapture(pointerId);
      },
      releasePointerCapture: (pointerId) => {
        svg()?.releasePointerCapture(pointerId);
      },
    });
    let onWheel = (e: WheelEvent) => {
      panZoomManager.onWheel(e);
    };
    let onPointerDown = (e: PointerEvent) => {
      panZoomManager.onPointerDown(e);
      e.preventDefault();
      let svg2 = svg();
      if (svg2 == undefined) {
        return;
      }
      let rect = svg2.getBoundingClientRect();
      setState(
        "mousePos",
        Vec2.create(e.clientX - rect.left, e.clientY - rect.top),
      );
      if (panZoomManager.numTouches() == 1) {
        mode().dragStart?.();
      }
    };
    let onPointerUp = (e: PointerEvent) => {
      panZoomManager.onPointerUp(e);
      e.preventDefault();
      let svg2 = svg();
      if (svg2 == undefined) {
        return;
      }
      if (panZoomManager.numTouches() == 0) {
        mode().dragEnd?.();
        onClick();
      }
    };
    let onPointerCanceled = (e: PointerEvent) => {
      onPointerUp(e);
    };
    let onPointerMove = (e: PointerEvent) => {
      panZoomManager.onPointerMove(e);
      e.preventDefault();
      let svg2 = svg();
      if (svg2 == undefined) {
        return;
      }
      let rect = svg2.getBoundingClientRect();
      setState(
        "mousePos",
        Vec2.create(e.clientX - rect.left, e.clientY - rect.top),
      );
    };
    let onPointerLeave = (e: PointerEvent) => {
      e.preventDefault();
      if (panZoomManager.numTouches() == 0) {
        setState("mousePos", undefined);
      }
    };
    let onClick = () => {
      mode().click?.();
    };
    let onKeyDown = (e: KeyboardEvent) => {
      if (e.key == "Escape") {
        idle();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
    });
    //
    let transform = createMemo(
      () => `scale(${state.scale}) translate(${-state.pan.x} ${-state.pan.y})`,
    );
    this.Render = (props) => {
      return (
        <div
          style={mergeProps<[JSX.CSSProperties, JSX.CSSProperties]>(
            props.style ?? {},
            {
              display: "flex",
              "flex-direction": "column",
              position: "relative",
            },
          )}
        >
          <div>
            <Show when={props.onBurger}>
              {(onBurger) => (
                <button
                  class="btn"
                  style="font-size: 20pt;"
                  onClick={() => onBurger()()}
                >
                  <i class="fa-solid fa-burger"></i>
                </button>
              )}
            </Show>
            <button
              class="btn"
              style="font-size: 20pt;"
              disabled={!undoManager.canUndo()}
              onClick={() => undoManager.undo()}
            >
              <i class="fa-solid fa-rotate-left"></i>
            </button>
            <button
              class="btn"
              style="font-size: 20pt;"
              disabled={!undoManager.canRedo()}
              onClick={() => undoManager.redo()}
            >
              <i class="fa-solid fa-rotate-right"></i>
            </button>
            <button
              class="btn"
              style="position: relative;"
              onClick={() => insertTile()}
            >
              {(() => {
                let s = 0.5;
                return (
                  <>
                    <i
                      class="fa-regular fa-square"
                      style={{
                        "font-size": `${40 * s}pt`,
                      }}
                    />
                    <i
                      class="fa-solid fa-tree"
                      style={{
                        position: "absolute",
                        left: `50%`,
                        top: `50%`,
                        "-webkit-transform": "translate(-50%, -50%)",
                        transform: "translate(-50%, -50%)",
                        "font-size": `${24 * s}pt`,
                      }}
                    />
                  </>
                );
              })()}
            </button>
            <button
              class="btn"
              onClick={() => insertSpawn()}
            >
              <i class="fa-solid fa-location-dot"/>
            </button>
            <button class="btn" onClick={() => launchImageTileMatcher()}>
              Image Tile Matcher
            </button>
          </div>
          <div
            style={{
              "flex-grow": "1",
              display: "flex",
              "flex-direction": "column",
              position: "relative",
            }}
          >
            <svg
              ref={setSvg}
              style={{
                "flex-grow": "1",
                "background-color": "#FFF",
                "touch-action": "none",
              }}
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCanceled}
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              onContextMenu={(e) => {
                e.preventDefault();
                return false;
              }}
            >
              <g transform={transform()}>
                <renderSystem.Render />
              </g>
              <renderSystem.RenderOverlay />
              <OverlaySvgUI />
            </svg>
            {<OverlayHtmlUI />}
            <div
              style={{
                position: "absolute",
                left: "0",
                top: "0",
                "background-color": "rgba(0,0,0,0.8)",
              }}
            >
              <Show when={state.autoSaving}>
                Saving...
                <br />
              </Show>
              <Instructions />
            </div>
          </div>
          <Show when={state.overlayApp?.value} keyed={true}>
            {(overlayApp) => (
              <div
                style={{
                  position: "absolute",
                  left: "0",
                  top: "0",
                  bottom: "0",
                  right: "0",
                  display: "flex",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    "flex-grow": "1",
                    margin: "5%",
                    display: "flex",
                    "flex-direction": "column",
                    overflow: "hidden",
                  }}
                  class="bg-base-200 rounded-box"
                >
                  <div
                    style={{
                      display: "flex",
                      "flex-direction": "row",
                      padding: "10px",
                    }}
                    class="bg-base-300 rounded-box"
                  >
                    <div
                      style={{
                        "flex-grow": "1",
                        display: "flex",
                        "flex-direction": "row",
                        "align-items": "center",
                        overflow: "hidden",
                      }}
                    >
                      <overlayApp.Title />
                    </div>
                    <button
                      class="btn btn-primary"
                      onClick={() => setState("overlayApp", undefined)}
                    >
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <div
                    style={{
                      "flex-grow": "1",
                      display: "flex",
                      padding: "10px",
                      overflow: "hidden",
                    }}
                  >
                    <overlayApp.View />
                  </div>
                </div>
              </div>
            )}
          </Show>
        </div>
      );
    };
  }
}
