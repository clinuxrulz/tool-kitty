import { Accessor, Component } from "solid-js";

export interface Mode {
  instructions?: Component;
  overlaySvg?: Component;
  overlayHtmlUi?: Component;
  sideForm?: Accessor<Component | undefined>;
  click?: () => void;
  highlightedObjectsById?: Accessor<string[]>;
  selectedObjectsById?: Accessor<string[]>;
}
