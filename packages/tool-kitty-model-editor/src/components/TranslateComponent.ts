import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  offset: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type TranslateState = TypeSchemaType<typeof typeSchema>;

export const translateComponentType = new EcsComponentType<TranslateState>({
  typeName: "Translate",
  typeSchema,
});
