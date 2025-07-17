import { Component, untrack } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { ChooseFramesMode } from "./ChooseFramesMode";
import { animationComponentType } from "../../components/AnimationComponent";

export class EditAnimationMode implements Mode {
  instructions?: Component;
  overlaySvg?: Component;
  overlayHtmlUi?: Component;
  click?: () => void;

  constructor(params: {
    modeParams: ModeParams,
    animationId: string,
  }) {
    let { modeParams, animationId, } = params;
    let animation =  untrack(() => modeParams.animationLayout().find(({ entity }) => entity == animationId));
    if (animation == undefined) {
      modeParams.onDone();
      return;
    }
    let innerMode = new ChooseFramesMode({
      modeParams,
      initFramesById: animation.animation.frameIds,
      initAnimationName: animation.animation.name,
      onSelectionDone: ({ animationName, framesById, }) => {
        let world = modeParams.world();
        let animationComponent = world.getComponent(animationId, animationComponentType);
        if (animationComponent == undefined) {
          modeParams.onDone();
          return;
        }
        animationComponent.setState("name", animationName);
        animationComponent.setState("frameIds", framesById);
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
