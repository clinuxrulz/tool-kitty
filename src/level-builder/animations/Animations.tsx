import {
  Accessor,
  Component,
  ComponentProps,
  createMemo,
  createSignal,
  For,
  mapArray,
  mergeProps,
  onCleanup,
  Show,
  splitProps,
  untrack,
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
import { animationComponentType, AnimationState } from "../components/AnimationComponent";
import { opToArr } from "../../kitty-demo/util";
import { frameComponentType, FrameState } from "../components/FrameComponent";

const Animations: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      image: HTMLImageElement;
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
  let imageUrl: Accessor<string | undefined>;
  {
    let imageUrl_ = createMemo(() => {
      let canvas = document.createElement("canvas");
      canvas.width = props.image.naturalWidth;
      canvas.height = props.image.naturalHeight;
      let ctx = canvas.getContext("2d");
      if (ctx == null) {
        return undefined;
      }
      ctx.drawImage(props.image, 0, 0);
      let scopeDone = false;
      let [result, setResult] = createSignal<string>();
      onCleanup(() => {
        scopeDone = true;
        let result2 = result();
        if (result2 != undefined) {
          URL.revokeObjectURL(result2);
        }
      });
      canvas.toBlob((blob) => {
        if (scopeDone) {
          return;
        }
        if (blob == null) {
          return;
        }
        let url = URL.createObjectURL(blob);
        setResult(url);
      }, "image/png");
      return result;
    });
    imageUrl = createMemo(() => imageUrl_()?.());
  }
  //
  let animations: Accessor<{
    entity: string;
    animation: AnimationState,
  }[]>;
  {
    let animations_ = createMemo(mapArray(
      () => props.world.entitiesWithComponentType(animationComponentType),
      (entity) => {
        let animation = props.world.getComponent(entity, animationComponentType)?.state;
        if (animation == undefined) {
          return undefined;
        }
        return {
          entity,
          animation,
        };
      },
    ));
    animations = createMemo(() => animations_().flatMap((x) => opToArr(x)));
  }
  let frames: Accessor<{
    entity: string,
    frame: FrameState,
  }[]>;
  {
    let frames_ = createMemo(mapArray(
      () => props.world.entitiesWithComponentType(frameComponentType),
      (entity) => {
        let frame = props.world.getComponent(entity, frameComponentType)?.state;
        if (frame == undefined) {
          return undefined;
        }
        return {
          entity,
          frame,
        };
      },
    ));
    frames = createMemo(() => frames_().flatMap((x) => opToArr(x)));
  }
  let entityToFrameMap = createMemo(() => {
    let result = new Map<string,FrameState>();
    for (let { entity, frame, } of frames()) {
      result.set(entity, frame);
    }
    return result;
  });
  let animationsWithSize = createMemo(mapArray(
    animations,
    (animation) => {
      let size = createMemo(() => {
        let width = 0;
        let height = 0;
        for (let frameId of animation.animation.frameIds) {
          let frame = entityToFrameMap().get(frameId);
          if (frame == undefined) {
            continue;
          }
          width = Math.max(width, frame.size.x);
          height = Math.max(height, frame.size.y);
        }
        return Vec2.create(width, height);
      });
      return {
        ...animation,
        size,
      };
    },
  ));
  let animationLayout = createMemo(() => {
    let animationsWithSize2 = animationsWithSize();
    let result: (typeof animationsWithSize2[number] & {
      pos: Vec2,
    })[] = [];
    let numCols = 4;
    let atX = 0;
    let atY = 0;
    let maxRowHeight = 0;
    let atCol = 0;
    let gap = 10;
    for (let animation of animationsWithSize2) {
      let pos = Vec2.create(atX, atY);
      maxRowHeight = Math.max(maxRowHeight, animation.size().y);
      atX += animation.size().x + gap;
      atCol++;
      if (atCol == numCols) {
        atX = 0;
        atY += maxRowHeight + gap;
        atCol = 0;
        maxRowHeight = 0;
      }
      result.push({
        ...animation,
        pos,
      });
    }
    return result;
  });
  let animationCallbacks: ((t: number) => void)[] = [];
  let scopeDone = false;
  onCleanup(() => {
    scopeDone = true;
  });
  let animating = false;
  let animate = (t: number) => {
    if (scopeDone) {
      animating = false;
      return;
    }
    if (animationCallbacks.length == 0) {
      animating = false;
      return;
    }
    for (let cb of animationCallbacks) {
      cb(t);
    }
    requestAnimationFrame(animate);
  };
  let registerAnimation = (update: (t: number) => void) => {
    animationCallbacks.push(update);
    if (animationCallbacks.length == 1) {
      if (!animating) {
        animating = true;
        requestAnimationFrame(animate);
      }
    }
  };
  let deregisterAnimation = (update: (t: number) => void) => {
    let idx = animationCallbacks.indexOf(update);
    if (idx != -1) {
      animationCallbacks.splice(idx, 1);
    }
  };
  //
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
        (worldPt.x - state.pan.x) * state.scale,
        (worldPt.y - state.pan.y) * state.scale,
      );
    },
    world: () => props.world,
    animationLayout,
    onDone: () => {
      setMode(() => new IdleMode(modeParams));
    },
    setMode,
    pan: () => state.pan,
    setPan: (x) => setState("pan", x),
    scale: () => state.scale,
    setScale: (x) => setState("scale", x),
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
  //
  let newAnimation = () => {
    setMode(() => new NewAnimationMode(modeParams));
  };
  //
  let highlightedObjectsByIdSet = createMemo(() =>
    new Set(mode().highlightedObjectsById?.() ?? [])
  );
  let selectedObjectsByIdSet = createMemo(() =>
    new Set(mode().selectedObjectsById?.() ?? [])
  );
  //
  return (
    <div {...rest}>
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
            class="btn"
            style={{
              "white-space": "nowrap",
            }}
            onClick={() => newAnimation()}
          >
            New Animation
          </button>
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
              <For each={animationLayout()}>
                {(animation) => {
                  let [ state2, setState2 ] = createStore<{
                    atFrameIdx: number,
                  }>({
                    atFrameIdx: 0,
                  });
                  let frames_ = createMemo(mapArray(
                    () => animation.animation.frameIds,
                    (frameId) => {
                      return props.world.getComponent(
                        frameId,
                        frameComponentType,
                      )?.state;
                    },
                  ));
                  let frames = createMemo(() => frames_().flatMap((x) => opToArr(x)));
                  let incrementFrame = () => {
                    untrack(() => {
                      let nextFrame = state2.atFrameIdx + 1;
                      if (nextFrame >= frames().length) {
                        nextFrame = 0;
                      }
                      setState2("atFrameIdx", nextFrame);
                    });
                  };
                  let t0: number | undefined = undefined;
                  let atT = 0;
                  let fps = 10;
                  let frameDelayMs = 1000 / fps;
                  let update = (t: number) => {
                    if (t0 == undefined) {
                      t0 = t;
                      return;
                    }
                    let t2 = t - t0;
                    while (atT < t2) {
                      incrementFrame();
                      atT += frameDelayMs;
                    }
                  };
                  registerAnimation(update);
                  onCleanup(() => {
                    deregisterAnimation(update);
                  });
                  let currentFrame = createMemo(() => {
                    let frames2 = frames();
                    if (state2.atFrameIdx >= frames2.length) {
                      return undefined;
                    }
                    return frames2[state2.atFrameIdx];
                  });
                  return (
                    <Show when={currentFrame()}>
                      {(frame) => {
                        let backgroundWidth = createMemo(() => props.image.naturalWidth);
                        let backgroundHeight = createMemo(() => props.image.naturalHeight);
                        let isHighlighted = createMemo(() => highlightedObjectsByIdSet().has(animation.entity));
                        let isSelected = createMemo(() => selectedObjectsByIdSet().has(animation.entity));
                        return (<>
                          <image
                            x={animation.pos.x - frame().pos.x}
                            y={animation.pos.y - frame().pos.y}
                            width={backgroundWidth()}
                            height={backgroundHeight()}
                            style={{
                              "image-rendering": "pixelated",
                            }}
                            href={imageUrl()}
                            attr:clip-path={
                              `inset(` +
                              `${frame().pos.y}px ` +
                              `${(props.image.width - frame().pos.x - frame().size.x)}px ` +
                              `${(props.image.height - frame().pos.y - frame().size.y)}px ` +
                              `${frame().pos.x}px` +
                              `)`
                            }
                            preserveAspectRatio="none"
                          />
                          <Show when={isHighlighted() || isSelected()}>
                            <rect
                              x={animation.pos.x}
                              y={animation.pos.y}
                              width={animation.size().x}
                              height={animation.size().y}
                              fill={isSelected() ? "green" : "blue"}
                              stroke="none"
                              opacity={0.5}
                              pointer-events="none"
                            />
                          </Show>
                        </>);
                      }}
                    </Show>
                  );
                }}
              </For>
              <circle cx={-10} cy={-10} r={5} fill="red" />
              <Show when={mode().overlaySvg} keyed>
                {(ModeOverlaySvg) => <ModeOverlaySvg />}
              </Show>
            </g>
          </svg>
          <Show when={mode().instructions} keyed>
            {(ModeInstructions) => (
              <div
                class="bg-base-200/80"
                style={{
                  position: "absolute",
                  left: "0",
                  top: "0",
                  padding: "5px",
                }}
              >
                <ModeInstructions />
              </div>
            )}
          </Show>
          <Show when={mode().overlayHtmlUi} keyed>
            {(ModeOverlayHtmlUi) => <ModeOverlayHtmlUi />}
          </Show>
        </div>
      </div>
    </div>
  );
};

export default Animations;
