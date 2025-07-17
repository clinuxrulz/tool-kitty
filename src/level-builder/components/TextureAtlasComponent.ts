import { EcsComponentType } from "../../ecs/EcsComponent";
import { tsObject, tsString, TypeSchemaType } from "../../TypeSchema";

const typeSchema = tsObject({
  imageRef: tsString(), // path to image in vfs
  // frames are stored via children of entity
});

export type TextureAtlasState = TypeSchemaType<typeof typeSchema>;

export const textureAtlasComponentType =
  new EcsComponentType<TextureAtlasState>({
    typeName: "TextureAtlas",
    typeSchema,
  });
