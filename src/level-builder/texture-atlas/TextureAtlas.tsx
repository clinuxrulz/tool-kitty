import JSZip from "jszip";
import {
  Accessor,
  batch,
  Component,
  createComputed,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  JSX,
  mergeProps,
  on,
  onCleanup,
  Setter,
  Show,
} from "solid-js";
import { Vec2 } from "../../math/Vec2";
import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { UndoManager, UndoUnit } from "../../pixel-editor/UndoManager";
import { Mode } from "./Mode";
import { ModeParams } from "./ModeParams";
import { MakeFrameMode } from "./modes/MakeFrameMode";
import { IdleMode } from "./modes/IdleMode";
import { EcsWorld } from "../../ecs/EcsWorld";
import { RenderSystem } from "./systems/RenderSystem";
import { RenderParams } from "./RenderParams";
import { PickingSystem } from "./systems/PickingSystem";
import { asyncFailed, AsyncResult, asyncSuccess } from "../../AsyncResult";
import { registry } from "../components/registry";
import { textureAtlasComponentType } from "../components/TextureAtlasComponent";
import { ReactiveVirtualFileSystem } from "../../ReactiveVirtualFileSystem";
import {
  AutomergeVfsFile,
  AutomergeVfsFolder,
  AutomergeVirtualFileSystem,
} from "solid-fs-automerge";
import { makeDocumentProjection } from "solid-automerge";
import { ok } from "../../kitty-demo/Result";
import { base64ToUint8Array, NoTrack } from "../../util";
import { IEcsWorld } from "../../ecs/IEcsWorld";
import { EcsWorldAutomergeProjection } from "../../ecs/EcsWorldAutomergeProjection";
import ImageToTilesetCreator from "./ImageToTilesetCreator";
import Animations from "../animations/Animations";
import { createPanZoomManager } from "../../PanZoomManager";
import { bundledAssets } from "../BundledAssetFilePicker";

type State = {
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
};

const AUTO_SAVE_TIMEOUT = 2000;

export class TextureAtlas {
  private undoManager: UndoManager;
  private state: Store<State>;
  private setState: SetStoreFunction<State>;
  private image: Accessor<HTMLImageElement | undefined>;
  private size: Accessor<Vec2 | undefined>;
  private screenPtToWorldPt: (screenPt: Vec2) => Vec2 | undefined;
  private worldPtToScreenPt: (worldPt: Vec2) => Vec2 | undefined;
  private svg: Accessor<SVGSVGElement | undefined>;
  private setSvg: Setter<SVGSVGElement | undefined>;
  private mode: Accessor<Mode>;
  private renderSystem: RenderSystem;
  Render: Component<{
    style?: JSX.CSSProperties;
    onBurger?: () => void;
  }>;

