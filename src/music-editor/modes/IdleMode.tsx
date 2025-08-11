import { Accessor, Component, createComputed, createEffect, createMemo, on, Show } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { ReactiveSet } from "@solid-primitives/set";
import { opToArr } from "../../kitty-demo/util";
import { NoTrack } from "../../util";
import { Complex, Transform2D, Vec2 } from "../../lib";
import { createStore } from "solid-js/store";
import { AddEdgeMode } from "./AddEdgeMode";

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
    createEffect(() => {
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
          <Show when={modeParams.nodesSystem.lookupNodeById(pinUnderMouse().nodeId)} keyed>
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
                  return undefined;
                }
                return node.space().pointFromSpace(pos);
              });
              return (
                <Show when={pt()}>
                  {(pt) => (
                    <circle
                      cx={pt().x}
                      cy={-pt().y}
                      r={5.0 / modeParams.scale()}
                      fill="blue"
                      pointer-events="none"
                    />
                  )}
                </Show>
              );
            }}
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
      // trigger add edge mode if its over a pin
      {
        let pin = pinUnderMouse();
        if (pin != undefined && pin.type == "Output") {
          let pin2: { type: "Output", name: string, } = {
            type: "Output",
            name: pin.name,
          };
          modeParams.setMode(() =>
            new AddEdgeMode({
              modeParams,
              fromNodeId: pin.nodeId,
              fromPin: pin2,
            })
          );
          return;
        }
      }
      //
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
    this.disablePan = createMemo(() =>
      pinUnderMouse() != undefined ||
      state.dragging != undefined
    );
  }
}
