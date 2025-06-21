import { Component } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { ChooseFramesMode } from "./ChooseFramesMode";

export class NewAnimationMode implements Mode {
    instructions: Component;
    overlaySvg: Component;
    overlayHtmlUi: Component;
    click: () => void;

    constructor(modeParams: ModeParams) {
        let innerMode = new ChooseFramesMode({
            modeParams,
            initFramesById: [],
            onSelectionDone: (framesById) => {},
        });
        this.instructions = innerMode.instructions;
        this.overlaySvg = innerMode.overlaySvg;
        this.overlayHtmlUi = innerMode.overlayHtmlUi;
        this.click = innerMode.click;
    }
}
