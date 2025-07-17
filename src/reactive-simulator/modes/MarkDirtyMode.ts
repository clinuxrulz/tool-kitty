import { Component } from "solid-js";
import { Mode } from "../Mode";
import { Node } from "../Node";
import { ModeParams } from "../ModeParams";

export class MarkDirtyMode implements Mode {
  instructions: Component;
  click: () => void;

  constructor(modeParams: ModeParams) {
    let selectableNodeUnderMouse = modeParams.pickingSystem.nodeUnderMouse;
    //
    let toggleDirty = (node: Node) => {
      if (node.state.flag == "Dirty") {
        node.setState("flag", "Unknown");
      } else {
        node.setState("flag", "Dirty");
      }
    };
    //
    this.instructions = () => {
      return "Click nodes to toggle their dirtyness. Press escape when done.";
    };
    this.click = () => {
      let node = selectableNodeUnderMouse();
      if (node != undefined) {
        toggleDirty(node);
      }
    };
  }
}
