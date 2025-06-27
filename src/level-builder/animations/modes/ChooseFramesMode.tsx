import {
  Accessor,
  batch,
  Component,
  createComputed,
  createMemo,
  createSignal,
  For,
  mapArray,
  onCleanup,
  Show,
  untrack,
} from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import {
  frameComponentType,
  FrameState,
} from "../../components/FrameComponent";
import { opToArr } from "../../../kitty-demo/util";
import { Vec2 } from "../../../math/Vec2";
import { EcsComponent } from "../../../ecs/EcsComponent";
import { createStore } from "solid-js/store";

export class ChooseFramesMode implements Mode {
  instructions: Component;
  overlaySvg: Component;
  overlayHtmlUi: Component;
  click: () => void;

  constructor(params: {
    modeParams: ModeParams;
    initAnimationName: string;
    initFramesById: string[];
    onSelectionDone: (params: {
      animationName: string,
      framesById: string[],
    }) => void;
    onCancel: () => void,
  }) {
    let { modeParams, initFramesById, onSelectionDone } = params;
    let { initPan, initScale, } = untrack(() => ({
      initPan: modeParams.pan(),
      initScale: modeParams.scale(),
    }));
    onCleanup(() => {
      batch(() => {
        modeParams.setPan(initPan);
        modeParams.setScale(initScale);
      });
    });
    let [state, setState] = createStore<{
      animationName: string,
      selectedFramesById: string[];
    }>({
      animationName: params.initAnimationName,
      selectedFramesById: initFramesById,
    });
    let imageUrl_ = createMemo(() => {
      let canvas = document.createElement("canvas");
      canvas.width = modeParams.image.naturalWidth;
      canvas.height = modeParams.image.naturalHeight;
      let ctx = canvas.getContext("2d");
      if (ctx == null) {
        return undefined;
      }
      ctx.drawImage(modeParams.image, 0, 0);
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
    let imageUrl = createMemo(() => imageUrl_()?.());
    let frames: Accessor<
      {
        frameId: string;
        frame: FrameState;
      }[]
    >;
    {
      let frames_ = createMemo(
        mapArray(
          () =>
            modeParams.world().entitiesWithComponentType(frameComponentType),
          (entity) => {
            let frame = modeParams
              .world()
              .getComponent(entity, frameComponentType)?.state;
            if (frame == undefined) {
              return undefined;
            }
            return {
              frameId: entity,
              frame,
            };
          },
        ),
      );
      frames = createMemo(() => frames_().flatMap((x) => opToArr(x)));
    }
    let frameIdToFrameMap = createMemo(() => {
      let result = new Map<string, FrameState>();
      for (let frame of frames()) {
        result.set(frame.frameId, frame.frame);
      }
      return result;
    });
    const previewFps = 10;
    const previewFrameDelay = 1000 / previewFps;
    const previewScale = 3;
    let selectedFrames = createMemo(() => {
      let frameIdToFrameMap2 = frameIdToFrameMap();
      return state.selectedFramesById.flatMap((frameId) =>
        opToArr(frameIdToFrameMap2.get(frameId)),
      );
    });
    let framesSize = createMemo(() => {
      let width = 0;
      let height = 0;
      for (let frame of selectedFrames()) {
        width = Math.max(width, frame.size.x);
        height = Math.max(height, frame.size.y);
      }
      return Vec2.create(width, height);
    });
    let hasSelectedFrames = createMemo(() => selectedFrames().length != 0);
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    let previewCanvas = createMemo(() => {
      if (ctx == null) {
        return;
      }
      if (!hasSelectedFrames()) {
        return;
      }
      let selectedFrames2 = selectedFrames as Accessor<NonNullable<ReturnType<typeof selectedFrames>>>;
      createComputed(() => {
        canvas.width = framesSize().x * previewScale;
        canvas.height = framesSize().y * previewScale;
      });
      let scopeDone = false;
      onCleanup(() => {
        scopeDone = true;
      });
      let atFrameIdx = 0;
      let atT = 0;
      let selectedFrames3 = selectedFrames2();
      let animate = (t: number) => {
        if (scopeDone) {
          return;
        }
        if (selectedFrames3.length == 0) {
          return;
        }
        while (atT < t) {
          while (atFrameIdx >= selectedFrames3.length) {
            atFrameIdx -= selectedFrames3.length;
          }
          let frame = selectedFrames3[atFrameIdx];
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            modeParams.image,
            frame.pos.x,
            frame.pos.y,
            frame.size.x,
            frame.size.y,
            0,
            0,
            frame.size.x * previewScale,
            frame.size.y * previewScale,
          );
          atT += previewFrameDelay;
          ++atFrameIdx;
        }
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      return canvas;
    });
    let selectableFrameUnderMouse = createMemo(() => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return;
      }
      let pt = modeParams.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return;
      }
      for (let frame of frames()) {
        let pt2 = pt.sub(frame.frame.pos);
        if (
          pt2.x < 0.0 ||
          pt2.y < 0.0 ||
          pt2.x > frame.frame.size.x ||
          pt2.y > frame.frame.size.y
        ) {
          continue;
        }
        return frame;
      }
      return undefined;
    });
    this.overlaySvg = () => (
      <>
        <Show when={imageUrl()} keyed>
          {(imageUrl2) => (
            <image href={imageUrl2} style="image-rendering: pixelated;" />
          )}
        </Show>
        <For each={frames()}>
          {(frame) => {
            let isHighlighted = createMemo(
              () => selectableFrameUnderMouse()?.frameId == frame.frameId,
            );
            let isSelected = createMemo(() => state.selectedFramesById.includes(frame.frameId));
            let indices = createMemo(() => {
              let result: number[] = [];
              for (let i = 0; i < state.selectedFramesById.length; ++i) {
                if (state.selectedFramesById[i] == frame.frameId) {
                  result.push(i);
                }
              }
              return result;
            });
            let frameNumbersText = createMemo(() => {
              let indices2 = indices();
              if (indices2 == undefined) {
                return undefined;
              }
              return indices2.map((x) => (x + 1).toString()).join("/");
            });
            return (
              <>
                <rect
                  x={frame.frame.pos.x}
                  y={frame.frame.pos.y}
                  width={frame.frame.size.x}
                  height={frame.frame.size.y}
                  stroke="black"
                  stroke-width={2}
                  vector-effect="non-scaling-stroke"
                  fill={
                    isSelected() ? "green" : isHighlighted() ? "blue" : "none"
                  }
                  opacity={isSelected() || isHighlighted() ? 0.5 : 1.0}
                />
                <Show when={frameNumbersText()}>
                  {(frameNumbersText) => (
                    <text
                      x={frame.frame.pos.x + 0.5 * frame.frame.size.x}
                      y={frame.frame.pos.y + 0.5 * frame.frame.size.y}
                      text-anchor="middle"
                      dominant-baseline="middle"
                      fill="yellow"
                      stroke="black"
                      stroke-width="3"
                      vector-effect="non-scaling-stroke"
                    >
                      {frameNumbersText()}
                    </text>
                  )}
                </Show>
              </>
            );
          }}
        </For>
      </>
    );
    this.instructions = () => (
      <>
        Select Frames for Animation
        <br />
        <button
          class="btn btn-primary btn-sm"
          onClick={() => {
            setState("selectedFramesById", []);
          }}
        >
          Deselect Frames
        </button>
        <button
          class="btn btn-primary btn-sm"
          style="margin-left: 5px;"
          onClick={() => {
            onSelectionDone({
              animationName: state.animationName,
              framesById: state.selectedFramesById,
            });
          }}
        >
          Finish
        </button>
        <button
          class="btn btn-secondary btn-sm"
          style="margin-left: 5px;"
          onClick={() => {
            params.onCancel();
          }}
        >
          Cancel
        </button>
      </>
    );
    this.overlayHtmlUi = () => (
      <Show when={previewCanvas()}>
        {(previewCanvas) => (
          <div
            style={{
              position: "absolute",
              right: "5px",
              top: "0",
              display: "flex",
              "flex-direction": "column",
              "pointer-events": "none"
            }}
          >
            <label
              class="bg-base-200/80"
              style={{
                "pointer-events": "auto",
              }}
            >
              <span class="label">
                Name
              </span>
              <br/>
              <input
                class="input input-xs"
                type="text"
                value={state.animationName}
                onInput={(e) => {
                  setState("animationName", e.currentTarget.value);
                }}
                size={12}
              />
            </label>
            <div style={{
              display: "flex",
              "flex-direction": "row",
              "pointer-events": "none",
            }}>
              <div
                style={{
                  "flex-grow": "1",
                  "pointer-events": "none"
                }}
              />
              <div style={{
                border: "1px solid black",
                "pointer-events": "auto",
              }}>
                {previewCanvas()}
              </div>
            </div>
          </div>
        )}
      </Show>
    );
    this.click = () => {
      let frameId = selectableFrameUnderMouse()?.frameId;
      if (frameId == undefined) {
        return;
      }
      setState("selectedFramesById", (frameIds) => [...frameIds, frameId]);
    };
  }
}
