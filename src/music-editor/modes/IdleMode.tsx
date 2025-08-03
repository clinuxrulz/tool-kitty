import { Accessor, Component, createComputed, createMemo, on, Show } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { ReactiveSet } from "@solid-primitives/set";
import { opToArr } from "../../kitty-demo/util";
import { NoTrack } from "../../util";
import { Complex, Transform2D, Vec2 } from "../../lib";
import { createStore } from "solid-js/store";

export class IdleMode implements Mode {
  overlaySvg: Component;
  click: () => void;
  dragStart: () => void;
  dragEnd: () => void;
  highlightedObjectsById: Accessor<string[]>;
  selectedObjectsById: Accessor<string[]>;
  disablePan: Accessor<boolean>;

  constructor(modeParams: ModeParams) {
    let [ state, setState, ] = createStore<{
      dragging: NoTrack<{
        nodeId: string,
        pickupOffset: Vec2,
      }> | undefined,
    }>({
      dragging: undefined,
    });
    let selectedNodesByIdSet = new ReactiveSet<string>();
    let selectedNodesById = createMemo(() => Array.from(selectedNodesByIdSet));
    let nodeUnderMouseById = () => modeParams.pickingSystem.nodeUnderMouseById();
    let pinUnderMouse = () => modeParams.pickingSystem.pinUnderMouse();
    createComputed(() => {
      if (state.dragging == undefined) {
        return;
      }
      let dragging = state.dragging.value;
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return;
      }
      let pt = modeParams.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return;
      }
      let node = modeParams.nodesSystem.lookupNodeById(dragging.nodeId);
      if (node == undefined) {
        return;
      }
      node.setSpace(
        Transform2D.create(
          pt.sub(dragging.pickupOffset),
          Complex.rot0,
        )
      );
    });
    this.overlaySvg = () => (
      <Show when={pinUnderMouse()}>
        {(pinUnderMouse) => (
          <Show when={nodeUnderMouseById()} keyed>
            {(nodeId) => (
              <Show when={modeParams.nodesSystem.lookupNodeById(nodeId)} keyed>
                {(node) => {
                  let pt = createMemo(() => {
                    let pin = pinUnderMouse();
                    let pos: Vec2;
                    if (pin.type == "Input") {
                      let pos2 = node.inputPinPositionMap()?.get(pin.name);
                      if (pos2 == undefined) {
                        return undefined;
                      }
                      pos = pos2;
                    } else if (pin.type == "Output") {
                      let pos2 = node.outputPinPositionMap()?.get(pin.name);
                      if (pos2 == undefined) {
                        return undefined;
                      }
                      pos = pos2;
                    } else {
                      let x: never = pin.type;
                      throw new Error(`Unreachable: ${x}`);
                    }
                    return node.space().pointFromSpace(pos);
                  });
                  return (
                    <Show when={pt()}>
                      {(pt) => (
                        <circle
                          cx={pt().x}
                          cy={pt().y}
                          r="10"
                          fill="yellow"
                        />
                      )}
                    </Show>
                  );
                }}
              </Show>
            )}
          </Show>
        )}
      </Show>
    );
    this.click = () => {
      let nodeId = nodeUnderMouseById();
      selectedNodesByIdSet.clear();
      if (nodeId != undefined) {
        selectedNodesByIdSet.add(nodeId);
      }
    };
    this.dragStart = () => {
      let mousePos = modeParams.mousePos();
      if (mousePos == undefined) {
        return;
      }
      let pt = modeParams.screenPtToWorldPt(mousePos);
      if (pt == undefined) {
        return;
      }
      let nodeId = nodeUnderMouseById();
      if (nodeId == undefined) {
        return;
      }
      if (!selectedNodesByIdSet.has(nodeId)) {
        return;
      }
      let node = modeParams.nodesSystem.lookupNodeById(nodeId);
      if (node == undefined) {
        return;
      }
      let pickupOffset = node.space().pointToSpace(pt);
      setState(
        "dragging",
        new NoTrack({
          nodeId,
          pickupOffset,
        }),
      );
    };
    this.dragEnd = () => {
      setState("dragging", undefined);
    };
    const EMPTY_ARRAY: string[] = [];
    this.highlightedObjectsById = createMemo(() => {
      if (pinUnderMouse() != undefined) {
        return EMPTY_ARRAY;
      }
      return opToArr(nodeUnderMouseById());
    });
    this.selectedObjectsById = selectedNodesById;
    this.disablePan = createMemo(() => state.dragging != undefined);
  }
}
