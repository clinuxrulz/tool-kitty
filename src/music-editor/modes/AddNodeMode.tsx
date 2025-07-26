import { Accessor, Component, createMemo } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";

export class AddNodeMode implements Mode {
  sideForm: Accessor<Component | undefined>;

  constructor(modeParams: ModeParams) {
    this.sideForm = createMemo(() => () => (
      undefined
    ));
  }
}

