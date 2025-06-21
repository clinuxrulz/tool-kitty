import { Component } from "solid-js";

export interface Mode {
  instructions?: Component;
  overlaySvg?: Component;
  overlayHtmlUi?: Component;
  click?: () => void;
}