import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsObject, tsString, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  mimeType: tsString(),
  base64Data: tsString(),
  out: tsArray(pinTypeSchema),
});

export type TextureState = TypeSchemaType<typeof typeSchema>;

export const textureComponentType = new EcsComponentType<TextureState>({
  typeName: "Texture",
  typeSchema,
});
