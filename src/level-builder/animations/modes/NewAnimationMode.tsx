import { Component } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { ChooseFramesMode } from "./ChooseFramesMode";
import { animationComponentType } from "../../components/AnimationComponent";

export class NewAnimationMode implements Mode {
  instructions: Component;
  overlaySvg: Component;
  overlayHtmlUi: Component;
  click: () => void;

  constructor(modeParams: ModeParams) {
    let innerMode = new ChooseFramesMode({
      modeParams,
      initFramesById: [],
      initAnimationName: "Untitled",
      onSelectionDone: ({ animationName, framesById, }) => {
        let world = modeParams.world();
        world.createEntity([
          animationComponentType.create({
            name: animationName,
            frameIds: framesById,
          }),
        ]);
        modeParams.onDone();
      },
      onCancel: () => {
        modeParams.onDone();
      },
    });
    this.instructions = innerMode.instructions;
    this.overlaySvg = innerMode.overlaySvg;
    this.overlayHtmlUi = innerMode.overlayHtmlUi;
    this.click = innerMode.click;
  }
}
