import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { ChooseFramesMode } from "./ChooseFramesMode";

export class NewAnimationMode implements Mode {
    constructor(modeParams: ModeParams) {
        let innerMode = new ChooseFramesMode(modeParams);
        
    }
}
