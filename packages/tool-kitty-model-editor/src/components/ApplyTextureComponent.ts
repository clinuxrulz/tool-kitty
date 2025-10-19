import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  texture: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type ApplyTextureState = TypeSchemaType<typeof typeSchema>;

export const applyTextureComponentType = new EcsComponentType<ApplyTextureState>({
  typeName: "ApplyTexture",
  typeSchema,
});
