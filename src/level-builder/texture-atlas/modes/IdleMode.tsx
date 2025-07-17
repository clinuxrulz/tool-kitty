import { Accessor, Component, createMemo, For, Show } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { opToArr } from "../../../kitty-demo/util";
import { createStore } from "solid-js/store";
import { frameComponentType } from "../../components/FrameComponent";
import { ResizeHelper } from "./ResizeHelper";
import { Vec2 } from "../../../math/Vec2";
import { EditDataMode } from "./EditDataMode";

export class IdleMode implements Mode {
  overlaySvgUI: Component;
  overlayHtmlUI: Component;
  highlightedEntities: Accessor<string[]>;
  selectedEntities: Accessor<string[]>;
  dragStart: () => void;
  dragEnd: () => void;
  click: () => void;
  disableOneFingerPan: Accessor<boolean>;

  constructor(params: {
    modeParams: ModeParams;
    initSelectedEntities?: string[];
  }) {
    let modeParams = params.modeParams;
    let [state, setState] = createStore<{
      selectedEntities: string[];
    }>({
      selectedEntities: params.initSelectedEntities ?? [],
    });
    //
    let entityUnderMouse = modeParams.pickingSystem.mkEntityUnderMouse();
    //
    let singleSelectedEntity = createMemo(() => {
      if (state.selectedEntities.length != 1) {
        return undefined;
      }
      return state.selectedEntities[0];
    });
    let resizeHelper = createMemo(() => {
      let entity = singleSelectedEntity();
      if (entity == undefined) {
        return undefined;
      }
      let world = modeParams.world();
      let frame = world.getComponent(entity, frameComponentType);
      if (frame == undefined) {
        return undefined;
      }
      return new ResizeHelper({
        mousePos: modeParams.mousePos,
        screenPtToWorldPt: modeParams.screenPtToWorldPt,
        worldPtToScreenPt: modeParams.worldPtToScreenPt,
        rect: {
          pos: () => {
            return (
              world.getComponent(entity, frameComponentType)?.state?.pos ??
              frame.state.pos
            );
          },
          size: () => {
            return (
              world.getComponent(entity, frameComponentType)?.state.size ??
              frame.state.size
            );
          },
          setPos: (x) =>
            frame.setState(
              "pos",
              Vec2.create(Math.round(x.x), Math.round(x.y)),
            ),
          setSize: (x) =>
            frame.setState(
              "size",
              Vec2.create(Math.round(x.x), Math.round(x.y)),
            ),
        },
      });
    });
    //
    this.overlaySvgUI = () => <>{resizeHelper()?.overlaySvgUI?.({})}</>;
    this.overlayHtmlUI = () => (
      <For each={state.selectedEntities}>
        {(entity) => {
          let frame = createMemo(() =>
            modeParams.world().getComponent(entity, frameComponentType),
          );
          return (
            <Show when={frame()}>
              {(frame2) => {
                let pt = createMemo(() =>
                  modeParams.worldPtToScreenPt(frame2().state.pos),
                );
                return (
                  <Show when={pt()}>
                    {(pt2) => (
                      <button
                        class="btn"
                        style={{
                          position: "absolute",
                          left: `${pt2().x}px`,
                          top: `${pt2().y}px`,
                          transform: "translate(20px, -100%)",
                          "pointer-events": "auto",
                        }}
                        onClick={() => {
                          let selectedEntities = state.selectedEntities;
                          let frame3 = frame2();
                          modeParams.setMode(
                            () =>
                              new EditDataMode({
                                modeParams: {
                                  ...modeParams,
                                  onDone: () => {
                                    modeParams.setMode(
                                      () =>
                                        new IdleMode({
                                          modeParams,
                                          initSelectedEntities:
                                            selectedEntities,
                                        }),
                                    );
                                  },
                                },
                                frameComponent: frame3,
                              }),
                          );
                        }}
                      >
                        Edit Data...
                      </button>
                    )}
                  </Show>
                );
              }}
            </Show>
          );
        }}
      </For>
    );
    this.highlightedEntities = createMemo(() => opToArr(entityUnderMouse()));
    this.selectedEntities = () => state.selectedEntities;
    this.dragStart = () => {
      return resizeHelper()?.dragStart?.();
    };
    this.dragEnd = () => {
      return resizeHelper()?.dragEnd?.();
    };
    this.click = () => {
      let entity = entityUnderMouse();
      setState("selectedEntities", opToArr(entity));
    };
    this.disableOneFingerPan = createMemo(() => {
      return resizeHelper()?.disableOneFingerPan?.() ?? false;
    });
  }
}
