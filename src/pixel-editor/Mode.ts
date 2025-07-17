import { Component } from "solid-js";

export interface Mode {
  instructions?: Component;
  overlaySvgUI?: Component;
  dragStart?: () => void;
  dragEnd?: () => void;
  click?: () => void;
  disableOneFingerPan?: () => boolean;
  done?: () => void;
}
