import { createMemo } from "solid-js";
import { Mode } from "../Mode";
import { ModeParams } from "../ModeParams";
import { textureAtlasComponentType } from "../../components/TextureAtlasComponent";

export class ChooseFramesMode implements Mode {
  constructor(modeParams: ModeParams) {
    let textureAtlas = createMemo(() => {
      let world = modeParams.world();
      let textureAtlasIds = world.entitiesWithComponentType(textureAtlasComponentType);
      if (textureAtlasIds.length != 1) {
        return undefined;
      }
      let textureAtlasId = textureAtlasIds[0];
      return world.getComponent(textureAtlasId, textureAtlasComponentType)?.state;
    });
    let imageFilename = createMemo(() => {
      let textureAtlas2 = textureAtlas();
      if (textureAtlas2 == undefined) {
        return undefined;
      }
      return textureAtlas2.imageRef;
    });
  }
}
