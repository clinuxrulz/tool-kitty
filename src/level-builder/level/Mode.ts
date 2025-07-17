import { Accessor, Component } from "solid-js";

export interface Mode {
  instructions?: Component;
  overlaySvgUI?: Component;
  overlayHtmlUI?: Component;
  highlightedEntities?: Accessor<string[]>;
  selectedEntities?: Accessor<string[]>;
  dragStart?: () => void;
  dragEnd?: () => void;
  click?: () => void;
  disableOneFingerPan?: Accessor<boolean>;
}