  constructor(params: {
    vfs: AutomergeVirtualFileSystem;
    imagesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
    textureAtlasesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
    textureAtlasFileId: Accessor<string | undefined>;
  }) {
    let undoManager = new UndoManager();
    let [state, setState] = createStore<State>({
      mousePos: undefined,
      pan: Vec2.create(-1, -1),
      scale: 30.0,
      mkMode: undefined,
      autoSaving: false,
      world: new EcsWorld(),
      overlayApp: undefined,
    });
    let [imageUrlDispose, setImageUrlDispose] = createSignal<() => void>(
      () => {},
    );
    let [imageFileId, setImageFileId] = createSignal<string>();
    let [image, setImage] = createSignal<HTMLImageElement>();
    let [size, setSize] = createSignal<Vec2>();
    onCleanup(() => {
      imageUrlDispose()();
    });
    createComputed(
      on([params.textureAtlasFileId], async () => {
        let textureAtlasFileId = params.textureAtlasFileId();
        if (textureAtlasFileId == undefined) {
          batch(() => {
            setState("world", new EcsWorld());
            setImage(undefined);
            setSize(undefined);
          });
          return;
        }
        let imagesFolder = params.imagesFolder();
        if (imagesFolder.type != "Success") {
          return;
        }
        let textureAtlasesFolder = params.textureAtlasesFolder();
        if (textureAtlasesFolder.type != "Success") {
          return;
        }
        let textureAtlasesFolder2 = textureAtlasesFolder.value;
        let imagesFolder2 = imagesFolder.value;
        let textureAtlasFileId2 = textureAtlasFileId;
        let textureAtlasData =
          textureAtlasesFolder2.openFileById(textureAtlasFileId2);
        createEffect(
          on(textureAtlasData, () => {
            let textureAtlasData2 = textureAtlasData();
            if (textureAtlasData2.type != "Success") {
              return;
            }
            let textureAtlasData3 = textureAtlasData2.value;
            let r = EcsWorldAutomergeProjection.create(
              registry,
              textureAtlasData3.docHandle,
            );
            if (r.type == "Err") {
              return;
            }
            let world = r.value;
            let entities = world.entitiesWithComponentType(
              textureAtlasComponentType,
            );
            if (entities.length != 1) {
              return;
            }
            let entity = entities[0];
            let textureAtlas = world.getComponent(
              entity,
              textureAtlasComponentType,
            )?.state;
            if (textureAtlas == undefined) {
              return;
            }
            let imageFilename = textureAtlas.imageRef;
            // "bundled:"" path
            {
              let bundledResourceRegEx = /^bundled:(.*?\.zip)\/(.*)$/;
              let match = bundledResourceRegEx.exec(imageFilename);
              if (match != null) {
                let zipFilename = match[1];
                let resourcePath = match[2];
                (async () => {
                  let url = bundledAssets[zipFilename];
                  if (url == undefined) {
                    return;
                  }
                  let response = await fetch(/* @vite-ignore */url);
                  let blob = await response.blob();
                  let zip = await JSZip.loadAsync(blob);
                  let file = zip.file(resourcePath);
                  if (file == null) {
                    return;
                  }
                  let blob2 = await file.async("blob");
                  let imageUrl = URL.createObjectURL(blob2);
                  imageUrlDispose()();
                  setImageUrlDispose(() => () => {
                    URL.revokeObjectURL(imageUrl);
                  });
                  let image = new Image();
                  image.src = imageUrl;
                  image.style.setProperty("image-rendering", "pixelated");
                  image.onload = () => {
                    batch(() => {
                      setImageFileId(imageFilename);
                      setImage(image);
                      setSize(Vec2.create(image.width, image.height));
                    });
                  };
                  setState("world", world);
                  //
                })();
                return;
              }
            }
            //
            let filesAndFolders = createMemo(() => imagesFolder2.contents);
            createEffect(
              on(filesAndFolders, () => {
                let imageFileId: string | undefined = undefined;
                for (let x of filesAndFolders()) {
                  if (x.name == imageFilename && x.type == "File") {
                    imageFileId = x.id;
                    break;
                  }
                }
                if (imageFileId == undefined) {
                  return;
                }
                let imageData = imagesFolder2.openFileById<{
                  mimeType: string;
                  data: Uint8Array;
                }>(imageFileId);
                createEffect(
                  on(imageData, () => {
                    let imageData2 = imageData();
                    if (imageData2.type != "Success") {
                      return imageData2;
                    }
                    let imageData3 = imageData2.value;
                    let blob = new Blob([imageData3.doc.data], {
                      type: imageData3.doc.mimeType,
                    });
                    let imageUrl = URL.createObjectURL(blob);
                    imageUrlDispose()();
                    setImageUrlDispose(() => () => {
                      URL.revokeObjectURL(imageUrl);
                    });
                    let image = new Image();
                    image.src = imageUrl;
                    image.style.setProperty("image-rendering", "pixelated");
                    image.onload = () => {
                      batch(() => {
                        setImageFileId(imageFileId);
                        setImage(image);
                        setSize(Vec2.create(image.width, image.height));
                      });
                    };
                    setState("world", world);
                  }),
                );
              }),
            );
          }),
        );
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
    let renderParams: RenderParams = {
      worldPtToScreenPt,
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
      pickingSystem,
      onDone: () => idle(),
      setMode,
    };
    let idle = () => {
      setMode(() => new IdleMode({ modeParams }));
    };
    let makeFrame = () => {
      setMode(() => new MakeFrameMode(modeParams));
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
    //
    this.undoManager = undoManager;
    this.state = state;
    this.setState = setState;
    this.image = image;
    this.size = size;
    this.screenPtToWorldPt = screenPtToWorldPt;
    this.worldPtToScreenPt = worldPtToScreenPt;
    this.svg = svg;
    this.setSvg = setSvg;
    this.mode = mode;
    this.renderSystem = renderSystem;
    //
    this.Render = (props) => {
      let Instructions = () => <>{mode().instructions?.({})}</>;
      let OverlaySvgUI = () => <>{mode().overlaySvgUI?.({})}</>;
      let OverlayHtmlUI = () => <>{mode().overlayHtmlUI?.({})}</>;
      let disableOneFingerPan = createMemo(
        () => mode().disableOneFingerPan?.() ?? false,
      );
      //
      let panZoomManager = createPanZoomManager({
        pan: () => state.pan,
        setPan: (x) => setState("pan", x),
        scale: () => state.scale,
        setScale: (x) => setState("scale", x),
        disableOneFingerPan,
        setPointerCapture: (x) => {
          svg()?.setPointerCapture(x);
        },
        releasePointerCapture: (x) => {
          svg()?.releasePointerCapture(x);
        },
      });
      //
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
        svg2.releasePointerCapture(e.pointerId);
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
        () =>
          `scale(${this.state.scale}) translate(${-this.state.pan.x} ${-this.state.pan.y})`,
      );
      return (
        <div
          style={mergeProps<[JSX.CSSProperties, JSX.CSSProperties]>(
            props.style ?? {},
            {
              display: "flex",
              "flex-direction": "column",
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
              disabled={!this.undoManager.canUndo()}
              onClick={() => this.undoManager.undo()}
            >
              <i class="fa-solid fa-rotate-left"></i>
            </button>
            <button
              class="btn"
              style="font-size: 20pt;"
              disabled={!this.undoManager.canRedo()}
              onClick={() => this.undoManager.redo()}
            >
              <i class="fa-solid fa-rotate-right"></i>
            </button>
            <button
              class="btn"
              style="position: relative;"
              onClick={() => makeFrame()}
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
              onClick={() => {
                setState(
                  "overlayApp",
                  new NoTrack({
                    Title: () => "Auto Frames",
                    View: () => (
                      <Show when={image()} keyed>
                        {(image) => (
                          <ImageToTilesetCreator
                            world={state.world}
                            image={image}
                            overwriteImage={async (newImage) => {
                              let imagesFolder = params.imagesFolder();
                              if (imagesFolder.type != "Success") {
                                return;
                              }
                              let imagesFolder2 = imagesFolder.value;
                              let imageFileId2 = imageFileId();
                              if (imageFileId2 == undefined) {
                                return;
                              }
                              let imageFile = imagesFolder2.openFileById<{
                                mimeType: string;
                                data: Uint8Array;
                              }>(imageFileId2);
                              let imageFile2 = await new Promise<
                                AutomergeVfsFile<{
                                  mimeType: string;
                                  data: Uint8Array;
                                }>
                              >((resolve, reject) =>
                                createRoot((dispose) => {
                                  createComputed(
                                    on(imageFile, (imageFile) => {
                                      if (imageFile.type == "Pending") {
                                        return;
                                      }
                                      if (imageFile.type == "Failed") {
                                        reject(imageFile.message);
                                        dispose();
                                        return;
                                      }
                                      resolve(imageFile.value);
                                      dispose();
                                    }),
                                  );
                                }),
                              );
                              let canvas = document.createElement("canvas");
                              canvas.width = newImage.naturalWidth;
                              canvas.height = newImage.naturalHeight;
                              let ctx = canvas.getContext("2d");
                              if (ctx == undefined) {
                                return;
                              }
                              ctx.drawImage(newImage, 0, 0);
                              canvas.toBlob(async (blob) => {
                                if (blob == null) {
                                  return;
                                }
                                let data = await blob.arrayBuffer();
                                let data2 = new Uint8Array(data);
                                imageFile2.docHandle.change((doc) => {
                                  doc.mimeType = "image/png";
                                  doc.data = data2;
                                });
                                setImage(newImage);
                              }, "image/png");
                            }}
                          />
                        )}
                      </Show>
                    ),
                  }),
                );
              }}
            >
              Auto Frames
            </button>
            <Show when={image()}>
              {(image2) => (
                <button
                  class="btn"
                  onClick={() => {
                    setState(
                      "overlayApp",
                      new NoTrack({
                        Title: () => "Animations",
                        View: () => (
                          <Animations
                            image={image2()}
                            world={state.world}
                            style={{
                              width: "100%",
                              height: "100%",
                            }}
                          />
                        ),
                      }),
                    );
                  }}
                >
                  Animations
                </button>
              )}
            </Show>
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
                "background-color": "#DDD",
                "background-image":
                  "linear-gradient(45deg, #FFFFFF 25%, transparent 25%), linear-gradient(-45deg, #FFFFFF 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #FFFFFF 75%), linear-gradient(-45deg, transparent 75%, #FFFFFF 75%)",
                "background-size": "20px 20px",
                "background-position": "0 0, 0 10px, 10px -10px, -10px 0px",
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
                <Show when={this.size()}>
                  {(size) => (
                    <Show when={this.image()}>
                      {(image) => (
                        <foreignObject width={size().x} height={size().y}>
                          {image()}
                        </foreignObject>
                      )}
                    </Show>
                  )}
                </Show>
                <renderSystem.Render />
              </g>
              <renderSystem.RenderOverlay />
              <OverlaySvgUI />
            </svg>
            <OverlayHtmlUI />
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
