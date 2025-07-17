import { Accessor, Component } from "solid-js";
import { Node } from "./Node";

export interface Mode {
  instructions?: Component;
  highlightNodes?: Accessor<Node[]>;
  selectedNodes?: Accessor<Node[]>;
  click?: () => void;
}
