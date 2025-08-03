import { Accessor, createComputed, createMemo, on } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { ReactiveSet } from "@solid-primitives/set";
import { opToArr } from "../../kitty-demo/util";
import { NoTrack } from "../../util";
import { Complex, Transform2D, Vec2 } from "../../lib";
import { createStore } from "solid-js/store";

export class IdleMode implements Mode {
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
    this.highlightedObjectsById = createMemo(() => opToArr(nodeUnderMouseById()));
    this.selectedObjectsById = selectedNodesById;
    this.disablePan = createMemo(() => state.dragging != undefined);
  }
}
