import { Accessor, Component, createMemo, For, Show } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { opToArr } from "../../../kitty-demo/util";
import { ReactiveSet } from "@solid-primitives/set";
import { EditAnimationMode } from "./EditAnimationMode";

export class IdleMode implements Mode {
  overlayHtmlUi: Component;
  click: () => void;
  highlightedObjectsById: Accessor<string[]>;
  selectedObjectsById: Accessor<string[]>;

  constructor(modeParams: ModeParams) {
    let idToObjectMap = createMemo(() => {
      let result = new Map<string,ReturnType<typeof modeParams.animationLayout>[number]>();
      for (let entry of modeParams.animationLayout()) {
        result.set(entry.entity, entry);
      }
      return result;
    });
    let selectedObjectByIdSet = new ReactiveSet<string>();
    let selectedObjectsById = createMemo(() => Array.from(selectedObjectByIdSet));
    let selectableObjectUnderMouse = createMemo(() => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return undefined;
      }
      let pt = modeParams.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return undefined;
      }
      for (let animation of modeParams.animationLayout()) {
        let pt2 = pt.sub(animation.pos);
        if (
          pt2.x < 0.0 ||
          pt2.y < 0.0 ||
          pt2.x > animation.size().x ||
          pt2.y > animation.size().y
        ) {
          continue;
        }
        return animation;
      }
      return undefined;
    });
    this.overlayHtmlUi = () => (
      <For each={selectedObjectsById()}>
        {(objectId) => {
          let object = createMemo(() => idToObjectMap().get(objectId));
          return (
            <Show when={object()}>
              {(object) => {
                let pt = createMemo(() => modeParams.worldPtToScreenPt(object().pos));
                return (
                  <Show when={pt()}>
                    {(pt) => (
                      <div
                        style={{
                          "position": "absolute",
                          "left": `${pt().x}px`,
                          "top": `${pt().y}px`,
                          "transform": "translate(0,-100%)",
                        }}
                      >
                        <button
                          class="btn btn-xs btn-primary"
                          onClick={() => {
                            modeParams.setMode(() => new EditAnimationMode({
                              modeParams,
                              animationId: objectId,
                            }));
                          }}
                        >
                          Edit
                        </button>
                        <button
                          class="btn btn-xs btn-secondary"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this animation?")) {
                              modeParams.world().destroyEntity(objectId);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </Show>
                );
              }}
            </Show>
          );
        }}
      </For>
    );
    this.click = () => {
      let object = selectableObjectUnderMouse();
      if (object != undefined && !selectedObjectByIdSet.has(object.entity)) {
        selectedObjectByIdSet.clear();
        selectedObjectByIdSet.add(object.entity);
      } else {
        selectedObjectByIdSet.clear();
      }
    };
    this.highlightedObjectsById = createMemo(() => opToArr(selectableObjectUnderMouse()?.entity));
    this.selectedObjectsById = selectedObjectsById;
  }
}
