import { EcsComponentType } from "../ecs/EcsComponent";
import { tsObject, tsString, TypeSchemaType } from "../TypeSchema";

const typeSchema = tsObject({
  textureAtlasFilename: tsString(),
  frameName: tsString(),
});

export type SpriteState = TypeSchemaType<typeof typeSchema>;

export const spriteComponentType = new EcsComponentType<SpriteState>({
  typeName: "Sprite",
  typeSchema,
});
