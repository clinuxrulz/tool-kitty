import { createStore } from "solid-js/store";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { Accessor, Component, createMemo } from "solid-js";
import { Node } from "../Node";
import { opToArr } from "../../kitty-demo/util";

export class AddLinkMode implements Mode {
  instructions: Component;
  highlightNodes: Accessor<Node[]>;
  selectedNodes: Accessor<Node[]>;
  click: () => void;

  constructor(params: { modeParams: ModeParams; type: "Single" | "Double" }) {
    let modeParams = params.modeParams;
    let type = () => params.type;
    let [state, setState] = createStore<{
      sourceNode: Node | undefined;
    }>({
      sourceNode: undefined,
    });
    let selectableNodeUnderMouse = modeParams.pickingSystem.nodeUnderMouse;
    //
    this.instructions = () => {
      return (
        (() => {
          if (state.sourceNode == undefined) {
            return "Select source node.";
          } else {
            return "Select target node.";
          }
        })() +
        " " +
        "(Press escape when you are done.)"
      );
    };
    this.highlightNodes = createMemo(() => opToArr(selectableNodeUnderMouse()));
    this.selectedNodes = createMemo(() => opToArr(state.sourceNode));
    this.click = () => {
      if (state.sourceNode == undefined) {
        let node = selectableNodeUnderMouse();
        if (node != undefined) {
          setState("sourceNode", node);
        }
        return;
      }
      let node = selectableNodeUnderMouse();
      if (node != undefined) {
        if (type() == "Double") {
          state.sourceNode.setState("sinks", [
            ...state.sourceNode.state.sinks,
            node,
          ]);
        }
        node.setState("sources", [...node.state.sources, state.sourceNode]);
        setState("sourceNode", undefined);
      }
    };
  }
}
