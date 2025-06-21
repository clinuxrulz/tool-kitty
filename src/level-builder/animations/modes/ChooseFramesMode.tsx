import { Accessor, Component, createMemo, createSignal, For, mapArray, onCleanup, Show } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { frameComponentType, FrameState } from "../../components/FrameComponent";
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
    modeParams: ModeParams,
    initFramesById: string[],
    onSelectionDone: (framesById: string[]) => void,
  }) {
    let { modeParams, initFramesById, onSelectionDone } = params;
    let [ state, setState ] = createStore<{
      selectedFramesById: string[]
    }>({
      selectedFramesById: initFramesById,
    });
    let selectedFramesByIdTIndexMap = createMemo(() => {
      let result = new Map<string,number>();
      let idx = 0;
      for (let frameId of state.selectedFramesById) {
        result.set(frameId, idx);
        ++idx;
      }
      return result;
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
      let [ result, setResult, ] = createSignal<string>();
      onCleanup(() => {
        scopeDone = true;
        let result2 = result();
        if (result2 != undefined) {
          URL.revokeObjectURL(result2);
        }
      });
      canvas.toBlob(
        (blob) => {
          if (scopeDone) {
            return;
          }
          if (blob == null) {
            return;
          }
          let url = URL.createObjectURL(blob);
          setResult(url);
        },
        "image/png",
      );
      return result;
    });
    let imageUrl = createMemo(() => imageUrl_()?.());
    let frames: Accessor<{
      frameId: string;
      frame: FrameState;
    }[]>;
    {
      let frames_ = createMemo(mapArray(
        () => modeParams.world().entitiesWithComponentType(frameComponentType),
        (entity) => {
          let frame = modeParams.world().getComponent(entity, frameComponentType)?.state;
          if (frame == undefined) {
            return undefined;
          }
          return {
            frameId: entity,
            frame,
          };
        },
      ));
      frames = createMemo(() => frames_().flatMap((x) => opToArr(x)));
    }
    let frameIdToFrameMap = createMemo(() => {
      let result = new Map<string,FrameState>();
      for (let frame of frames()) {
        result.set(frame.frameId, frame.frame);
      }
      return result;
    });
    const previewFps = 10;
    const previewFrameDelay = 1000 / previewFps;
    const previewScale = 3;
    let previewCanvas = createMemo(() => {
      if (state.selectedFramesById.length == 0) {
        return undefined;
      }
      let frameIdToFrameMap2 = frameIdToFrameMap();
      let selectedFrames = state.selectedFramesById.flatMap((frameId) => opToArr(frameIdToFrameMap2.get(frameId)));
      if (selectedFrames.length == 0) {
        return undefined;
      }
      let width = 0;
      let height = 0;
      for (let frame of selectedFrames) {
        width = Math.max(width, frame.size.x);
        height = Math.max(height, frame.size.y);
      }
      let canvas = document.createElement("canvas");
      canvas.width = width * previewScale;
      canvas.height = height * previewScale;
      let ctx = canvas.getContext("2d");
      if (ctx == null) {
        return;
      }
      let scopeDone = false;
      onCleanup(() => {
        scopeDone = true;
      });
      let atFrameIdx = 0;
      let atT = 0;
      let animate = (t: number) => {
        if (scopeDone) {
          return;
        }
        while (atT < t) {
          let frame = selectedFrames[atFrameIdx];
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
          while (atFrameIdx >= selectedFrames.length) {
            atFrameIdx -= selectedFrames.length;
          }
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
          pt2.x < 0.0 || pt2.y < 0.0 ||
          pt2.x > frame.frame.size.x ||
          pt2.y > frame.frame.size.y
        ) {
          continue;
        }
        return frame;
      }
      return undefined;
    });
    this.overlaySvg = () => (<>
      <Show when={imageUrl()} keyed>
        {(imageUrl2) => (
          <image
            href={imageUrl2}
            style="image-rendering: pixelated;"
          />
        )}
      </Show>
      <For each={frames()}>
        {(frame) => {
          let isHighlighted = createMemo(() => selectableFrameUnderMouse()?.frameId == frame.frameId);
          let selectedIndex = createMemo(() => selectedFramesByIdTIndexMap().get(frame.frameId));
          let isSelected = createMemo(() => selectedIndex() != undefined);
          return (<>
            <rect
              x={frame.frame.pos.x}
              y={frame.frame.pos.y}
              width={frame.frame.size.x}
              height={frame.frame.size.y}
              stroke="black"
              stroke-width={2}
              vector-effect="non-scaling-stroke"
              fill={
                isSelected() ?
                  "green" :
                  isHighlighted() ?
                    "blue" :
                    "none"
              }
              opacity={
                (isSelected() || isHighlighted()) ?
                  0.5 :
                  1.0
              }
            />
            <Show when={(() => {
              let selectedIndex2 = selectedIndex();
              if (selectedIndex2 == undefined) {
                return undefined;
              } else {
                return { value: selectedIndex2, };
              }
            })()}>
              {(selectedIndex) => (
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
                  {selectedIndex().value + 1}
                </text>
              )}
            </Show>
          </>);
        }}
      </For>
    </>);
    this.instructions = () => (<>
      Select Frames for Animation<br/>
      <button
        class="btn btn-primary btn-sm"
        onClick={() => {
          onSelectionDone(state.selectedFramesById);
        }}
      >
        Finish
      </button>
    </>);
    this.overlayHtmlUi = () => (
      <Show when={previewCanvas()}>
        {(previewCanvas) => (
          <div
            style={{
              "position": "absolute",
              "right": "0",
              "top": "0",
              "border": "1px solid black",
            }}
          >
            {previewCanvas()}
          </div>
        )}
      </Show>
    );
    this.click = () => {
      let frameId = selectableFrameUnderMouse()?.frameId;
      if (frameId == undefined) {
        return;
      }
      let has = selectedFramesByIdTIndexMap().has(frameId);
      if (has) {
        setState(
          "selectedFramesById",
          (frameIds) =>
            frameIds.filter((frameId2) => frameId2 !== frameId)
        );
      } else {
        setState(
          "selectedFramesById",
          (frameIds) => [
            ...frameIds,
            frameId,
          ]
        );
      }
    };
  }
}
